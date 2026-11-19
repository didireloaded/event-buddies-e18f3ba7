import { z } from "zod";
import { eventTime } from "@/lib/attendee/schedule";
import type { DemoData } from "@/lib/event/types";

export const TBA = "Time to be announced";
export const PLAN_KINDS = ["favourite_artist", "meeting", "venue_wayfinding", "break"] as const;

/**
 * What the browser sends: ONLY the attendee's saved IDs, local meeting, and target eventId.
 * Official event facts are always retrieved and verified on the server — never accepted from the client.
 */
export const dayPlanInput = z.object({
  eventId: z.string().max(80).optional(),
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

/** Verified facts the model may use, built from authoritative event data on the server. */
export function buildPlanFacts(data: DemoData, input: DayPlanInput) {
  const placeName = (id: string | null | undefined) =>
    [...data.stages, ...data.points].find((p) => p.id === id)?.name ?? null;
  const artists = data.festival.artists
    .filter((a) => input.savedArtistIds.includes(a.id))
    .map((a) => {
      const perf = data.performances.find((p) => p.artistId === a.id && p.status !== "cancelled");
      return {
        name: a.name,
        stage: placeName(perf?.stageId ?? a.stageId),
        time: perf ? `${eventTime(perf.scheduledStart)} CAT` : TBA,
      };
    });
  const meetingPlace = input.meeting ? placeName(input.meeting.pointId) : null;
  const meetingInRange =
    data.event.dateConfirmed === false
      ? true
      : input.meeting
        ? Date.parse(input.meeting.at) >= +data.event.startAt &&
          Date.parse(input.meeting.at) <= +data.event.endAt
        : false;
  const meeting =
    input.meeting && meetingPlace && Number.isFinite(Date.parse(input.meeting.at)) && meetingInRange
      ? { place: meetingPlace, time: `${eventTime(input.meeting.at)} CAT` }
      : null;

  const hasConfirmedHours =
    data.event.dateConfirmed !== false && data.event.gatesConfirmed !== false;

  return {
    event: {
      name: data.event.name,
      category: data.event.category,
      organiser: data.festival.organiser,
      sourceCheckedAt: data.festival.sourceCheckedAt,
      venue: `${data.event.venueName}, ${data.event.city}`,
      gatesOpen: hasConfirmedHours ? `${eventTime(data.event.startAt)} CAT` : TBA,
      ends: hasConfirmedHours ? `${eventTime(data.event.endAt)} CAT` : TBA,
      entry: data.festival.rules[0] ?? "Follow organiser entry instructions at the venue gates.",
    },
    stages: data.stages.map((s) => s.name),
    setTimesPublished: data.performances.length > 0,
    savedArtists: artists,
    meeting,
  };
}
export type PlanFacts = ReturnType<typeof buildPlanFacts>;

/** Any time the model writes that isn't from the server-verified facts becomes "Time to be announced". */
export function enforceKnownTimes(plan: DayPlan, facts: PlanFacts): DayPlan {
  const known = new Set<string>([facts.event.gatesOpen, facts.event.ends]);
  const artistTimes = new Map<string, string>();
  for (const a of facts.savedArtists) {
    artistTimes.set(a.name.toLowerCase(), a.time);
    if (a.time !== TBA) known.add(a.time);
  }
  return {
    ...plan,
    items: plan.items.map((item) => {
      if (item.kind === "meeting" && facts.meeting) return { ...item, time: facts.meeting.time };
      if (item.kind === "favourite_artist") {
        if (!facts.setTimesPublished) return { ...item, time: TBA };
        const confirmed = artistTimes.get(item.title.toLowerCase());
        return { ...item, time: confirmed ?? (known.has(item.time) ? item.time : TBA) };
      }
      return known.has(item.time) ? item : { ...item, time: TBA };
    }),
  };
}
