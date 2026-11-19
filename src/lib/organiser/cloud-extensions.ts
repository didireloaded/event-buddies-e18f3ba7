import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { accountConfigured } from "@/lib/account/use-auth";

type UntypedRpc = (
  fn: string,
  args?: Record<string, unknown>,
) => Promise<{ data: unknown; error: { message: string } | null }>;

const callRpc: UntypedRpc = (fn, args) => (supabase.rpc as unknown as UntypedRpc)(fn, args);

export const broadcastSchema = z.object({
  id: z.string(),
  eventId: z.string(),
  kind: z.enum(["update", "emergency"]),
  message: z.string().min(1).max(240),
  createdAt: z.string(),
});
export type OrganiserBroadcast = z.infer<typeof broadcastSchema>;

export const publishedEventSchema = z.object({
  id: z.string(),
  eventType: z.string().default("festival"),
  name: z.string(),
  startDate: z.string().nullable(),
  endDate: z.string().nullable(),
  venue: z.string(),
  gatesOpen: z.string().default(""),
  entryRules: z.string().default(""),
  program: z.array(z.unknown()).optional(),
  zones: z.array(z.unknown()).optional(),
  sitePlanPath: z.string().nullable().optional(),
  sitePlanUrl: z.string().nullable().optional(),
  sitePlanZoomUrl: z.string().nullable().optional(),
  publishedAt: z.string().nullable(),
});
export type PublishedOrganiserEvent = z.infer<typeof publishedEventSchema>;

export const verificationRowSchema = z.object({
  userId: z.string(),
  displayName: z.string(),
  organisation: z.string(),
  verificationStatus: z.enum(["unverified", "pending", "verified", "rejected"]),
  verificationDocumentPath: z.string().nullable(),
  updatedAt: z.string(),
});
export type AdminVerificationRow = z.infer<typeof verificationRowSchema>;

export const eventAggregatesSchema = z.object({
  savedPlansCount: z.number().int().nonnegative(),
  crewsCount: z.number().int().nonnegative(),
  crewMembersCount: z.number().int().nonnegative(),
  activePinsCount: z.number().int().nonnegative(),
});
export type OrganiserEventAggregates = z.infer<typeof eventAggregatesSchema>;

export async function sendOrganiserBroadcast(input: {
  eventId: string;
  kind: "update" | "emergency";
  message: string;
}): Promise<{ ok: true; broadcast: OrganiserBroadcast } | { ok: false; error: string }> {
  const trimmed = input.message.trim();
  if (!trimmed || trimmed.length > 240) {
    return { ok: false, error: "Enter a message up to 240 characters." };
  }
  if (!accountConfigured) {
    return { ok: false, error: "Cloud connection settings are unavailable." };
  }
  try {
    const { data, error } = await callRpc("send_organiser_broadcast", {
      p_event_id: input.eventId,
      p_kind: input.kind,
      p_message: trimmed,
    });
    if (error) {
      if (error.message.includes("send_organiser_broadcast"))
        return {
          ok: false,
          error:
            "Broadcast table isn’t applied in Cloud yet. Run backend/cloud/organiser-and-crew-extensions.sql in the Cloud SQL editor.",
        };
      return { ok: false, error: error.message };
    }
    const parsed = broadcastSchema.safeParse(data);
    if (!parsed.success) return { ok: false, error: "Broadcast response could not be verified." };
    return { ok: true, broadcast: parsed.data };
  } catch {
    return { ok: false, error: "Couldn’t send broadcast. Check your connection and try again." };
  }
}

export async function listEventBroadcasts(eventId: string): Promise<OrganiserBroadcast[]> {
  if (!accountConfigured) return [];
  try {
    const { data, error } = await callRpc("list_event_broadcasts", { p_event_id: eventId });
    if (error || !Array.isArray(data)) return [];
    return data.flatMap((row) => {
      const parsed = broadcastSchema.safeParse(row);
      return parsed.success ? [parsed.data] : [];
    });
  } catch {
    return [];
  }
}

export async function listPublishedOrganiserEvents(): Promise<PublishedOrganiserEvent[]> {
  if (!accountConfigured) return [];
  try {
    const { data, error } = await callRpc("list_published_events");
    if (error || !Array.isArray(data)) return [];
    return data.flatMap((row) => {
      const parsed = publishedEventSchema.safeParse(row);
      return parsed.success ? [parsed.data] : [];
    });
  } catch {
    return [];
  }
}

