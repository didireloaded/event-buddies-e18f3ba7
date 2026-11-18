import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

export type OrgEvent = Database["public"]["Tables"]["organiser_events"]["Row"];
export type OrgProfile = Database["public"]["Tables"]["organiser_profiles"]["Row"];

export const BUCKET = "organiser-files";

export async function uploadOwnFile(userId: string, file: File, folder: string) {
  const ext = file.name.split(".").pop()?.toLowerCase().replace(/[^a-z0-9]/g, "") || "bin";
  const path = `${userId}/${folder}/${crypto.randomUUID()}.${ext}`;
  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(path, file, { contentType: file.type || undefined, upsert: false });
  if (error) throw new Error("Upload failed. Check your connection and try again.");
  return path;
}

export async function signedUrl(path: string | null) {
  if (!path) return null;
  const { data } = await supabase.storage.from(BUCKET).createSignedUrl(path, 3600);
  return data?.signedUrl ?? null;
}

export function dbError(message: string | undefined) {
  if (!message) return "Something went wrong. Try again.";
  if (message.includes("verification")) return "Organiser verification must be approved first.";
  if (message.includes("Publishing needs")) return "Add a name, date and site plan before publishing.";
  return "Couldn’t save. Check your connection and try again.";
}
