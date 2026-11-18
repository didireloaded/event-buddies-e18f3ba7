export const CREW_INVITE_STORAGE_KEY = "event-buddies:pending-crew-invite";

const STRICT_UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const EMBEDDED_UUID_RE = /\b([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})\b/i;

export function extractCrewInviteCode(input: unknown): string | null {
  if (typeof input !== "string") return null;
  const trimmed = input.trim();
  if (!trimmed) return null;
  if (STRICT_UUID_RE.test(trimmed)) return trimmed.toLowerCase();

  try {
    const parsed = new URL(trimmed, "https://app.invalid");
    const param = parsed.searchParams.get("crewInvite") ?? parsed.searchParams.get("invite");
    if (param && STRICT_UUID_RE.test(param.trim())) return param.trim().toLowerCase();
  } catch {
    /* Fall through to embedded UUID check. */
  }

  const embedded = trimmed.match(EMBEDDED_UUID_RE)?.[1];
  return embedded ? embedded.toLowerCase() : null;
}

export function buildCrewInviteUrl(origin: string, code: string): string {
  const clean = extractCrewInviteCode(code) ?? code.trim().toLowerCase();
  return `${origin.replace(/\/+$/, "")}/?crewInvite=${encodeURIComponent(clean)}#crew`;
}

export function readPendingCrewInvite(): string | null {
  if (typeof window === "undefined") return null;
  try {
    return extractCrewInviteCode(sessionStorage.getItem(CREW_INVITE_STORAGE_KEY));
  } catch {
    return null;
  }
}

export function clearPendingCrewInvite(): void {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.removeItem(CREW_INVITE_STORAGE_KEY);
  } catch {
    /* Ignore storage access errors. */
  }
}

export function captureCrewInviteFromUrl(): string | null {
  if (typeof window === "undefined") return null;
  try {
    const url = new URL(window.location.href);
    const raw = url.searchParams.get("crewInvite") ?? url.searchParams.get("invite");
    const code = extractCrewInviteCode(raw);
    if (!code) return readPendingCrewInvite();
    sessionStorage.setItem(CREW_INVITE_STORAGE_KEY, code);
    url.searchParams.delete("crewInvite");
    url.searchParams.delete("invite");
    window.history.replaceState(window.history.state, "", url.pathname + url.search + url.hash);
    return code;
  } catch {
    return readPendingCrewInvite();
  }
}
