import type { DemoData } from "@/lib/event/types";
import { globalCategory, type Interest } from "./platform-navigation";

export function isPrivateEvent(demo: DemoData): boolean {
  return (demo.event.visibility ?? demo.event.templateConfig?.visibility) === "private_invite";
}

export function matchesEventSearch(demo: DemoData, query: string): boolean {
  return [
    demo.event.name,
    demo.event.venueName,
    demo.event.city,
    demo.event.category,
    demo.festival.organiser,
    ...demo.festival.artists.map((artist) => artist.name),
    ...demo.points.map((point) => point.name),
  ]
    .join(" ")
    .toLocaleLowerCase()
    .includes(query.trim().toLocaleLowerCase());
}

export function prioritiseInterests(
  events: DemoData[],
  interests: readonly Interest[],
): DemoData[] {
  return [...events].sort(
    (a, b) =>
      Number(interests.some((interest) => interest === globalCategory(b.event.category))) -
      Number(interests.some((interest) => interest === globalCategory(a.event.category))),
  );
}
