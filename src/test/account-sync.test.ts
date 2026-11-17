import { beforeEach, describe, expect, it } from "vitest";
import { getDemoData } from "@/lib/event/demo-data";
import { readSnapshot, replayActions, selectionPatch, validSelection } from "@/lib/account/schema";
import { acknowledge, clearAccountCache, enqueue, queuedActions } from "@/lib/account/outbox";
import { buildPlanFacts, enforceKnownTimes, TBA } from "@/lib/day-plan/schema";
const data = getDemoData();
const empty = { savedArtists: [], meeting: null };
describe("account selections", () => {
  beforeEach(() => localStorage.clear());
  it("queues independent actions, replays set semantics and isolates accounts", () => {
    const a = enqueue("account-a", { artists: [{ id: "shimza", saved: true }] });
    enqueue("account-a", { artists: [{ id: "buddykev", saved: true }] });
    enqueue("account-b", { artists: [{ id: "xduppy", saved: true }] });
    expect(replayActions(empty, [...queuedActions("account-a"), a]).savedArtists).toEqual([
      "shimza",
      "buddykev",
    ]);
    acknowledge("account-a", a.id);
    expect(queuedActions("account-a")).toHaveLength(1);
    clearAccountCache("account-a");
    expect(queuedActions("account-a")).toHaveLength(0);
    expect(queuedActions("account-b")).toHaveLength(1);
  });
  it("emits per-artist deltas and explicit meeting clears", () => {
    expect(
      selectionPatch(
        {
          savedArtists: ["shimza"],
          meeting: { pointId: "sos-main", at: "2026-12-28T17:30:00+02:00" },
        },
        { savedArtists: ["buddykev"], meeting: null },
      ),
    ).toEqual({
      artists: [
        { id: "shimza", saved: false },
        { id: "buddykev", saved: true },
      ],
      meeting: null,
    });
    expect(selectionPatch(empty, empty)).toBeNull();
  });
  it("rejects another identity and invalid event selections", () => {
    expect(() => readSnapshot({ user_id: "other" }, data, "owner")).toThrow();
    expect(validSelection({ savedArtists: ["unknown"], meeting: null }, data)).toBe(false);
    expect(
      validSelection(
        { savedArtists: [], meeting: { pointId: "sos-main", at: "2026-12-28T23:30:00+02:00" } },
        data,
      ),
    ).toBe(false);
  });
  it("uses actual event points and keeps unpublished set times pending", () => {
    const point = data.points[0]!;
    const facts = buildPlanFacts(data, {
      savedArtistIds: ["shimza"],
      meeting: { pointId: point.id, at: "2026-12-28T17:30:00+02:00" },
    });
    expect(facts.meeting?.place).toBe(point.name);
    const plan = enforceKnownTimes(
      {
        summary: "Review",
        note: "Pending timetable",
        items: [
          {
            kind: "favourite_artist",
            title: "Shimza",
            time: "18:00",
            place: null,
            detail: "Saved",
          },
        ],
      },
      facts,
    );
    expect(plan.items[0]?.time).toBe(TBA);
  });
});