export async function listAdminVerifications(): Promise<AdminVerificationRow[] | null> {
  if (!accountConfigured) return null;
  try {
    const { data, error } = await callRpc("admin_list_organiser_verifications");
    if (error || !Array.isArray(data)) return null;
    return data.flatMap((row) => {
      const parsed = verificationRowSchema.safeParse(row);
      return parsed.success ? [parsed.data] : [];
    });
  } catch {
    return null;
  }
}

export async function reviewOrganiserVerification(
  userId: string,
  status: "verified" | "rejected",
): Promise<{ ok: true } | { ok: false; error: string }> {
  if (!accountConfigured) return { ok: false, error: "Cloud connection settings are unavailable." };
  try {
    const { error } = await callRpc("admin_review_organiser", {
      p_user_id: userId,
      p_status: status,
    });
    if (error) return { ok: false, error: error.message };
    return { ok: true };
  } catch {
    return { ok: false, error: "Couldn’t update verification status." };
  }
}

export async function getOrganiserEventAggregates(
  eventId: string,
): Promise<OrganiserEventAggregates | null> {
  if (!accountConfigured) return null;
  try {
    const { data, error } = await callRpc("organiser_event_aggregates", {
      p_event_id: eventId,
    });
    if (error) return null;
    const parsed = eventAggregatesSchema.safeParse(data);
    return parsed.success ? parsed.data : null;
  } catch {
    return null;
  }
}

export async function getCrewArtistOverlap(eventId: string): Promise<Record<string, string[]>> {
  if (!accountConfigured) return {};
  try {
    const { data, error } = await callRpc("attendee_crew_artist_overlap", {
      p_event_id: eventId,
    });
    if (error || !data || typeof data !== "object" || Array.isArray(data)) return {};
    const out: Record<string, string[]> = {};
    for (const [artistId, names] of Object.entries(data as Record<string, unknown>)) {
      if (Array.isArray(names)) {
        const clean = names.filter(
          (n): n is string => typeof n === "string" && n.trim().length > 0,
        );
        if (clean.length) out[artistId] = clean;
      }
    }
    return out;
  } catch {
    return {};
  }
}

export async function deleteMyAccountData(): Promise<{ ok: true } | { ok: false; error: string }> {
  if (!accountConfigured) return { ok: false, error: "Cloud connection settings are unavailable." };
  try {
    const { error } = await callRpc("delete_my_attendee_account_data");
    if (error) {
      if (error.message.includes("delete_my_attendee_account_data"))
        return {
          ok: false,
          error:
            "Account-deletion function isn’t applied in Cloud yet. Run backend/cloud/organiser-and-crew-extensions.sql in the Cloud SQL editor.",
        };
      return { ok: false, error: error.message };
    }
    return { ok: true };
  } catch {
    return { ok: false, error: "Couldn’t delete synced account data. Try again." };
  }
}

export const crewActivitySchema = z.object({
  id: z.string(),
  eventId: z.string(),
  crewId: z.string().default("local"),
  authorId: z.string().default("self"),
  authorName: z.string(),
  kind: z.enum(["ping", "safe", "sos", "poll", "travel", "message"]),
  message: z.string().min(1).max(200),
  pointId: z.string().nullable().default(null),
  meta: z.record(z.string(), z.unknown()).default({}),
  createdAt: z.string(),
});
export type CrewActivity = z.infer<typeof crewActivitySchema>;

export async function crewListActivities(eventId: string): Promise<CrewActivity[]> {
  if (!accountConfigured) return [];
  try {
    const { data, error } = await callRpc("crew_list_activities", { p_event_id: eventId });
    if (error || !Array.isArray(data)) return [];
    return data.flatMap((row) => {
      const parsed = crewActivitySchema.safeParse(row);
      return parsed.success ? [parsed.data] : [];
    });
  } catch {
    return [];
  }
}

export async function crewPostActivity(input: {
  eventId: string;
  kind: CrewActivity["kind"];
  message: string;
  pointId?: string | null | undefined;
  meta?: Record<string, unknown> | undefined;
}): Promise<{ ok: true; activity: CrewActivity } | { ok: false; error: string }> {
  if (!accountConfigured) return { ok: false, error: "Saved on this device." };
  try {
    const { data, error } = await callRpc("crew_post_activity", {
      p_event_id: input.eventId,
      p_kind: input.kind,
      p_message: input.message.trim(),
      p_point_id: input.pointId ?? null,
      p_meta: input.meta ?? {},
    });
    if (error) return { ok: false, error: error.message };
    const parsed = crewActivitySchema.safeParse(data);
    if (!parsed.success) return { ok: false, error: "Saved on this device." };
    return { ok: true, activity: parsed.data };
  } catch {
    return { ok: false, error: "Saved on this device." };
  }
}

