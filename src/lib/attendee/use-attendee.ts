import { useEffect, useRef, useState } from "react";
import type { DemoData } from "@/lib/event/types";
import type { LocalMeeting } from "./meeting";
import { readBump, type BumpPlan } from "./festival-bump";

export type { LocalMeeting };
export type Preferences = {
  saved: string[];
  savedArtists: string[];
  profile: { name: string; handle: string };
  following: boolean;
  status: string;
  meeting: LocalMeeting | null;
  ride: { pointId: string; note: string; kind: "car" | "shuttle" } | null;
  stamps: string[];
  festivalMode: "music" | "friends" | "both" | null;
  here: { pointId: string; expiresAt: number } | null;
  batterySaver: boolean;
  sharedPlans: { receivedAt: number; plan: BumpPlan }[];
};

/** Browser storage key. Preferences are scoped per event and never leave this device. */
export const storageKey = (eventId: string) => `event-buddies:${eventId}:attendee`;

export function defaultPreferences(data: DemoData): Preferences {
  return {
    saved: data.savedPerformanceIds,
    savedArtists: [],
    profile: { name: "Guest", handle: "guest" },
    following: data.following,
    status: "Enjoying the music",
    meeting: null,
    ride: null,
    stamps: [],
    festivalMode: null,
    here: null,
    batterySaver: true,
    sharedPlans: [],
  };
}

/** Accepts untrusted stored JSON and keeps only values valid for this event. */
export function parseStoredPreferences(raw: unknown, data: DemoData): Preferences {
  const fallback = defaultPreferences(data);
  if (!raw || typeof raw !== "object") return fallback;
  const stored = raw as Record<string, unknown>;
  const strings = (value: unknown) =>
    Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : null;
  const saved = strings(stored["saved"]);
  const savedArtists = strings(stored["savedArtists"]);
  const profile = stored["profile"] as Record<string, unknown> | undefined;
  const meeting = stored["meeting"] as Record<string, unknown> | undefined;
  const ride = stored["ride"] as Record<string, unknown> | undefined;
  const here = stored["here"] as Record<string, unknown> | undefined;
  const placeIds = [...data.points, ...data.stages].map((point) => point.id);
  const sharedPlans: Preferences["sharedPlans"] = [];
  if (Array.isArray(stored["sharedPlans"])) {
    for (const entry of stored["sharedPlans"].slice(0, 10)) {
      if (
        !entry ||
        typeof entry !== "object" ||
        typeof entry.receivedAt !== "number" ||
        !Number.isFinite(entry.receivedAt)
      )
        continue;
      try {
        sharedPlans.push({
          receivedAt: entry.receivedAt,
          plan: readBump(JSON.stringify(entry.plan), data),
        });
      } catch {
        /* Ignore invalid local records. */
      }
    }
  }
  return {
    sharedPlans,
    here:
      here &&
      typeof here["pointId"] === "string" &&
      placeIds.includes(here["pointId"]) &&
      typeof here["expiresAt"] === "number" &&
      Number.isFinite(here["expiresAt"])
        ? { pointId: here["pointId"], expiresAt: here["expiresAt"] }
        : null,
    batterySaver: typeof stored["batterySaver"] === "boolean" ? stored["batterySaver"] : true,
    festivalMode:
      stored["festivalMode"] === "music" ||
      stored["festivalMode"] === "friends" ||
      stored["festivalMode"] === "both"
        ? stored["festivalMode"]
        : null,
    ride:
      ride &&
      typeof ride["pointId"] === "string" &&
      placeIds.includes(ride["pointId"]) &&
      typeof ride["note"] === "string" &&
      (ride["kind"] === "car" || ride["kind"] === "shuttle")
        ? { pointId: ride["pointId"], note: ride["note"].slice(0, 300), kind: ride["kind"] }
        : null,
    stamps: [...new Set((strings(stored["stamps"]) ?? []).filter((id) => placeIds.includes(id)))],
    saved: saved
      ? [...new Set(saved.filter((id) => data.performances.some((p) => p.id === id)))]
      : fallback.saved,
    savedArtists: savedArtists
      ? [...new Set(savedArtists.filter((id) => data.festival.artists.some((a) => a.id === id)))]
      : [],
    profile:
      profile &&
      typeof profile["name"] === "string" &&
      typeof profile["handle"] === "string" &&
      profile["name"].trim()
        ? { name: profile["name"].slice(0, 50), handle: profile["handle"].slice(0, 30) }
        : fallback.profile,
    following: typeof stored["following"] === "boolean" ? stored["following"] : fallback.following,
    status: typeof stored["status"] === "string" ? stored["status"].slice(0, 50) : fallback.status,
    meeting:
      meeting &&
      typeof meeting["pointId"] === "string" &&
      typeof meeting["at"] === "string" &&
      placeIds.includes(meeting["pointId"]) &&
      Number.isFinite(Date.parse(meeting["at"]))
        ? { pointId: meeting["pointId"], at: meeting["at"] }
        : null,
  };
}

export function useAttendee(data: DemoData) {
  const key = storageKey(data.event.id);
  const [preferences, setPreferences] = useState(() => defaultPreferences(data));
  const current = useRef(preferences);
  const [ready, setReady] = useState(false);
  const [message, setMessage] = useState<{ text: string; error: boolean } | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const notify = (text: string, error = false) => {
    if (timer.current) clearTimeout(timer.current);
    setMessage({ text, error });
    timer.current = setTimeout(() => setMessage(null), 4200);
  };

  useEffect(() => {
    try {
      const raw = localStorage.getItem(key);
      if (raw) {
        const next = parseStoredPreferences(JSON.parse(raw), data);
        current.current = next;
        setPreferences(next);
      }
    } catch {
      notify("Your saved preferences couldn’t be loaded", true);
    }
    setReady(true);
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, [data, key]);

  const update = (patch: Partial<Preferences>) => {
    if (!ready) return false;
    const previous = current.current;
    const next = { ...previous, ...patch };
    try {
      localStorage.setItem(key, JSON.stringify(next));
    } catch {
      notify("Couldn’t save on this device. Storage may be full or blocked.", true);
      return false;
    }
    current.current = next;
    setPreferences(next);
    return true;
  };

  const toggleSaved = (id: string) => {
    const enabled = !current.current.saved.includes(id);
    const saved = enabled
      ? [...current.current.saved, id]
      : current.current.saved.filter((item) => item !== id);
    const ok = update({ saved });
    if (ok) notify(enabled ? "Added to your lineup" : "Removed from your lineup");
    return ok;
  };

  const toggleArtist = (id: string) => {
    const enabled = !current.current.savedArtists.includes(id);
    const savedArtists = enabled
      ? [...current.current.savedArtists, id]
      : current.current.savedArtists.filter((item) => item !== id);
    if (update({ savedArtists }))
      notify(enabled ? "Artist saved on this device" : "Artist removed from saved");
  };

  const toggleFollow = () => {
    const enabled = !current.current.following;
    if (update({ following: enabled }))
      notify(enabled ? "Event saved on this device" : "Event removed from saved");
  };

  return { preferences, ready, message, notify, update, toggleSaved, toggleArtist, toggleFollow };
}
