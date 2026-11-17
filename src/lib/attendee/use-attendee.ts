import { useEffect, useRef, useState } from "react";
import type { DemoData } from "@/lib/event/types";
import type { LocalMeeting } from "./meeting";
import { readBump, type BumpPlan } from "./festival-bump";
import { PREPARATION_ITEMS } from "./preparation";
import { BINGO_ITEMS } from "./play";
import { hapticTap } from "./haptics";
import { useAccountAuth } from "@/lib/account/use-auth";
import { useAccountSync } from "@/lib/account/use-account-sync";
import { enqueue, queuedActions, acknowledge, clearAccountCache } from "@/lib/account/outbox";
import {
  replayActions,
  selectionPatch,
  validSelection,
  type AccountSnapshot,
} from "@/lib/account/schema";
import { dayPlanSchema, type DayPlan } from "@/lib/day-plan/schema";

export type { LocalMeeting };
export type Preferences = {
  dayPlan: DayPlan | null;
  bingo: string[];
  preparation: string[];
  selectedEventId: string | null;
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
  onboardingDone: boolean;
  hasName: boolean;
  installHintDismissed: boolean;
};

/** Browser storage key. Guest preferences are scoped per event. Account selections sync through Cloud. */
export const storageKey = (eventId: string) => `event-buddies:${eventId}:attendee`;

export function defaultPreferences(data: DemoData): Preferences {
  return {
    dayPlan: null,
    bingo: [],
    preparation: [],
    selectedEventId: null,
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
    onboardingDone: false,
    hasName: false,
    installHintDismissed: false,
  };
}

/** Accepts untrusted stored JSON and keeps only values valid for this event. */
export function parseStoredPreferences(raw: unknown, data: DemoData): Preferences {
  const fallback = defaultPreferences(data);
  if (!raw || typeof raw !== "object") return fallback;
  const stored = raw as Record<string, unknown>;
  const plan = dayPlanSchema.safeParse(stored["dayPlan"]);
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
    dayPlan: plan.success ? plan.data : null,
    bingo: [
      ...new Set(
        (strings(stored["bingo"]) ?? []).filter((id) => BINGO_ITEMS.some((item) => item.id === id)),
      ),
    ],
    preparation: [
      ...new Set(
        (strings(stored["preparation"]) ?? []).filter((id) =>
          PREPARATION_ITEMS.some((item) => item.id === id),
        ),
      ),
    ],
    selectedEventId:
      stored["selectedEventId"] === data.event.id ||
      (!("selectedEventId" in stored) && stored["hasName"] === true)
        ? data.event.id
        : null,
    installHintDismissed: stored["installHintDismissed"] === true,
    hasName:
      typeof stored["hasName"] === "boolean"
        ? stored["hasName"] &&
          typeof profile?.["name"] === "string" &&
          profile["name"].trim().length >= 2
        : typeof profile?.["name"] === "string" &&
          profile["name"].trim().length >= 2 &&
          profile["name"] !== "Guest",
    onboardingDone:
      typeof stored["onboardingDone"] === "boolean"
        ? stored["onboardingDone"]
        : Boolean(stored["festivalMode"] || stored["meeting"]),
    sharedPlans,
    here:
      here &&
      typeof here["pointId"] === "string" &&
      placeIds.includes(here["pointId"]) &&
      typeof here["expiresAt"] === "number" &&
      Number.isFinite(here["expiresAt"])
        ? { pointId: here["pointId"], expiresAt: Math.min(here["expiresAt"], Date.now() + 3600000) }
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
      validSelection(
        { savedArtists: [], meeting: { pointId: meeting["pointId"], at: meeting["at"] } },
        data,
      )
        ? { pointId: meeting["pointId"], at: meeting["at"] }
        : null,
  };
}

