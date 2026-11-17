import type { SupabaseClient } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import type { Database, Json } from "@/integrations/supabase/types";
import { readSnapshot, type AccountAction } from "./schema";
import type { DemoData } from "@/lib/event/types";
// The generated integration stays untouched. This contract mirrors the additive Cloud SQL.
type Row = {
  user_id: string;
  event_id: string;
  saved_artist_ids: string[];
  meeting: Json | null;
  revision: number;
  updated_at: string;
};
type AccountDatabase = Omit<Database, "public"> & {
  public: {
    Tables: {
      attendee_event_preferences: {
        Row: Row;
        Insert: Row;
        Update: Partial<Row>;
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: {
      apply_attendee_action: {
        Args: { p_event_id: string; p_action_id: string; p_action: Json };
        Returns: Row[];
      };
    };
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};
const db = supabase as unknown as SupabaseClient<AccountDatabase>;
function failure(error: { code?: string; message?: string }) {
  if (error.code === "PGRST205" || error.code === "PGRST202")
    return new Error("Account storage is not ready. Try syncing again shortly.");
  if (error.code === "42501") return new Error("Sign in again to save these account changes.");
  return new Error("Couldn’t sync your account. Your changes remain queued on this device.");
}
export async function loadSelection(data: DemoData, userId: string) {
  const result = await db
    .from("attendee_event_preferences")
    .select("*")
    .eq("event_id", data.event.id)
    .eq("user_id", userId)
    .abortSignal(AbortSignal.timeout(10000))
    .maybeSingle();
  if (result.error) throw failure(result.error);
  return readSnapshot(result.data, data, userId);
}
export async function saveAction(data: DemoData, userId: string, action: AccountAction) {
  const result = await db
    .rpc("apply_attendee_action", {
      p_event_id: data.event.id,
      p_action_id: action.id,
      p_action: action.patch as Json,
    })
    .abortSignal(AbortSignal.timeout(10000))
    .single();
  if (result.error) throw failure(result.error);
  return readSnapshot(result.data, data, userId);
}
