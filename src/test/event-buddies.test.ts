import { describe, expect, it } from "vitest";
import { getDemoData } from "@/lib/event/demo-data";
import { buildPlaces, clusterMapPlaces, matchesMapSearch, visiblePins } from "@/lib/attendee/map";
import { validateMeeting, toMeeting } from "@/lib/attendee/meeting";
import { parseStoredPreferences, storageKey } from "@/lib/attendee/use-attendee";
import { isServiceWorkerBlocked } from "@/lib/pwa";
import { validateProfile } from "@/components/companion/forms";

const data = getDemoData();
const places = buildPlaces(data);

describe("Sound of Summer verified data", () => {
  it("keeps 41 image-based map points: 38 venue points plus 3 stages", () => {
    expect(data.points).toHaveLength(38);
    expect(data.stages).toHaveLength(3);
    expect(places).toHaveLength(41);
  });
  it("keeps GPS null everywhere", () => {
    for (const item of [data.event, ...data.stages, ...data.points]) {
      expect(item.latitude).toBeNull();
      expect(item.longitude).toBeNull();
    }
  });
  it("has no fabricated set times", () => {
    expect(data.performances).toHaveLength(0);
    expect(data.festival.timetablePublished).toBe(false);
  });
  it("runs Mon 28 Dec 2026, 12:00–23:00 CAT at Tidal Pools & Jetty Beach", () => {
    expect(data.event.startAt.toISOString()).toBe("2026-12-28T10:00:00.000Z");
    expect(data.event.endAt.toISOString()).toBe("2026-12-28T21:00:00.000Z");
    expect(data.event.venueName).toBe("Tidal Pools & Jetty Beach");
    expect(data.event.city).toBe("Langstrand");
  });
  it("lists the 5 announced artists with only Shimza assigned a stage", () => {
    expect(data.festival.artists.map((a) => a.name)).toEqual([
      "Shimza",
      "Timo ODV",
      "Kurt April",
      "Celso Fabbri",
      "Faffa Bruwer",
    ]);
    expect(data.festival.artists.filter((a) => a.stageId)).toHaveLength(1);
  });
});

describe("map search and clustering", () => {
  it("finds toilets by the word bathroom and medics by medical", () => {
    const toilets = places.filter((p) => matchesMapSearch(p, "bathroom", data));
    expect(toilets).toHaveLength(5);
    expect(toilets.every((p) => p.type === "toilet")).toBe(true);
    expect(places.filter((p) => matchesMapSearch(p, "medical", data))).toHaveLength(2);
  });
  it("finds the main stage by artist name", () => {
    expect(places.filter((p) => matchesMapSearch(p, "shimza", data)).map((p) => p.id)).toEqual([
      "sos-main",
    ]);
  });
  it("shows stages, medics and entrances as key places", () => {
    expect(visiblePins(places, "all", "", null, data)).toHaveLength(3 + 2 + 3);
  });
  it("clusters 17 bars at 100% and separates them when zoomed in", () => {
    const bars = places.filter((p) => p.type === "bar");
    expect(bars).toHaveLength(17);
    const zoomedOut = clusterMapPlaces(bars, 1).length;
    const zoomedIn = clusterMapPlaces(bars, 4).length;
    expect(zoomedOut).toBeLessThan(zoomedIn);
    expect(clusterMapPlaces(bars, 1).flatMap((g) => g.ids)).toHaveLength(17);
  });
});

describe("meeting validation", () => {
  const options = {
    start: data.event.startAt,
    end: data.event.endAt,
    placeIds: places.map((p) => p.id),
  };
  it("accepts a time inside event hours", () => {
    expect(validateMeeting({ pointId: "sos-main", at: "2026-12-28T18:30" }, options)).toBeNull();
    expect(toMeeting({ pointId: "sos-main", at: "2026-12-28T18:30" }).at).toBe(
      "2026-12-28T18:30:00+02:00",
    );
  });
  it("rejects times before 12:00 or after 23:00 CAT", () => {
    expect(validateMeeting({ pointId: "sos-main", at: "2026-12-28T11:59" }, options)).toMatch(
      /event hours/,
    );
    expect(validateMeeting({ pointId: "sos-main", at: "2026-12-28T23:01" }, options)).toMatch(
      /event hours/,
    );
  });
  it("rejects unknown places and empty times", () => {
    expect(validateMeeting({ pointId: "nope", at: "2026-12-28T18:00" }, options)).toMatch(/place/);
    expect(validateMeeting({ pointId: "sos-main", at: "" }, options)).toMatch(/date and time/);
  });
});

describe("local preferences", () => {
  it("are scoped to the event id", () => {
    expect(storageKey(data.event.id)).toBe(`event-buddies:${data.event.id}:attendee`);
  });
  it("keep valid saved artists and drop unknown ids", () => {
    const prefs = parseStoredPreferences(
      { savedArtists: ["shimza", "shimza", "fake-artist"], meeting: { pointId: "ghost", at: "x" } },
      data,
    );
    expect(prefs.savedArtists).toEqual(["shimza"]);
    expect(prefs.meeting).toBeNull();
  });
  it("profile usernames need 3–30 letters, numbers or underscores", () => {
    expect(validateProfile("Didi", "di")).not.toBeNull();
    expect(validateProfile("Didi", "didi_26")).toBeNull();
    expect(validateProfile("  ", "didi")).not.toBeNull();
  });
});

describe("service worker guard", () => {
  it("never registers in Lovable preview or iframes", () => {
    expect(
      isServiceWorkerBlocked(
        { hostname: "id-preview--09580238-efa8-44df-91a9-8667122b30e4.lovable.app", search: "" },
        false,
      ),
    ).toBe(true);
    expect(isServiceWorkerBlocked({ hostname: "example.com", search: "" }, true)).toBe(true);
    expect(isServiceWorkerBlocked({ hostname: "example.com", search: "?sw=off" }, false)).toBe(
      true,
    );
  });
  it("allows the published app", () => {
    expect(
      isServiceWorkerBlocked({ hostname: "event-buddies.lovable.app", search: "" }, false),
    ).toBe(false);
  });
});
