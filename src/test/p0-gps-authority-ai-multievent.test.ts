import { describe, expect, it, vi } from "vitest";
import {
  computeLiveShareDurationMinutes,
  computeLiveShareExpiry,
  startActiveLiveGps,
} from "@/lib/crew/live-gps";
import { dropCrewPin, removeCrewPin, subscribeCrewPins } from "@/lib/crew/pins";
import { resolvePublishedEventOnServer } from "@/lib/event/server-published-event";
import { buildPlanFacts, dayPlanInput, TBA } from "@/lib/day-plan/schema";
import { organiserEventToDemoData } from "@/lib/organiser/event-adapter";
import { eventPhase, formatEventDate, formatEventHours } from "@/lib/attendee/event-clock";
import { eventLifecycle } from "@/lib/attendee/lifecycle";
import { eventFacts } from "@/lib/attendee/event-facts";
import { selectFeaturedParticipants } from "@/lib/intelligence/event-intelligence";
import { computeAffineCalibration, resolveCrewPinMapPosition } from "@/lib/attendee/map-fit";
import { getMenuForBar, SAMPLE_BAR_MENU } from "@/lib/attendee/bar-menu";
import { getDemoData } from "@/lib/event/demo-data";

describe("P0 — Server-authoritative GPS expiration, background pause, server-ack writes & Ghost Mode revocation", () => {
  it("clamps 15m and 60m live share windows to eventEndAt and caps until_end at 12 hours", () => {
    const now = Date.parse("2026-12-28T22:50:00+02:00");
    const endsIn10m = new Date("2026-12-28T23:00:00+02:00");
    expect(computeLiveShareExpiry("15m", endsIn10m, now)).toBe(+endsIn10m);
    expect(computeLiveShareExpiry("60m", endsIn10m, now)).toBe(+endsIn10m);
    expect(computeLiveShareDurationMinutes(+endsIn10m, now)).toBe(10);

    const endsIn24h = new Date(now + 24 * 3600_000);
    expect(computeLiveShareExpiry("until_end", endsIn24h, now)).toBe(now + 12 * 3600_000);

    const endedAlready = new Date(now - 60_000);
    expect(computeLiveShareExpiry("15m", endedAlready, now)).toBe(+endedAlready);
  });

  it("never transmits positions while document.visibilityState is hidden (paused background safety)", () => {
    const holder: { watchSuccess?: (pos: GeolocationPosition) => void } = {};
    const clearWatch = vi.fn();
    const originalGeo = navigator.geolocation;
    const originalVis = Object.getOwnPropertyDescriptor(document, "visibilityState");

    Object.defineProperty(navigator, "geolocation", {
      configurable: true,
      value: {
        watchPosition: (success: (pos: GeolocationPosition) => void) => {
          holder.watchSuccess = success;
          return 77;
        },
        clearWatch,
      },
    });
    Object.defineProperty(document, "visibilityState", {
      configurable: true,
      value: "hidden",
    });

    const positions: unknown[] = [];
    const statuses: string[] = [];
    const onExpired = vi.fn();
    const stop = startActiveLiveGps({
      expiresAt: Date.now() + 15 * 60_000,
      sessionId: "11111111-1111-4111-8111-111111111111",
      onPosition: (pos) => positions.push(pos),
      onStatusChange: (status) => statuses.push(status),
      onExpired,
    });

    // Fire a GPS callback while tab is backgrounded — must NOT transmit!
    holder.watchSuccess?.({
      coords: {
        latitude: -22.82,
        longitude: 14.54,
        accuracy: 10,
        altitude: null,
        altitudeAccuracy: null,
        heading: null,
        speed: null,
        toJSON: () => ({}),
      },
      timestamp: Date.now(),
      toJSON: () => ({}),
    });
    expect(positions).toHaveLength(0);
    expect(statuses).toContain("paused_background");

    // Foreground the tab -> next fix transmits cleanly
    Object.defineProperty(document, "visibilityState", {
      configurable: true,
      value: "visible",
    });
    document.dispatchEvent(new Event("visibilitychange"));
    holder.watchSuccess?.({
      coords: {
        latitude: -22.8201,
        longitude: 14.5401,
        accuracy: 10,
        altitude: null,
        altitudeAccuracy: null,
        heading: null,
        speed: null,
        toJSON: () => ({}),
      },
      timestamp: Date.now(),
      toJSON: () => ({}),
    });
    expect(positions).toHaveLength(1);

    stop();
    expect(clearWatch).toHaveBeenCalledWith(77);

    Object.defineProperty(navigator, "geolocation", { configurable: true, value: originalGeo });
    if (originalVis) Object.defineProperty(document, "visibilityState", originalVis);
    else Object.defineProperty(document, "visibilityState", { configurable: true, value: "visible" });
  });

  it("never fabricates or broadcasts a pin when configured server persistence fails", async () => {
    const sendSpy = vi.fn();
    const mockChannel = {
      on: vi.fn(() => mockChannel),
      subscribe: vi.fn(() => mockChannel),
      send: sendSpy,
    };
    const mockClient = {
      channel: vi.fn(() => mockChannel),
      removeChannel: vi.fn(),
    };
    const unsub = subscribeCrewPins(
      "crew-strict",
      { onUpserted: vi.fn(), onRemoved: vi.fn() },
      { client: mockClient, configured: true },
    );

    const res = await dropCrewPin(
      {
        eventId: "20000000-0000-4000-8000-000000000002",
        crewId: "crew-strict",
        userId: "user-1",
        displayName: "Maya",
        pointId: "sos-main",
        lat: -22.82,
        lng: 14.54,
        durationMinutes: 15,
      },
      {
        configured: true,
        rpc: vi.fn(async () => ({ data: null, error: { message: "database offline" } })),
        invokeEdge: vi.fn(async () => ({ data: null, error: { message: "edge timeout" } })),
      },
    );

    expect(res.ok).toBe(false);
    expect(res.persisted).toBe(false);
    expect(sendSpy).not.toHaveBeenCalled();
    unsub();
  });

  it("passes requested duration to drop_pin RPC and flags legacy 60m server mismatch honestly", async () => {
    const now = Date.now();
    const requested15m = new Date(now + 15 * 60_000).toISOString();
    const rpcSpy = vi.fn(async (_fn: string, args?: Record<string, unknown>) => {
      if (args && "p_duration_minutes" in args) {
        return { data: null, error: { code: "PGRST202", message: "Could not find the function" } };
      }
      return {
        data: {
          id: "pin-legacy",
          eventId: "20000000-0000-4000-8000-000000000002",
          crewId: "crew-legacy",
          userId: "user-1",
          displayName: "Maya",
          pointId: "sos-main",
          x: 41,
          y: 33.7,
          lat: -22.82,
          lng: 14.54,
          expiresAt: new Date(now + 60 * 60_000).toISOString(),
        },
        error: null,
      };
    });

    const res = await dropCrewPin(
      {
        eventId: "20000000-0000-4000-8000-000000000002",
        crewId: "crew-legacy",
        userId: "user-1",
        displayName: "Maya",
        pointId: "sos-main",
        lat: -22.82,
        lng: 14.54,
        durationMinutes: 15,
        expiresAt: requested15m,
      },
      { configured: true, rpc: rpcSpy, invokeEdge: vi.fn() },
    );

    expect(rpcSpy).toHaveBeenCalledTimes(2);
    expect(rpcSpy.mock.calls[0]?.[1]).toMatchObject({
      p_duration_minutes: 15,
      p_expires_at: requested15m,
    });
    expect(res.ok).toBe(true);
    if (res.ok) {
      expect(res.persisted).toBe(true);
      expect(res.expiryEnforcedByServer).toBe(false);
    }
  });

  it("refuses to broadcast Ghost Mode pin:removed when backend revocation fails, and confirms via Edge fallback", async () => {
    const sendSpy = vi.fn();
    const mockChannel = {
      on: vi.fn(() => mockChannel),
      subscribe: vi.fn(() => mockChannel),
      send: sendSpy,
    };
    const mockClient = {
      channel: vi.fn(() => mockChannel),
      removeChannel: vi.fn(),
    };
    const unsub = subscribeCrewPins(
      "crew-ghost",
      { onUpserted: vi.fn(), onRemoved: vi.fn() },
      { client: mockClient, configured: true },
    );

    const failed = await removeCrewPin(
      { crewId: "crew-ghost", userId: "user-1", pointId: "sos-main" },
      {
        configured: true,
        rpc: vi.fn(async () => ({ data: null, error: { message: "connection lost" } })),
        invokeEdge: vi.fn(async () => ({ data: null, error: { message: "503 unavailable" } })),
      },
    );
    expect(failed.ok).toBe(false);
    expect(failed.confirmed).toBe(false);
    expect(sendSpy).not.toHaveBeenCalled();

    const confirmedViaEdge = await removeCrewPin(
      { crewId: "crew-ghost", userId: "user-1", pointId: "sos-main" },
      {
        configured: true,
        rpc: vi.fn(async () => ({ data: null, error: { message: "rpc unavailable" } })),
        invokeEdge: vi.fn(async () => ({ data: { ok: true, confirmed: true }, error: null })),
      },
    );
    expect(confirmedViaEdge).toEqual({ ok: true, confirmed: true });
    expect(sendSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        event: "pin:removed",
        payload: expect.objectContaining({ crewId: "crew-ghost", userId: "user-1" }),
      }),
    );
    unsub();
  });
});