export async function crewVotePoll(input: {
  eventId: string;
  activityId: string;
  optionIndex: number;
}): Promise<{ ok: true; meta: Record<string, unknown> } | { ok: false; error: string }> {
  if (!accountConfigured) return { ok: false, error: "Saved on this device." };
  try {
    const { data, error } = await callRpc("crew_vote_poll", {
      p_event_id: input.eventId,
      p_activity_id: input.activityId,
      p_option_index: input.optionIndex,
    });
    if (error || !data || typeof data !== "object")
      return { ok: false, error: "Saved on this device." };
    const meta = (data as Record<string, unknown>)["meta"];
    return {
      ok: true,
      meta:
        meta && typeof meta === "object" && !Array.isArray(meta)
          ? (meta as Record<string, unknown>)
          : {},
    };
  } catch {
    return { ok: false, error: "Saved on this device." };
  }
}

export const teamMemberSchema = z.object({
  id: z.string(),
  email: z.string(),
  role: z.enum(["editor", "live_ops", "viewer"]),
  createdAt: z.string(),
});
export type OrganiserTeamMember = z.infer<typeof teamMemberSchema>;

export async function listOrganiserTeamMembers(ownerId: string): Promise<OrganiserTeamMember[]> {
  if (accountConfigured) {
    try {
      const { data, error } = await callRpc("list_organiser_team_members");
      if (!error && Array.isArray(data)) {
        return data.flatMap((row) => {
          const parsed = teamMemberSchema.safeParse(row);
          return parsed.success ? [parsed.data] : [];
        });
      }
    } catch {
      /* Fall back to local cache below. */
    }
  }
  try {
    const raw = JSON.parse(localStorage.getItem(`event-buddies:org-team:${ownerId}`) ?? "[]");
    if (!Array.isArray(raw)) return [];
    return raw.flatMap((row) => {
      const parsed = teamMemberSchema.safeParse(row);
      return parsed.success ? [parsed.data] : [];
    });
  } catch {
    return [];
  }
}

export async function manageOrganiserTeamMember(
  ownerId: string,
  action: "upsert" | "remove",
  email: string,
  role: OrganiserTeamMember["role"] = "editor",
): Promise<OrganiserTeamMember[]> {
  const cleanEmail = email.trim().toLowerCase();
  if (accountConfigured) {
    try {
      const { data, error } = await callRpc("manage_organiser_team_member", {
        p_action: action,
        p_email: cleanEmail,
        p_role: role,
      });
      if (!error && Array.isArray(data)) {
        const list = data.flatMap((row) => {
          const parsed = teamMemberSchema.safeParse(row);
          return parsed.success ? [parsed.data] : [];
        });
        localStorage.setItem(`event-buddies:org-team:${ownerId}`, JSON.stringify(list));
        return list;
      }
    } catch {
      /* Fall back to local storage below. */
    }
  }
  const existing = await listOrganiserTeamMembers(ownerId);
  const next =
    action === "remove"
      ? existing.filter((m) => m.email.toLowerCase() !== cleanEmail)
      : [
          ...existing.filter((m) => m.email.toLowerCase() !== cleanEmail),
          {
            id: crypto.randomUUID(),
            email: cleanEmail,
            role,
            createdAt: new Date().toISOString(),
          },
        ];
  localStorage.setItem(`event-buddies:org-team:${ownerId}`, JSON.stringify(next));
  return next;
}

export async function cleanupExpiredEventData(): Promise<{
  clearedPins: number;
  clearedInvites: number;
} | null> {
  if (!accountConfigured) return null;
  try {
    const { data, error } = await callRpc("cleanup_expired_event_data");
    if (error || !data || typeof data !== "object") return null;
    const rec = data as Record<string, unknown>;
    return {
      clearedPins: typeof rec["clearedPins"] === "number" ? rec["clearedPins"] : 0,
      clearedInvites: typeof rec["clearedInvites"] === "number" ? rec["clearedInvites"] : 0,
    };
  } catch {
    return null;
  }
}
