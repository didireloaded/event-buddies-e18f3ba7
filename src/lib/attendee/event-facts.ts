import type { DemoData } from "@/lib/event/types";
import { eventTime } from "./schedule";

export type FactStatus = "verified" | "pending" | "outdated" | "sample";

export type EventFact = {
  id: string;
  title: string;
  text: string;
  pending: boolean;
  status: FactStatus;
  source: string;
  updatedAt: string;
};

export function eventFacts(data: DemoData): EventFact[] {
  const source = data.festival.organiser || "Organiser";
  const updatedAt = data.festival.sourceCheckedAt || new Date().toISOString().slice(0, 10);
  const hasTimetable = data.performances.length > 0;

  return [
    {
      id: "venue",
      title: "Venue",
      text: `${data.event.name} · ${data.event.venueName}, ${data.event.city}.`,
      pending: false,
      status: "verified",
      source,
      updatedAt,
    },
    {
      id: "hours",
      title: "Event hours",
      text: `${data.event.startAt.toLocaleDateString("en-GB", { timeZone: data.event.timezone })}, ${eventTime(data.event.startAt)}–${eventTime(data.event.endAt)} CAT. ${data.festival.timingNotice}`,
      pending: false,
      status: "verified",
      source,
      updatedAt,
    },
    {
      id: "transport",
      title: "Transport & shuttles",
      text: data.festival.transport,
      pending: true,
      status: "pending",
      source,
      updatedAt,
    },
    ...data.festival.rules.map((text, index) => ({
      id: `rule-${index}`,
      title: "Entry & venue rules",
      text,
      pending: false,
      status: "verified" as const,
      source,
      updatedAt,
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
        status: "pending" as const,
        source,
        updatedAt,
      };
    }),
    {
      id: "timetable",
      title: "Set times",
      text: hasTimetable
        ? `${data.performances.length} scheduled sessions or sets published for ${data.event.name}. Check the Programme tab for times.`
        : "Artist set times have not been published. Check the Lineup for announced artists.",
      pending: !hasTimetable,
      status: hasTimetable ? "verified" : "pending",
      source,
      updatedAt,
    },
    {
      id: "weather",
      title: "Weather & tides",
      text: "Verified weather, sunset and tide information is pending. Bring warm layers for the evening and check beach conditions with the on-site team.",
      pending: true,
      status: "pending",
      source,
      updatedAt,
    },
    {
      id: "navigation",
      title: "Venue navigation",
      text: data.festival.mapNotice,
      pending: !data.festival.mapGeoreferenced,
      status: data.festival.mapGeoreferenced ? "verified" : "pending",
      source,
      updatedAt,
    },
  ];
}

export function resolveFactIds(data: DemoData, ids: string[]): EventFact[] {
  const facts = eventFacts(data);
  if (ids.some((id) => !facts.some((fact) => fact.id === id))) return [];
  return [...new Set(ids)].map((id) => facts.find((fact) => fact.id === id)!);
}

const LOCAL_SEARCH_STOP_WORDS = new Set([
  "can",
  "the",
  "are",
  "for",
  "and",
  "what",
  "where",
  "when",
  "how",
  "does",
  "there",
  "this",
  "that",
  "with",
  "from",
  "bring",
  "have",
  "about",
  "into",
  "event",
]);

/** Deterministic offline keyword match against verified event facts when offline or AI is unavailable. */
export function searchLocalFacts(data: DemoData, question: string): EventFact[] {
  const rawWords = question
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length >= 3);
  const words = rawWords.filter((w) => !LOCAL_SEARCH_STOP_WORDS.has(w));
  const queryWords = words.length > 0 ? words : rawWords;
  if (!queryWords.length) return [];
  const facts = eventFacts(data);
  const scored = facts
    .map((fact) => {
      const hay = `${fact.title} ${fact.text}`.toLowerCase();
      const score = queryWords.reduce((acc, w) => {
        const stem = w.length > 4 && w.endsWith("s") ? w.slice(0, -1) : w;
        if (hay.includes(w)) return acc + 2;
        if (stem !== w && hay.includes(stem)) return acc + 1;
        return acc;
      }, 0);
      return { fact, score };
    })
    .filter((entry) => entry.score > 0)
    .sort((a, b) => b.score - a.score);
  return scored.slice(0, 3).map((entry) => entry.fact);
}
