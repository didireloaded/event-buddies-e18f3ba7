export const CREW_INVITE_STORAGE_KEY = "event-buddies:pending-crew-invite";
export const CREW_INVITE_META_STORAGE_KEY = "event-buddies:pending-crew-invite-meta";

export type CrewInviteMeta = {
  code: string;
  crewName: string | null;
  inviterName: string | null;
};

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

export function buildCrewInviteUrl(
  origin: string,
  code: string,
  meta?: { crewName?: string | null | undefined; inviterName?: string | null | undefined },
): string {
  const clean = extractCrewInviteCode(code) ?? code.trim().toLowerCase();
  const params = new URLSearchParams();
  params.set("crewInvite", clean);
  if (meta?.crewName?.trim()) params.set("crewName", meta.crewName.trim().slice(0, 60));
  if (meta?.inviterName?.trim()) params.set("invitedBy", meta.inviterName.trim().slice(0, 50));
  return `${origin.replace(/\/+$/, "")}/?${params.toString()}#crew`;
}

export function readPendingCrewInvite(): string | null {
  if (typeof window === "undefined") return null;
  try {
    return extractCrewInviteCode(sessionStorage.getItem(CREW_INVITE_STORAGE_KEY));
  } catch {
    return null;
  }
}

export function readPendingCrewInviteMeta(): CrewInviteMeta | null {
  const code = readPendingCrewInvite();
  if (!code) return null;
  try {
    const raw = JSON.parse(sessionStorage.getItem(CREW_INVITE_META_STORAGE_KEY) ?? "null");
    if (raw && typeof raw === "object") {
      return {
        code,
        crewName:
          typeof (raw as Record<string, unknown>)["crewName"] === "string"
            ? ((raw as Record<string, unknown>)["crewName"] as string)
            : null,
        inviterName:
          typeof (raw as Record<string, unknown>)["inviterName"] === "string"
            ? ((raw as Record<string, unknown>)["inviterName"] as string)
            : null,
      };
    }
  } catch {
    /* Ignore invalid stored meta. */
  }
  return { code, crewName: null, inviterName: null };
}

export function clearPendingCrewInvite(): void {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.removeItem(CREW_INVITE_STORAGE_KEY);
    sessionStorage.removeItem(CREW_INVITE_META_STORAGE_KEY);
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
    const crewName = url.searchParams.get("crewName")?.trim().slice(0, 60) || null;
    const inviterName = url.searchParams.get("invitedBy")?.trim().slice(0, 50) || null;
    sessionStorage.setItem(CREW_INVITE_STORAGE_KEY, code);
    sessionStorage.setItem(
      CREW_INVITE_META_STORAGE_KEY,
      JSON.stringify({ code, crewName, inviterName }),
    );
    url.searchParams.delete("crewInvite");
    url.searchParams.delete("invite");
    url.searchParams.delete("crewName");
    url.searchParams.delete("invitedBy");
    window.history.replaceState(window.history.state, "", url.pathname + url.search + url.hash);
    return code;
  } catch {
    return readPendingCrewInvite();
  }
}
