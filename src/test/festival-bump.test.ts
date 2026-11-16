import { describe, expect, it } from "vitest";
import { bumpLink, readBump } from "@/lib/attendee/festival-bump";
import { getDemoData } from "@/lib/event/demo-data";
const data = getDemoData();
const plan = {
  version: 1,
  event: data.event.id,
  name: "Maya",
  artists: [data.festival.artists[0]!.id],
  meeting: { pointId: data.stages[0]!.id, at: "2026-12-28T17:30:00+02:00" },
};
describe("Festival Bump import", () => {
  it("creates a shareable Crew fragment that round-trips through validation", () => {
    const url = new URL(
      bumpLink("https://festival.example/app/?preview=1#map", { ...plan, version: 1 }),
    );
    expect(url.pathname).toBe("/app/");
    expect(url.search).toBe("");
    expect(url.hash.startsWith("#crew?plan=")).toBe(true);
    const raw = new URLSearchParams(url.hash.split("?")[1]).get("plan")!;
    expect(readBump(raw, data)).toEqual(plan);
  });
  it("reads a local meeting and favourites", () => {
    expect(readBump(JSON.stringify(plan), data)).toEqual(plan);
  });
  it("rejects another event", () => {
    expect(() => readBump(JSON.stringify({ ...plan, event: "other" }), data)).toThrow();
  });
  it("rejects unknown places and artists", () => {
    expect(() => readBump(JSON.stringify({ ...plan, artists: ["unknown"] }), data)).toThrow();
    expect(() =>
      readBump(JSON.stringify({ ...plan, meeting: { ...plan.meeting, pointId: "unknown" } }), data),
    ).toThrow();
  });
  it("rejects meetings outside event hours", () => {
    expect(() =>
      readBump(
        JSON.stringify({ ...plan, meeting: { ...plan.meeting, at: "2026-12-29T10:00:00+02:00" } }),
        data,
      ),
    ).toThrow();
  });
  it("rejects oversized or malformed codes", () => {
    expect(() => readBump("x".repeat(3001), data)).toThrow();
    expect(() => readBump("not JSON", data)).toThrow();
  });
});