export function useAttendee(data: DemoData) {
  const auth = useAccountAuth();
  const userId = auth.user?.id ?? null;
  const key = storageKey(data.event.id) + (userId ? `:account:${userId}` : "");
  const [loadedScope, setLoadedScope] = useState<string | null>(null);
  const currentScope = useRef<string | null>(null);
  const [syncVersion, setSyncVersion] = useState(0);
  const [preferences, setPreferences] = useState(() => defaultPreferences(data));
  const current = useRef(preferences);
  const ready = !auth.loading && loadedScope === key;
  const [message, setMessage] = useState<{ text: string; error: boolean } | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const notify = (text: string, error = false) => {
    if (timer.current) clearTimeout(timer.current);
    setMessage({ text, error });
    timer.current = setTimeout(() => setMessage(null), 4200);
  };

  useEffect(() => {
    if (auth.loading) return;
    if (
      currentScope.current &&
      currentScope.current !== key &&
      currentScope.current.includes(":account:")
    ) {
      try {
        clearAccountCache(currentScope.current);
      } catch {
        notify("Couldn’t clear the previous account’s local cache", true);
      }
    }
    let next = defaultPreferences(data);
    try {
      const raw = localStorage.getItem(key);
      if (raw) next = parseStoredPreferences(JSON.parse(raw), data);
      else if (userId) {
        // Public event choice can carry over. Personal guest records need explicit import.
        const guestRaw = localStorage.getItem(storageKey(data.event.id));
        const guest = guestRaw ? parseStoredPreferences(JSON.parse(guestRaw), data) : null;
        next = {
          ...next,
          hasName: true,
          onboardingDone: true,
          selectedEventId: guest?.selectedEventId ?? null,
          profile: { name: "Attendee", handle: "attendee" },
        };
      }
      if (userId) next = { ...next, ...replayActions(next, queuedActions(key)) };
    } catch {
      notify("Your saved preferences couldn’t be loaded", true);
    }
    currentScope.current = key;
    current.current = next;
    setPreferences(next);
    setLoadedScope(key);
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, [auth.loading, data, key, userId]);

  const persist = (next: Preferences) => {
    if (currentScope.current !== key) return false;
    try {
      localStorage.setItem(key, JSON.stringify(next));
    } catch {
      return false;
    }
    current.current = next;
    setPreferences(next);
    return true;
  };
  const accept = (snapshot: AccountSnapshot, actionId?: string) => {
    if (currentScope.current !== key || !userId) return;
    const pending = queuedActions(key).filter((action) => action.id !== actionId);
    const selection = replayActions(snapshot, pending);
    if (!persist({ ...current.current, ...selection }))
      throw new Error(
        "Account data arrived, but this phone couldn’t save its offline copy. Free storage and retry.",
      );
    if (actionId) {
      acknowledge(key, actionId);
      setSyncVersion((version) => version + 1);
    }
  };
  const sync = useAccountSync({ data, userId, scope: key, ready, version: syncVersion, accept });

  const update = (patch: Partial<Preferences>) => {
    if (!ready || currentScope.current !== key) return false;
    const previous = current.current;
    const next = { ...previous, ...patch };
    if (userId && !validSelection(next, data)) {
      notify("Choose an announced artist and a meeting within event hours before syncing.", true);
      return false;
    }
    const actionPatch = userId ? selectionPatch(previous, next) : null;
    try {
      if (actionPatch) enqueue(key, actionPatch);
    } catch {
      notify("Couldn’t queue this account change. Free device storage and try again.", true);
      return false;
    }
    const saved = persist(next);
    if (!saved)
      notify(
        actionPatch
          ? "The account change is queued, but this phone couldn’t update its offline copy."
          : "Couldn’t save on this device. Storage may be full or blocked.",
        true,
      );
    if (actionPatch) setSyncVersion((version) => version + 1);
    return saved;
  };

  const toggleSaved = (id: string) => {
    const enabled = !current.current.saved.includes(id);
    const saved = enabled
      ? [...current.current.saved, id]
      : current.current.saved.filter((item) => item !== id);
    const ok = update({ saved });
    if (ok) {
      hapticTap();
      notify(enabled ? "Added to your lineup" : "Removed from your lineup");
    }
    return ok;
  };

  const toggleArtist = (id: string) => {
    const enabled = !current.current.savedArtists.includes(id);
    const savedArtists = enabled
      ? [...current.current.savedArtists, id]
      : current.current.savedArtists.filter((item) => item !== id);
    if (update({ savedArtists })) {
      hapticTap();
      notify(
        enabled
          ? userId
            ? "Artist queued for account sync"
            : "Artist saved on this device"
          : "Artist removed from saved",
      );
    }
  };

  const toggleFollow = () => {
    const enabled = !current.current.following;
    if (update({ following: enabled })) {
      hapticTap();
      notify(enabled ? "Event saved on this device" : "Event removed from saved");
    }
  };

  return {
    preferences: ready ? preferences : defaultPreferences(data),
    ready,
    message,
    notify,
    update,
    toggleSaved,
    toggleArtist,
    toggleFollow,
    auth,
    sync,
    scope: key,
  };
}
