import { describe, expect, it, vi } from "vitest";
import {
  broadcastCrewChatMessage,
  broadcastCrewLostAlert,
  crewPinChannelTopic,
  crewPinSchema,
  dropCrewPin,
  pinRemovedSchema,
  removeCrewPin,
  requestOneTimeGeolocation,
  roundGpsCoord,
  roundVenueCoord,
  subscribeCrewPins,
} from "@/lib/crew/pins";

describe("Real-time crew pin pipe (crew:{id}:pins)", () => {
  it("rounds venue coordinates to 1 decimal and GPS coordinates to 4 decimals (~11m)", () => {
    expect(roundVenueCoord(45.678)).toBe(45.7);
    expect(roundVenueCoord(100)).toBe(100);
    expect(roundVenueCoord(-1)).toBeNull();
    expect(roundVenueCoord(105)).toBeNull();

    expect(roundGpsCoord(-22.819876, -90, 90)).toBe(-22.8199);
    expect(roundGpsCoord(14.542345, -180, 180)).toBe(14.5423);
    expect(roundGpsCoord(-95, -90, 90)).toBeNull();
    expect(roundGpsCoord(190, -180, 180)).toBeNull();
  });

  it("formats private realtime channel topics as crew:{id}:pins", () => {
    expect(crewPinChannelTopic("c1111111-1111-4111-8111-111111111111")).toBe(
      "crew:c1111111-1111-4111-8111-111111111111:pins",
    );
  });

  it("reads single-shot navigator.geolocation and rounds coordinates", async () => {
    const originalGeo = navigator.geolocation;
    Object.defineProperty(navigator, "geolocation", {
      configurable: true,
      value: {
        getCurrentPosition: (success: (pos: GeolocationPosition) => void) => {
          success({
            coords: {
              latitude: -22.819876,
              longitude: 14.542345,
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
        },
      },
    });

    const coords = await requestOneTimeGeolocation();
    expect(coords).toEqual({ lat: -22.8199, lng: 14.5423 });

    Object.defineProperty(navigator, "geolocation", {
      configurable: true,
      value: originalGeo,
    });
  });

  it("validates pin:upserted and pin:removed realtime broadcast payloads and delivers them to subscribers", () => {
    const listeners: Record<string, (msg: { payload?: unknown }) => void> = {};
    const mockChannel = {
      on: vi.fn(
        (_type: string, filter: { event: string }, cb: (msg: { payload?: unknown }) => void) => {
          listeners[filter.event] = cb;
          return mockChannel;
        },
      ),
      subscribe: vi.fn(() => mockChannel),
      send: vi.fn(),
    };

    const mockClient = {
      channel: vi.fn(() => mockChannel),
      removeChannel: vi.fn(),
    };

    const upserted: unknown[] = [];
    const removed: unknown[] = [];

    const unsubscribe = subscribeCrewPins(
      "crew-123",
      {
        onUpserted: (pin) => upserted.push(pin),
        onRemoved: (rem) => removed.push(rem),
      },
      { client: mockClient, configured: true },
    );

    expect(mockClient.channel).toHaveBeenCalledWith("crew:crew-123:pins", {
      config: { private: true, broadcast: { self: false } },
    });

    const samplePin = {
      id: "p1",
      eventId: "20000000-0000-4000-8000-000000000002",
      crewId: "crew-123",
      userId: "user-a",
      displayName: "Alex",
      pointId: "stage-main",
      x: 45.7,
      y: 52.3,
      lat: -22.8199,
      lng: 14.5423,
      expiresAt: new Date(Date.now() + 3600000).toISOString(),
    };
    expect(crewPinSchema.safeParse(samplePin).success).toBe(true);
    listeners["pin:upserted"]?.({ payload: samplePin });
    expect(upserted).toHaveLength(1);

    const sampleRemoved = {
      crewId: "crew-123",
      userId: "user-a",
      pointId: "stage-main",
    };
    expect(pinRemovedSchema.safeParse(sampleRemoved).success).toBe(true);
    listeners["pin:removed"]?.({ payload: sampleRemoved });
    expect(removed).toHaveLength(1);

    unsubscribe();
    expect(mockClient.removeChannel).toHaveBeenCalled();
  });

  it("never downgrades a private crew channel to a public channel on CHANNEL_ERROR and ignores events after unsubscribe", () => {
    const listeners: Record<string, (msg: { payload?: unknown }) => void> = {};
    let statusCb: ((status: string) => void) | undefined;
    const mockChannel = {
      on: vi.fn(
        (_type: string, filter: { event: string }, cb: (msg: { payload?: unknown }) => void) => {
          listeners[filter.event] = cb;
          return mockChannel;
        },
      ),
      subscribe: vi.fn((cb?: (status: string) => void) => {
        statusCb = cb;
        return mockChannel;
      }),
      send: vi.fn(),
    };
    const mockClient = {
      channel: vi.fn(() => mockChannel),
      removeChannel: vi.fn(),
    };

    const upserted: unknown[] = [];
    const unsubscribe = subscribeCrewPins(
      "crew-private-only",
      {
        onUpserted: (pin) => upserted.push(pin),
        onRemoved: vi.fn(),
      },
      { client: mockClient, configured: true },
    );

    statusCb?.("CHANNEL_ERROR");
    expect(mockClient.channel).toHaveBeenCalledTimes(1);
    expect(mockClient.channel).toHaveBeenCalledWith("crew:crew-private-only:pins", {
      config: { private: true, broadcast: { self: false } },
    });

    unsubscribe();
    listeners["pin:upserted"]?.({
      payload: {
        id: "late-pin",
        crewId: "crew-private-only",
        userId: "u2",
        displayName: "Late",
        pointId: "stage-main",
        expiresAt: new Date(Date.now() + 60000).toISOString(),
      },
    });
    expect(upserted).toHaveLength(0);
  });

  it("delivers pin drops, Lost Someone alerts, crew chat, and Ghost Mode removal from Phone A to Phone B over the active crew:{id}:pins channel", async () => {
    const listeners: Record<string, (msg: { payload?: unknown }) => void> = {};
    const mockChannel = {
      on: vi.fn(
        (_type: string, filter: { event: string }, cb: (msg: { payload?: unknown }) => void) => {
          listeners[filter.event] = cb;
          return mockChannel;
        },
      ),
      subscribe: vi.fn((cb?: (status: string) => void) => {
        cb?.("SUBSCRIBED");
        return mockChannel;
      }),
      send: vi.fn(
        async (args: { type: "broadcast"; event: string; payload: Record<string, unknown> }) => {
          // Simulate Realtime broker delivering Phone A's broadcast to Phone B's listener
          listeners[args.event]?.({ payload: args.payload });
          return "ok";
        },
      ),
    };

    const mockClient = {
      channel: vi.fn(() => mockChannel),
      removeChannel: vi.fn(),
    };

    const phoneBPins: Record<string, unknown>[] = [];
    const phoneBLostAlerts: Record<string, unknown>[] = [];
    const phoneBChats: Record<string, unknown>[] = [];

    const unsubscribe = subscribeCrewPins(
      "crew-two-phone",
      {
        onUpserted: (pin) => {
          const idx = phoneBPins.findIndex((p) => p["userId"] === pin.userId);
          if (idx >= 0) phoneBPins[idx] = pin;
          else phoneBPins.push(pin);
        },
        onRemoved: (rem) => {
          const idx = phoneBPins.findIndex((p) => p["userId"] === rem.userId);
          if (idx >= 0) phoneBPins.splice(idx, 1);
        },
        onLostAlert: (alert) => phoneBLostAlerts.push(alert),
        onChatMessage: (chat) => phoneBChats.push(chat),
      },
      { client: mockClient, configured: true },
    );

    // 1. Phone A drops a pin at Main Stage with rounded coordinates
    const dropped = await dropCrewPin({
      eventId: "20000000-0000-4000-8000-000000000002",
      crewId: "crew-two-phone",
      userId: "phone-a",
      displayName: "Sam",
      pointId: "stage-main",
      x: 48.24,
      y: 61.88,
      lat: -22.81987,
      lng: 14.54231,
    });
    expect(dropped.ok).toBe(true);
    expect(phoneBPins).toHaveLength(1);
    expect(phoneBPins[0]?.["displayName"]).toBe("Sam");
    expect(phoneBPins[0]?.["x"]).toBe(48.2);
    expect(phoneBPins[0]?.["lat"]).toBe(-22.8199);

    // 2. Phone A taps "Lost someone · Alert crew"
    await broadcastCrewLostAlert({
      id: "alert-1",
      crewId: "crew-two-phone",
      eventId: "20000000-0000-4000-8000-000000000002",
      userId: "phone-a",
      authorName: "Sam",
      pointId: "stage-main",
      placeName: "Main Stage",
      message: "Sam is looking for you near Main Stage.",
      createdAt: new Date().toISOString(),
    });
    expect(phoneBLostAlerts).toHaveLength(1);
    expect(phoneBLostAlerts[0]?.["message"]).toBe("Sam is looking for you near Main Stage.");

    // 3. Phone A sends a real-time crew chat message
    await broadcastCrewChatMessage({
      id: "chat-1",
      eventId: "20000000-0000-4000-8000-000000000002",
      crewId: "crew-two-phone",
      authorId: "phone-a",
      authorName: "Sam",
      kind: "message",
      message: "Meet by the left speaker stack",
      pointId: "stage-main",
      meta: {},
      createdAt: new Date().toISOString(),
    });
    expect(phoneBChats).toHaveLength(1);
    expect(phoneBChats[0]?.["message"]).toBe("Meet by the left speaker stack");

    // 4. Phone A activates Ghost Mode -> pin is removed on Phone B
    await removeCrewPin({
      crewId: "crew-two-phone",
      userId: "phone-a",
      pointId: "stage-main",
    });
    expect(phoneBPins).toHaveLength(0);

    unsubscribe();
  });
});
