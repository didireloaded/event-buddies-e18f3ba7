import { z } from "zod";
import type { SupabaseClient } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import type { Json } from "@/integrations/supabase/types";
import type { LocalMeeting } from "@/lib/attendee/meeting";
export const crewSchema = z
  .object({
    id: z.string().uuid(),
    name: z.string().min(2).max(60),
    revision: z.number().int().nonnegative(),
    meeting: z.object({ pointId: z.string(), at: z.string() }).nullable(),
    members: z
      .array(
        z.object({
          id: z.string().uuid(),
          name: z.string().max(50),
          owner: z.boolean(),
          generation: z.number().int().nonnegative(),
          pointId: z.string().nullable(),
          expiresAt: z.string().nullable(),
        }),
      )
      .max(100),
  })
  .nullable();
export type Crew = NonNullable<z.infer<typeof crewSchema>>;
export type CrewCommand =
  | { op: "create"; name: string; displayName: string }
  | { op: "join"; code: string; displayName: string }
  | { op: "invite" | "leave" | "stop"; crewId: string }
  | { op: "meeting"; crewId: string; revision: number; meeting: LocalMeeting | null }
  | { op: "share"; crewId: string; generation: number; pointId: string; sentAt: string };
export const commandSchema = z.discriminatedUnion("op", [
  z.object({
    op: z.literal("create"),
    name: z.string().min(2).max(60),
    displayName: z.string().min(2).max(50),
  }),
  z.object({
    op: z.literal("join"),
    code: z.string().uuid(),
    displayName: z.string().min(2).max(50),
  }),
  z.object({ op: z.enum(["invite", "leave", "stop"]), crewId: z.string().uuid() }),
  z.object({
    op: z.literal("meeting"),
    crewId: z.string().uuid(),
    revision: z.number().int().nonnegative(),
    meeting: z.object({ pointId: z.string(), at: z.string() }).nullable(),
  }),
  z.object({
    op: z.literal("share"),
    crewId: z.string().uuid(),
    generation: z.number().int().nonnegative(),
    pointId: z.string(),
    sentAt: z.string(),
  }),
]);
type CrewDatabase = {
  public: {
    Tables: Record<string, never>;
    Views: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
    Functions: {
      attendee_crew_state: { Args: { p_event_id: string }; Returns: Json };
      attendee_crew_command: {
        Args: { p_event_id: string; p_request_id: string; p_command: Json };
        Returns: Json;
      };
    };
  };
};
const db = supabase as unknown as SupabaseClient<CrewDatabase>;
function check(error: { code?: string } | null) {
  if (!error) return;
  if (error.code === "42501")
    throw new Error("Your crew access changed. Refresh or join with a new invite.", {
      cause: "crew_denied",
    });
  if (error.code === "PGRST202")
    throw new Error("Shared crew storage is being connected. Retry shortly.");
  throw new Error(
    "Couldn’t reach your crew. This action is waiting on your device. Retry when connected.",
  );
}
export async function readCrew(eventId: string) {
  const { data, error } = await db
    .rpc("attendee_crew_state", { p_event_id: eventId })
    .abortSignal(AbortSignal.timeout(10000));
  check(error);
  const result = crewSchema.safeParse(data);
  if (!result.success) throw new Error("The crew response couldn’t be read. Retry the refresh.");
  return result.data;
}
export async function sendCrew(eventId: string, id: string, command: CrewCommand) {
  const { data, error } = await db
    .rpc("attendee_crew_command", {
      p_event_id: eventId,
      p_request_id: id,
      p_command: command as unknown as Json,
    })
    .abortSignal(AbortSignal.timeout(10000));
  check(error);
  const parsed = z
    .object({
      ok: z.boolean(),
      error: z.string().optional(),
      invite: z.string().uuid().optional(),
      expiresAt: z.string().optional(),
    })
    .safeParse(data);
  if (!parsed.success) throw new Error("The crew response couldn’t be read. Retry this action.");
  return parsed.data;
}
