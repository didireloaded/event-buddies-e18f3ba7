import { z } from "zod";
import type { DemoData } from "@/lib/event/types";

export const PROFILE_BADGES = [
  "Amapiano",
  "Afro Tech",
  "House & Techno",
  "Sunset Set",
  "Front Row",
  "Designated Driver",
  "First Timer",
  "Photographer",
] as const;

const payloadSchema = z.object({
  version: z.literal(1),
  event: z.string().max(80),
  name: z.string().trim().min(1).max(50),
  artists: z.array(z.string().max(80)).max(3),
  meeting: z.object({ pointId: z.string().max(80), at: z.string().max(40) }).nullable(),
  contact: z.object({ name: z.string().max(50), phone: z.string().max(30) }).optional(),
  badges: z.array(z.string().max(30)).max(8).optional(),
});
export type BumpPlan = z.infer<typeof payloadSchema>;

export function bumpLink(baseUrl: string, plan: BumpPlan) {
  const url = new URL(baseUrl);
  url.search = "";
  url.hash = `crew?plan=${encodeURIComponent(JSON.stringify(plan))}`;
  return url.href;
}

export function readBump(raw: string, data: DemoData): BumpPlan {
  if (raw.length > 3000) throw new Error("This sharing code is too large.");
  const parsed = payloadSchema.safeParse(JSON.parse(raw));
  if (!parsed.success)
    throw new Error("This sharing code is incomplete or uses an unsupported version.");
  const plan = parsed.data;
  if (plan.event !== data.event.id) throw new Error("This plan belongs to another event.");
  if (plan.artists.some((id) => !data.festival.artists.some((a) => a.id === id)))
    throw new Error("This code contains an unknown artist.");
  if (plan.meeting) {
    if (
      !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?(?:Z|[+-]\d{2}:\d{2})$/.test(
        plan.meeting.at,
      )
    )
      throw new Error("The meeting time needs a timezone. Ask your friend to generate a new code.");
    const at = Date.parse(plan.meeting.at);
    if (
      ![...data.points, ...data.stages].some((p) => p.id === plan.meeting?.pointId) ||
      !Number.isFinite(at) ||
      at < +data.event.startAt ||
      at > +data.event.endAt
    )
      throw new Error("The meeting must use a venue place and a time during event hours.");
  }
  return plan;
}
