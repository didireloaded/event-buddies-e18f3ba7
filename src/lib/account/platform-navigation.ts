import { useSyncExternalStore } from "react";
import { oauthReturnPath } from "@/lib/oauth-return-path";

export const PLATFORM_KEY = "event-buddies:platform-preferences";
export const INTERESTS = [
  "Music",
  "Conferences",
  "Corporate",
  "Parties/Nightlife",
  "Sports",
  "Culture/Markets",
] as const;
export type Interest = (typeof INTERESTS)[number];
export type PlatformPreferences = { interests: Interest[]; completed: boolean };
const EMPTY: PlatformPreferences = { interests: [], completed: false };
let cachedRaw: string | null = null;
let cached = EMPTY;
export function parsePlatformPreferences(raw: unknown): PlatformPreferences {
  if (!raw || typeof raw !== "object") return EMPTY;
  const value = raw as Record<string, unknown>;
  return {
    completed: value["completed"] === true,
    interests: INTERESTS.filter(
      (item) => Array.isArray(value["interests"]) && value["interests"].includes(item),
    ),
  };
}
function read(): PlatformPreferences {
  try {
    const raw = localStorage.getItem(PLATFORM_KEY);
    if (raw !== cachedRaw) {
      cachedRaw = raw;
      cached = parsePlatformPreferences(JSON.parse(raw ?? "null"));
    }
    return cached;
  } catch {
    return EMPTY;
  }
}
export function savePlatformPreferences(value: PlatformPreferences): boolean {
  try {
    localStorage.setItem(PLATFORM_KEY, JSON.stringify(parsePlatformPreferences(value)));
    window.dispatchEvent(new Event("eb-platform-change"));
    return true;
  } catch {
    return false;
  }
}
function subscribe(callback: () => void) {
  window.addEventListener("storage", callback);
  window.addEventListener("eb-platform-change", callback);
  return () => {
    window.removeEventListener("storage", callback);
    window.removeEventListener("eb-platform-change", callback);
  };
}
export function usePlatformPreferences() {
  return useSyncExternalStore(subscribe, read, () => EMPTY);
}
export function authDestination(value: unknown): string {
  const safe = oauthReturnPath(value);
  const path = new URL(safe, "https://app.invalid").pathname;
  if (
    path !== "/" &&
    path !== "/organiser" &&
    path !== "/.lovable/oauth/consent" &&
    !/^\/events\/[a-z0-9-]+$/i.test(path)
  )
    return "/#events";
  // Ordinary account entry always returns to Discover; explicit event/invite/OAuth destinations survive.
  return safe === "/" || /^\/login(?:[?#]|$)/.test(safe) || safe === "/#home" ? "/#events" : safe;
}
export function globalCategory(category: string): Interest | null {
  if (/conference|summit/i.test(category)) return "Conferences";
  if (/corporate|business/i.test(category)) return "Corporate";
  if (/party|nightlife|celebration/i.test(category)) return "Parties/Nightlife";
  if (/sport|competition/i.test(category)) return "Sports";
  if (/culture|market|community|expo/i.test(category)) return "Culture/Markets";
  if (/music|festival|concert/i.test(category)) return "Music";
  return null;
}
export function entryState(input: {
  direct: boolean;
  view: string;
  signedIn: boolean;
  completed: boolean;
  legacyCompleted: boolean;
  selected: boolean;
}) {
  const direct = input.direct || ["crew", "lineup", "map", "info"].includes(input.view);
  const onboarding =
    !direct &&
    input.view !== "events" &&
    !input.signedIn &&
    !input.completed &&
    !input.legacyCompleted;
  const discovering = !onboarding && (input.view === "events" || (!direct && !input.selected));
  return { onboarding, discovering };
}
