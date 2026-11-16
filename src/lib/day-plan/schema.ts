import { z } from "zod";
import { eventTime } from "@/lib/attendee/schedule";
import type { DemoData } from "@/lib/event/types";

export const TBA = "Time to be announced";
export const PLAN_KINDS = ["favourite_artist", "meeting", "venue_wayfinding", "break"] as const;

/** What the browser sends: only ids and the local meeting, never free-form facts. */
export const dayPlanInput = z.object({
  savedArtistIds: z.array(z.string().max(80)).max(50),
  meeting: z.object({ pointId: z.string().max(80), at: z.string().max(40) }).nullable(),
});
export type DayPlanInput = z.infer<typeof dayPlanInput>;

export const dayPlanSchema = z.object({
  summary: z.string().min(1).max(400),
  items: z
    .array(
      z.object({
        kind: z.enum(PLAN_KINDS),
        title: z.string().min(1).max(120),
        time: z.string().min(1).max(40),
        place: z.string().max(120).nullable(),
        detail: z.string().max(300),
      }),
    )
    .min(1)
    .max(12),
  note: z.string().min(1).max(400),
});
export type DayPlan = z.infer<typeof dayPlanSchema>;

/** Strict JSON schema mirrored from dayPlanSchema for the model's structured output. */
export const dayPlanJsonSchema = {
  type: "object",
  additionalProperties: false,
  required: ["summary", "items", "note"],
  properties: {
    summary: { type: "string" },
    note: { type: "string" },
    items: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["kind", "title", "time", "place", "detail"],
        properties: {
          kind: { type: "string", enum: [...PLAN_KINDS] },
          title: { type: "string" },
          time: { type: "string" },
          place: { type: ["string", "null"] },
          detail: { type: "string" },
        },
      },
    },
  },
} as const;

/** Verified facts the model may use, built from the event data on the server. */
export function buildPlanFacts(data: DemoData, input: DayPlanInput) {
  const placeName = (id: string | null | undefined) =>
    [...data.stages, ...data.points].find((p) => p.id === id)?.name ?? null;
  const artists = data.festival.artists
    .filter((a) => input.savedArtistIds.includes(a.id))
    .map((a) => ({ name: a.name, stage: placeName(a.stageId), time: TBA }));
  const meetingPlace = input.meeting ? placeName(input.meeting.pointId) : null;
  const meeting =
    input.meeting &&
    meetingPlace &&
    Number.isFinite(Date.parse(input.meeting.at)) &&
    Date.parse(input.meeting.at) >= +data.event.startAt &&
    Date.parse(input.meeting.at) <= +data.event.endAt
      ? { place: meetingPlace, time: `${eventTime(input.meeting.at)} CAT` }
      : null;
  return {
    event: {
      name: `${data.event.name} 2026`,
      venue: `${data.event.venueName}, ${data.event.city}`,
      gatesOpen: `${eventTime(data.event.startAt)} CAT`,
      ends: `${eventTime(data.event.endAt)} CAT`,
      entry: "18+ with valid ID",
    },
    stages: data.stages.map((s) => s.name),
    setTimesPublished: data.performances.length > 0,
    savedArtists: artists,
    meeting,
  };
}
export type PlanFacts = ReturnType<typeof buildPlanFacts>;

/** Any time the model writes that isn't from the facts becomes "Time to be announced". */
export function enforceKnownTimes(plan: DayPlan, facts: PlanFacts): DayPlan {
  const known = new Set([facts.event.gatesOpen, facts.event.ends]);
  return {
    ...plan,
    items: plan.items.map((item) => {
      if (item.kind === "meeting" && facts.meeting) return { ...item, time: facts.meeting.time };
      if (item.kind === "favourite_artist") return { ...item, time: TBA };
      return known.has(item.time) ? item : { ...item, time: TBA };
    }),
  };
}
