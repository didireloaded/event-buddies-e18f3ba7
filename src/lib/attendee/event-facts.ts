import type { DemoData } from "@/lib/event/types";
import { eventTime } from "./schedule";

export function eventFacts(data: DemoData) {
  return [
    {
      id: "venue",
      title: "Venue",
      text: `${data.event.name} · ${data.event.venueName}, ${data.event.city}.`,
      pending: false,
    },
    {
      id: "hours",
      title: "Event hours",
      text: `${data.event.startAt.toLocaleDateString("en-GB", { timeZone: data.event.timezone })}, ${eventTime(data.event.startAt)}–${eventTime(data.event.endAt)} CAT. ${data.festival.timingNotice}`,
      pending: false,
    },
    {
      id: "transport",
      title: "Transport & shuttles",
      text: data.festival.transport,
      pending: true,
    },
    ...data.festival.rules.map((text, index) => ({
      id: `rule-${index}`,
      title: "Entry & venue rules",
      text,
      pending: false,
    })),
    ...["first-aid", "toilet", "food", "bar", "entrance"].map((type) => {
      const places = data.points.filter((p) => p.type === type);
      return {
        id: `facility-${type}`,
        title:
          type === "first-aid"
            ? "Medical points"
            : `${type.charAt(0).toUpperCase()}${type.slice(1)} facilities`,
        text: `${places.length} marked on the supplied venue plan: ${places.map((p) => p.name).join(" · ")}. Details and trading hours require organiser confirmation.`,
        pending: true,
      };
    }),
    {
      id: "timetable",
      title: "Set times",
      text: "Artist set times have not been published. Check the Lineup for announced artists.",
      pending: true,
    },
    {
      id: "weather",
      title: "Weather & tides",
      text: "Verified weather, sunset and tide information is pending. Bring warm layers for the evening and check beach conditions with the on-site team.",
      pending: true,
    },
    { id: "navigation", title: "Venue navigation", text: data.festival.mapNotice, pending: true },
  ];
}

export function resolveFactIds(data: DemoData, ids: string[]) {
  const facts = eventFacts(data);
  if (ids.some((id) => !facts.some((fact) => fact.id === id))) return [];
  return [...new Set(ids)].map((id) => facts.find((fact) => fact.id === id)!);
}