describe("P1 — Server-grounded AI facts, Multi-event independence, Featured authority & Calibrated Map GPS", () => {
  it("resolves published events strictly on the server and ignores client-spoofed AI fields", async () => {
    const defaultRes = await resolvePublishedEventOnServer("20000000-0000-4000-8000-000000000002");
    expect(defaultRes.ok).toBe(true);
    if (defaultRes.ok) expect(defaultRes.source).toBe("builtin");

    const invalidId = await resolvePublishedEventOnServer("spoofed-non-uuid");
    expect(invalidId.ok).toBe(false);

    const publishedId = "30000000-0000-4000-8000-000000000003";
    const mockFetch = vi.fn(async () =>
      new Response(
        JSON.stringify([
          {
            id: publishedId,
            eventType: "conference",
            name: "Windhoek Cloud Summit",
            startDate: "2026-11-28",
            endDate: "2026-11-28",
            venue: "Hilton, Windhoek",
            gatesOpen: "08:30",
            entryRules: "Conference badge required.",
            program: [{ title: "Dr. Selma", place: "Main Hall", time: "09:00", headliner: true }],
            zones: [{ name: "Main Hall", type: "stage", x: 50, y: 40 }],
            sitePlanPath: null,
            publishedAt: "2026-11-19T10:00:00Z",
          },
        ]),
        { status: 200, headers: { "Content-Type": "application/json" } },
      ),
    ) as unknown as typeof fetch;

    const cloudRes = await resolvePublishedEventOnServer(publishedId, {
      fetcher: mockFetch,
      supabaseUrl: "https://example.supabase.co",
      supabaseKey: "anon-key",
    });
    expect(cloudRes.ok).toBe(true);
    if (cloudRes.ok) {
      expect(cloudRes.source).toBe("published_cloud");
      expect(cloudRes.data.event.name).toBe("Windhoek Cloud Summit");
      const planFacts = buildPlanFacts(cloudRes.data, {
        eventId: publishedId,
        savedArtistIds: [cloudRes.data.festival.artists[0]!.id],
        meeting: null,
      });
      expect(planFacts.event.entry).toBe("Conference badge required.");
      expect(planFacts.savedArtists[0]?.time).toBe("09:00 CAT");
    }

    // Unpublished UUID is rejected
    const draftRes = await resolvePublishedEventOnServer("99999999-9999-4999-8999-999999999999", {
      fetcher: mockFetch,
      supabaseUrl: "https://example.supabase.co",
      supabaseKey: "anon-key",
    });
    expect(draftRes.ok).toBe(false);

    // Client cannot inject eventContext into dayPlanInput schema
    const parsedInput = dayPlanInput.parse({
      eventId: publishedId,
      savedArtistIds: ["a1"],
      meeting: null,
      eventContext: { eventName: "SPOOFED FAKE EVENT" },
    });
    expect("eventContext" in parsedInput).toBe(false);
    expect(TBA).toBe("Time to be announced");
  });

  it("never inherits Sound of Summer date or artwork when an organiser event lacks date or site plan", () => {
    const undated = organiserEventToDemoData({
      id: "40000000-0000-4000-8000-000000000004",
      eventType: "conference",
      name: "Namibia Design Expo",
      startDate: null,
      endDate: null,
      venue: "National Theatre, Windhoek",
      gatesOpen: "",
      entryRules: "Registration required.",
      program: [{ title: "Opening Talk", place: "Hall A", time: "10:00" }],
      zones: [],
      sitePlanPath: null,
      sitePlanUrl: null,
      publishedAt: "2026-11-19T09:00:00Z",
    });

    expect(undated.event.dateConfirmed).toBe(false);
    expect(undated.event.gatesConfirmed).toBe(false);
    expect(undated.event.heroImageUrl).toBe("");
    expect(undated.event.heroImageUrl).not.toContain("sound-of-summer");
    expect(undated.event.startAt.toISOString()).not.toContain("2026-12-28");
    expect(undated.festival.relatedEvent.name).toBe("");
    expect(undated.performances).toHaveLength(0);
    expect(formatEventDate(undated.event)).toBe("Date TBC");
    expect(formatEventHours(undated.event)).toBe("Hours TBC");
    expect(eventPhase(undated, Date.now()).label).toBe("Date TBC");
    expect(eventLifecycle(undated, Date.now()).phase).toBe("upcoming");
    expect(eventFacts(undated).find((f) => f.id === "hours")?.status).toBe("pending");
  });

  it("keeps organiser featured/headliner selections strictly authoritative without auto-promoting unfeatured acts", () => {
    const sos = getDemoData();
    const sosFeatured = selectFeaturedParticipants(sos);
    // Sound of Summer explicitly bills only Shimza as Headliner; other stages must not be silently auto-promoted
    expect(sosFeatured.map((a) => a.id)).toEqual(["shimza"]);

    const custom = organiserEventToDemoData({
      id: "50000000-0000-4000-8000-000000000005",
      eventType: "festival",
      name: "Dune Sound",
      startDate: "2026-12-12",
      endDate: "2026-12-12",
      venue: "Walvis Bay",
      gatesOpen: "14:00",
      entryRules: "18+",
      program: [
        { title: "Main Headliner", place: "Stage A", time: "21:00", headliner: true, featured: true },
        { title: "Featured Guest", place: "Stage A", time: "19:30", featured: true },
        { title: "Unfeatured Stage B Act", place: "Stage B", time: "18:00", featured: false },
      ],
      zones: [
        { name: "Stage A", type: "stage", x: 30, y: 40 },
        { name: "Stage B", type: "stage", x: 70, y: 40 },
      ],
      sitePlanPath: null,
      publishedAt: "2026-11-19T09:00:00Z",
    });

    const customFeatured = selectFeaturedParticipants(custom);
    expect(customFeatured.map((a) => a.name)).toEqual(["Main Headliner", "Featured Guest"]);
  });

  it("projects crew live GPS onto map ONLY with verified calibration, and prefers published Cloud bar menus", () => {
    const transform = computeAffineCalibration([
      { x: 0, y: 0, lat: -22.8, lng: 14.5 },
      { x: 100, y: 0, lat: -22.8, lng: 14.6 },
      { x: 0, y: 100, lat: -22.9, lng: 14.5 },
    ])!;
    const places = [{ id: "stage-1", x: 20, y: 30 }];

    // With calibration -> projects real GPS
    expect(
      resolveCrewPinMapPosition({ lat: -22.85, lng: 14.55, pointId: "stage-1" }, places, transform),
    ).toEqual({ x: 50, y: 50, mode: "gps_calibrated", placeId: "stage-1" });

    // Without calibration -> NEVER projects GPS, falls back strictly to landmark
    expect(
      resolveCrewPinMapPosition({ lat: -22.85, lng: 14.55, pointId: "stage-1" }, places, null),
    ).toEqual({ x: 20, y: 30, mode: "landmark", placeId: "stage-1" });

    // Published Cloud bar menu takes precedence over SAMPLE_BAR_MENU
    const publishedMenu = {
      isSample: false,
      paymentNote: "Tap & pay only",
      items: [{ id: "d1", name: "Tafel Lager", category: "Beer" as const, price: "N$ 40" }],
    };
    expect(getMenuForBar("evt-bar-test", "Main Bar", [publishedMenu])).toEqual(publishedMenu);
    expect(getMenuForBar("evt-bar-test", "Main Bar", [])).toEqual(SAMPLE_BAR_MENU);
  });
});
