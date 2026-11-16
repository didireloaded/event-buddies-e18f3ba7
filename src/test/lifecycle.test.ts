import { describe, expect, it } from "vitest";
import { getDemoData } from "@/lib/event/demo-data";
import { activeLandmarkPin, eventLifecycle, landmarkPinExpiry } from "@/lib/attendee/lifecycle";

const data = getDemoData();
const end = +data.event.endAt;
const hour = 3600000;

describe("event lifecycle", () => {
  it("keeps departure coordination until the following morning at 10 CAT", () => {
    expect(eventLifecycle(data, end - 1).phase).toBe("live");
    expect(eventLifecycle(data, end).phase).toBe("afterglow");
    const recap = Date.parse("2026-12-29T08:00:00Z");
    expect(eventLifecycle(data, recap - 1).phase).toBe("afterglow");
    expect(eventLifecycle(data, recap).phase).toBe("recap");
  });
  it("advances archive and dormancy on exact boundaries", () => {
    const life = eventLifecycle(data, null);
    expect(life.phase).toBe("upcoming");
    expect(eventLifecycle(data, life.archiveAt - 1).phase).toBe("recap");
    expect(eventLifecycle(data, life.archiveAt).phase).toBe("archive");
    expect(eventLifecycle(data, life.dormantAt - 1).phase).toBe("archive");
    expect(eventLifecycle(data, life.dormantAt).phase).toBe("dormant");
  });
  it("honours later published performance ends", () => {
    const extended = {
      ...data,
      performances: [{ ...data.performances[0]!, scheduledEnd: new Date(end + hour) }],
    };
    expect(eventLifecycle(extended, end).phase).toBe("live");
    expect(eventLifecycle(extended, end + hour).phase).toBe("afterglow");
  });
  it("shows cancellation instead of a celebratory recap", () => {
    const cancelled = { ...data, event: { ...data.event, status: "cancelled" as const } };
    expect(eventLifecycle(cancelled, end + 100 * hour).phase).toBe("cancelled");
    expect(
      activeLandmarkPin(cancelled, { pointId: "stage", expiresAt: end + hour }, end),
    ).toBeNull();
  });
  it("expires local pins at their own limit and caps them at end plus two hours", () => {
    const pin = { pointId: "stage", expiresAt: end + 4 * hour };
    expect(activeLandmarkPin(data, pin, null)).toBeNull();
    expect(activeLandmarkPin(data, pin, end)?.expiresAt).toBe(end + 2 * hour);
    expect(activeLandmarkPin(data, pin, end + 2 * hour)).toBeNull();
    expect(landmarkPinExpiry(data, end + 1.5 * hour)).toBe(end + 2 * hour);
    const early = { ...pin, expiresAt: end };
    expect(activeLandmarkPin(data, early, end - 1)).not.toBeNull();
    expect(activeLandmarkPin(data, early, end)).toBeNull();
  });
});
