import { useCallback, useEffect, useState } from "react";
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

export function useAttendeeAvatar(eventId: string) {
  const key = avatarStorageKey(eventId);
  const [blob, setBlob] = useState<Blob | null>(null);
  const [url, setUrl] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    setBlob(null);
    setError("");
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
      try {
        await photoStore(key, "save", file);
        setBlob(file);
        return true;
      } catch {
        setError("Couldn’t save your photo on this device. Try again.");
        return false;
      } finally {
        setBusy(false);
      }
    },
    [key],
  );

  const remove = useCallback(async () => {
    setBusy(true);
    setError("");
    try {
      await photoStore(key, "remove");
      setBlob(null);
      return true;
    } catch {
      setError("Couldn’t remove your photo. Try again.");
      return false;
    } finally {
      setBusy(false);
    }
  }, [key]);

  return { url, busy, error, save, remove };
}
