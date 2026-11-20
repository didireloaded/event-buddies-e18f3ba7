import { describe, expect, it } from "vitest";
import { getDemoData } from "@/lib/event/demo-data";
import { isPrivateEvent, matchesEventSearch, prioritiseInterests } from "@/lib/account/discovery";

describe("global discovery", () => {
  it("excludes invite-only visibility including template visibility", () => {
    const data = getDemoData();
    expect(isPrivateEvent(data)).toBe(false);
    expect(
      isPrivateEvent({ ...data, event: { ...data.event, visibility: "private_invite" } }),
    ).toBe(true);
  });
  it("searches announced performers and organisers as well as venues", () => {
    const data = getDemoData();
    const artist = data.festival.artists[0];
    expect(artist).toBeDefined();
    expect(matchesEventSearch(data, artist?.name ?? "missing performer")).toBe(true);
    expect(matchesEventSearch(data, data.festival.organiser)).toBe(true);
    expect(matchesEventSearch(data, "no-such-event-927")).toBe(false);
  });
  it("prioritises matching interests without hiding unmatched events", () => {
    const music = getDemoData();
    const conference = {
      ...music,
      event: { ...music.event, id: "conference-fixture", category: "Conference" },
    };
    expect(
      prioritiseInterests([music, conference], ["Conferences"]).map((data) => data.event.id),
    ).toEqual(["conference-fixture", music.event.id]);
    expect(prioritiseInterests([music, conference], [])).toEqual([music, conference]);
  });
});
