import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { accountConfigured } from "@/lib/account/use-auth";

export const CREW_MEDIA_BUCKET = "crew-media";

type UntypedRpc = (
  fn: string,
  args?: Record<string, unknown>,
) => Promise<{ data: unknown; error: { message: string } | null }>;

const callRpc: UntypedRpc = (fn, args) => (supabase.rpc as unknown as UntypedRpc)(fn, args);

const signedUrlCache = new Map<string, { url: string; expiresAt: number }>();
const CACHE_TTL_MS = 45 * 60 * 1000;

function fileExt(file: File): string {
  if (file.type === "image/png") return "png";
  if (file.type === "image/webp") return "webp";
  return "jpg";
}

export const crewMediaSchema = z.object({
  photoPath: z.string().nullable().default(null),
  memberAvatars: z.record(z.string(), z.string()).default({}),
});
export type CrewMediaMetadata = z.infer<typeof crewMediaSchema>;

export async function resolveCrewMediaSignedUrl(
  path: string | null | undefined,
): Promise<string | null> {
  if (!path || !accountConfigured) return null;
  if (/^https?:\/\//i.test(path) || path.startsWith("/")) return path;
  const cached = signedUrlCache.get(path);
  if (cached && cached.expiresAt > Date.now()) return cached.url;
  try {
    const { data, error } = await supabase.storage
      .from(CREW_MEDIA_BUCKET)
      .createSignedUrl(path, 3600);
    if (error || !data?.signedUrl) return null;
    signedUrlCache.set(path, { url: data.signedUrl, expiresAt: Date.now() + CACHE_TTL_MS });
    return data.signedUrl;
  } catch {
    return null;
  }
}

export async function getCrewMediaMetadata(crewId: string): Promise<CrewMediaMetadata | null> {
  if (!accountConfigured || !crewId) return null;
  try {
    const { data, error } = await callRpc("get_crew_media", { p_crew_id: crewId });
    if (error || !data) return null;
    const parsed = crewMediaSchema.safeParse(data);
    return parsed.success ? parsed.data : null;
  } catch {
    return null;
  }
}

export async function uploadCrewPhotoToCloud(
  crewId: string,
  file: File,
): Promise<{ ok: true; path: string; signedUrl: string | null } | { ok: false; error: string }> {
  if (!accountConfigured) {
    return { ok: false, error: "Cloud storage is unavailable." };
  }
  const path = `crews/${crewId}/photo-${Date.now()}.${fileExt(file)}`;
  try {
    const { error: uploadErr } = await supabase.storage
      .from(CREW_MEDIA_BUCKET)
      .upload(path, file, { contentType: file.type || "image/jpeg", upsert: true });
    if (uploadErr) {
      return { ok: false, error: "Shared crew photo storage isn’t connected yet." };
    }
    const { error: rpcErr } = await callRpc("set_crew_photo", {
      p_crew_id: crewId,
      p_photo_path: path,
    });
    if (rpcErr) {
      return { ok: false, error: "Shared crew photo record couldn’t be updated in Cloud." };
    }
    const signedUrl = await resolveCrewMediaSignedUrl(path);
    return { ok: true, path, signedUrl };
  } catch {
    return { ok: false, error: "Couldn’t upload crew photo to shared storage." };
  }
}

export async function uploadProfileAvatarToCloud(
  userId: string,
  file: File,
): Promise<{ ok: true; path: string; signedUrl: string | null } | { ok: false; error: string }> {
  if (!accountConfigured || !userId) {
    return { ok: false, error: "Sign in to share your profile photo with your crew." };
  }
  const path = `avatars/${userId}/avatar-${Date.now()}.${fileExt(file)}`;
  try {
    const { error: uploadErr } = await supabase.storage
      .from(CREW_MEDIA_BUCKET)
      .upload(path, file, { contentType: file.type || "image/jpeg", upsert: true });
    if (uploadErr) {
      return { ok: false, error: "Shared avatar storage isn’t connected yet." };
    }
    const { error: rpcErr } = await callRpc("set_my_avatar", { p_avatar_path: path });
    if (rpcErr) {
      return { ok: false, error: "Shared avatar record couldn’t be updated in Cloud." };
    }
    const signedUrl = await resolveCrewMediaSignedUrl(path);
    return { ok: true, path, signedUrl };
  } catch {
    return { ok: false, error: "Couldn’t upload your avatar to shared storage." };
  }
}

export async function removeProfileAvatarFromCloud(): Promise<boolean> {
  if (!accountConfigured) return false;
  try {
    const { error } = await callRpc("set_my_avatar", { p_avatar_path: null });
    return !error;
  } catch {
    return false;
  }
}
