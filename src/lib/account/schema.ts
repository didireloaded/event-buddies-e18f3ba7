import { z } from "zod";
import type { DemoData } from "@/lib/event/types";
import type { LocalMeeting } from "@/lib/attendee/meeting";

export type Selection = { savedArtists: string[]; meeting: LocalMeeting | null };
export type AccountSnapshot = Selection & { revision: number; updatedAt: string | null };
const meeting = z
  .object({ pointId: z.string().max(80), at: z.string().max(40) })
  .strict()
  .nullable();
export const actionSchema = z
  .object({
    id: z.string().uuid(),
    createdAt: z.number().finite().nonnegative(),
    patch: z
      .object({
        artists: z
          .array(z.object({ id: z.string().max(80), saved: z.boolean() }).strict())
          .max(50)
          .optional(),
        meeting: meeting.optional(),
      })
      .strict(),
  })
  .strict();
export type AccountAction = z.infer<typeof actionSchema>;
export function validSelection(selection: Selection, data: DemoData) {
  if (
    selection.savedArtists.some((id) => !data.festival.artists.some((artist) => artist.id === id))
  )
    return false;
  if (!selection.meeting) return true;
  const time = Date.parse(selection.meeting.at);
  return (
    [...data.stages, ...data.points].some((place) => place.id === selection.meeting!.pointId) &&
    /(?:Z|[+-]\d{2}:\d{2})$/.test(selection.meeting.at) &&
    Number.isFinite(time) &&
    time >= +data.event.startAt &&
    time <= +data.event.endAt
  );
}
export function selectionPatch(before: Selection, after: Selection): AccountAction["patch"] | null {
  const artists = [...new Set([...before.savedArtists, ...after.savedArtists])]
    .filter((id) => before.savedArtists.includes(id) !== after.savedArtists.includes(id))
    .map((id) => ({ id, saved: after.savedArtists.includes(id) }));
  const changedMeeting = JSON.stringify(before.meeting) !== JSON.stringify(after.meeting);
  if (!artists.length && !changedMeeting) return null;
  return {
    ...(artists.length ? { artists } : {}),
    ...(changedMeeting ? { meeting: after.meeting } : {}),
  };
}
export function replayActions(base: Selection, actions: AccountAction[]): Selection {
  let savedArtists = [...base.savedArtists];
  let meeting = base.meeting;
  for (const action of actions) {
    for (const artist of action.patch.artists ?? [])
      savedArtists = artist.saved
        ? [...new Set([...savedArtists, artist.id])]
        : savedArtists.filter((id) => id !== artist.id);
    if ("meeting" in action.patch) meeting = action.patch.meeting ?? null;
  }
  return { savedArtists, meeting };
}
export function readSnapshot(value: unknown, data: DemoData, userId: string): AccountSnapshot {
  if (value === null) return { savedArtists: [], meeting: null, revision: 0, updatedAt: null };
  const row = z
    .object({
      user_id: z.literal(userId),
      event_id: z.literal(data.event.id),
      saved_artist_ids: z.array(z.string()).max(50),
      meeting,
      revision: z.number().int().nonnegative(),
      updated_at: z.string(),
    })
    .safeParse(value);
  if (!row.success) throw new Error("Saved account data needs review. Try syncing again.");
  const record = row.data;
  const selection = { savedArtists: record.saved_artist_ids, meeting: record.meeting };
  if (!validSelection(selection, data))
    throw new Error("Saved account data needs review. Try syncing again.");
  return { ...selection, revision: record.revision, updatedAt: record.updated_at };
}
