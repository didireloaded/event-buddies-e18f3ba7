import { describe, expect, it } from "vitest";
import { getDemoData } from "@/lib/event/demo-data";
import { eventFacts, resolveFactIds } from "@/lib/attendee/event-facts";

const data = getDemoData();
describe("attendee assistant facts", () => {
  it("returns source rules without model-written prose", () => {
    expect(resolveFactIds(data, ["rule-0"])[0]?.text).toBe(data.festival.rules[0]);
    expect(resolveFactIds(data, ["transport"])[0]?.text).toBe(data.festival.transport);
  });
  it("rejects unrecognised fact IDs and removes duplicates", () => {
    expect(resolveFactIds(data, ["rule-0", "made-up-weather"])).toEqual([]);
    expect(resolveFactIds(data, ["rule-0", "rule-0"])).toHaveLength(1);
  });
  it("keeps unpublished weather and set times explicitly pending", () => {
    const facts = eventFacts(data);
    expect(facts.find((fact) => fact.id === "weather")?.pending).toBe(true);
    expect(facts.find((fact) => fact.id === "timetable")?.pending).toBe(true);
    expect(new Set(facts.map((fact) => fact.id)).size).toBe(facts.length);
  });
});
