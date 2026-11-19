import { describe, expect, it, vi } from "vitest";
import {
  crewPinChannelTopic,
  crewPinSchema,
  pinRemovedSchema,
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
});
