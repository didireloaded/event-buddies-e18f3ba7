import { useCallback, useEffect, useState } from "react";
import { removeProfileAvatarFromCloud, uploadProfileAvatarToCloud } from "@/lib/crew/media";
import { photoStore } from "./ride-photo";

export const AVATAR_TYPES = ["image/jpeg", "image/png", "image/webp"] as const;
export const AVATAR_MAX_BYTES = 5 * 1024 * 1024;

export const avatarStorageKey = (eventId: string) => `avatar:${eventId}`;

export function validateAvatarFile(file: { type: string; size: number }): string | null {
  if (!AVATAR_TYPES.includes(file.type as (typeof AVATAR_TYPES)[number]))
    return "Choose a JPG, PNG or WebP photo.";
  if (file.size <= 0 || file.size > AVATAR_MAX_BYTES) return "Choose a photo under 5 MB.";
  return null;
}

export function useAttendeeAvatar(eventId: string, userId?: string | null) {
  const key = avatarStorageKey(eventId);
  const [blob, setBlob] = useState<Blob | null>(null);
  const [url, setUrl] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [syncNote, setSyncNote] = useState("");

  useEffect(() => {
    let active = true;
    setBlob(null);
    setError("");
    setSyncNote("");
    if (typeof indexedDB === "undefined") return;
    void photoStore(key, "read")
      .then((saved) => {
        if (active) setBlob(saved);
      })
      .catch(() => {
        if (active) setError("Saved photo couldn’t be loaded on this browser.");
      });
    return () => {
      active = false;
    };
  }, [key]);

  useEffect(() => {
    if (!blob) {
      setUrl(null);
      return;
    }
    const next = URL.createObjectURL(blob);
    setUrl(next);
    return () => URL.revokeObjectURL(next);
  }, [blob]);

  const save = useCallback(
    async (file: File) => {
      const problem = validateAvatarFile(file);
      if (problem) {
        setError(problem);
        return false;
      }
      setBusy(true);
      setError("");
      setSyncNote("");
      try {
        await photoStore(key, "save", file);
        setBlob(file);
        if (userId) {
          const cloud = await uploadProfileAvatarToCloud(userId, file);
          if (cloud.ok) {
            setSyncNote("Photo synced so your connected crew can see it.");
          } else {
            setSyncNote("Saved on this phone (shared crew avatar storage pending Cloud setup).");
          }
        }
        return true;
      } catch {
        setError("Couldn’t save your photo on this device. Try again.");
        return false;
      } finally {
        setBusy(false);
      }
    },
    [key, userId],
  );

  const remove = useCallback(async () => {
    setBusy(true);
    setError("");
    setSyncNote("");
    try {
      await photoStore(key, "remove");
      setBlob(null);
      if (userId) {
        void removeProfileAvatarFromCloud();
      }
      return true;
    } catch {
      setError("Couldn’t remove your photo. Try again.");
      return false;
    } finally {
      setBusy(false);
    }
  }, [key, userId]);

  return { url, busy, error, syncNote, save, remove };
}
