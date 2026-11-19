import { useEffect, useRef, useState } from "react";
import { z } from "zod";
import {
  commandSchema,
  crewSchema,
  readCrew,
  sendCrew,
  type Crew,
  type CrewCommand,
} from "./client";
import {
  broadcastCrewUpdated,
  dropCrewPin,
  listCrewPins,
  removeCrewPin,
  subscribeCrewPins,
  type CrewLostAlert,
  type CrewPin,
} from "./pins";
import { getCrewMediaMetadata, resolveCrewMediaSignedUrl } from "./media";

const pendingSchema = z.object({ id: z.string().uuid(), command: commandSchema });
type Pending = z.infer<typeof pendingSchema>;

export type PendingRemoteRevocation = {
  crewId: string;
  userId: string;
  pointId: string | null;
  error: string;
};

type State = {
  scope: string;
  crew: Crew | null;
  pins: CrewPin[];
  crewPhotoUrl: string | null;
  memberAvatarUrls: Record<string, string>;
  lostAlert: CrewLostAlert | null;
  loading: boolean;
  pending: Pending | null;
  revocationPending: PendingRemoteRevocation | null;
  error: string;
  checkedAt: string | null;
  invite: { code: string; expiresAt: string } | null;
};
const initial: State = {
  scope: "",
  crew: null,
  pins: [],
  crewPhotoUrl: null,
  memberAvatarUrls: {},
  lostAlert: null,
  loading: false,
  pending: null,
  revocationPending: null,
  error: "",
  checkedAt: null,
  invite: null,
};
export function useCrew(eventId: string, userId: string | null, scope: string, ready: boolean) {
  const [state, setState] = useState<State>(initial);
  const trigger = useRef<() => void>(() => {});
  const revocationRef = useRef<PendingRemoteRevocation | null>(null);
  revocationRef.current = state.revocationPending;
  const identity = useRef(scope);
  identity.current = scope;
  const storageKey = scope + ":crew";
  const pendingKey = scope + ":crew-pending";
  useEffect(() => {
    if (!userId || !ready) {
      setState({ ...initial, scope });
      return;
    }
    const currentUserId = userId;
    let cancelled = false;
    let running = false;
    let cached: Crew | null = null;
    let checkedAt: string | null = null;
    try {
      const raw = JSON.parse(localStorage.getItem(storageKey) ?? "null");
      if (raw) {
        cached = crewSchema.parse(raw.crew);
        checkedAt = typeof raw.checkedAt === "string" ? raw.checkedAt : null;
      }
    } catch {
      /* Ignore corrupt cached records. */
    }
    const pending = () => {
      const raw = localStorage.getItem(pendingKey);
      return raw ? pendingSchema.parse(JSON.parse(raw)) : null;
    };
    setState({ ...initial, scope, crew: cached, checkedAt });
    async function refresh() {
      if (cancelled || running) return;
      running = true;
      try {
        let action = pending();
        setState((s) => ({ ...s, loading: true, pending: action, error: "" }));
        if (!navigator.onLine) {
          if (action?.command.op === "stop") {
            const offlineStopCrewId = action.command.crewId;
            setState((s) => ({
              ...s,
              revocationPending: {
                crewId: offlineStopCrewId,
                userId: currentUserId,
                pointId: null,
                error:
                  "GPS stopped on this device, but you’re offline so remote removal couldn’t be confirmed with the server yet.",
              },
            }));
          }
          throw new Error(
            "Offline. Your last crew snapshot is shown. Pending actions will retry when connected.",
          );
        }
        // Retry any pending remote pin revocation as soon as we reconnect.
        const pendingRevocation = revocationRef.current;
        if (pendingRevocation) {
          const rev = await removeCrewPin({
            crewId: pendingRevocation.crewId,
            userId: pendingRevocation.userId,
            pointId: pendingRevocation.pointId,
          });
          if (!cancelled && identity.current === scope) {
            if (rev.ok) {
              setState((s) => ({
                ...s,
                revocationPending: null,
                pins: s.pins.filter((p) => p.userId !== pendingRevocation.userId),
              }));
            } else {
              setState((s) => ({
                ...s,
                revocationPending: { ...pendingRevocation, error: rev.error },
              }));
            }
          }
        }
        while (action && !cancelled) {
          const result = await sendCrew(eventId, action.id, action.command);
          if (cancelled || identity.current !== scope) return;
          if (pending()?.id === action.id) localStorage.removeItem(pendingKey);
          if (!result.ok) {
            setState((s) => ({ ...s, error: result.error ?? "This crew action needs review." }));
          }
          if (result.ok) {
            if (action.command.op === "share") {
              const dropRes = await dropCrewPin({
                eventId,
                crewId: action.command.crewId,
                userId: currentUserId,
                displayName:
                  cached?.members.find((m) => m.id === currentUserId)?.name ?? "Crew member",
                pointId: action.command.pointId,
              });
              if (!cancelled && identity.current === scope) {
                if (dropRes.ok) {
                  setState((s) => ({
                    ...s,
                    pins: [dropRes.pin, ...s.pins.filter((p) => p.userId !== dropRes.pin.userId)],
                  }));
                } else {
                  setState((s) => ({ ...s, error: dropRes.error }));
                }
              }
            } else if (action.command.op === "stop") {
              const stopCrewId = action.command.crewId;
              const rev = await removeCrewPin({
                crewId: stopCrewId,
                userId: currentUserId,
              });
              if (!cancelled && identity.current === scope) {
                if (rev.ok) {
                  setState((s) => ({
                    ...s,
                    revocationPending: null,
                    pins: s.pins.filter((p) => p.userId !== currentUserId),
                  }));
                } else {
                  setState((s) => ({
                    ...s,
                    revocationPending: {
                      crewId: stopCrewId,
                      userId: currentUserId,
                      pointId: null,
                      error: rev.error,
                    },
                  }));
                }
              }
            }
            const updatedCrewId =
              "crewId" in action.command ? action.command.crewId : (cached?.id ?? null);
            if (updatedCrewId) {
              void broadcastCrewUpdated(updatedCrewId, eventId);
            }
          }
          if (result.invite && result.expiresAt)
            setState((s) => ({
              ...s,
              invite: { code: result.invite!, expiresAt: result.expiresAt! },
            }));
          action = pending();
        }
        const crew = await readCrew(eventId);
        if (cancelled || identity.current !== scope) return;
        const [pins, mediaMeta] = crew
          ? await Promise.all([listCrewPins(crew.id), getCrewMediaMetadata(crew.id)])
          : [[], null];
        if (cancelled || identity.current !== scope) return;

        // Resolve protected signed URLs for shared crew photo and member avatars
        const photoPath = crew?.photoPath ?? mediaMeta?.photoPath ?? null;
        const resolvedCrewPhoto = photoPath ? await resolveCrewMediaSignedUrl(photoPath) : null;
        const avatarEntries = new Map<string, string>();
        if (crew) {
          for (const m of crew.members) {
            const p = m.avatarPath ?? mediaMeta?.memberAvatars[m.id] ?? null;
            if (p) avatarEntries.set(m.id, p);
          }
        }
        const resolvedAvatars: Record<string, string> = {};
        await Promise.all(
          [...avatarEntries.entries()].map(async ([memberId, path]) => {
            const signed = await resolveCrewMediaSignedUrl(path);
            if (signed) resolvedAvatars[memberId] = signed;
          }),
        );
        if (cancelled || identity.current !== scope) return;

        const checkedAt = new Date().toISOString();
        localStorage.setItem(storageKey, JSON.stringify({ crew, pins, checkedAt }));
        setState((s) => ({
          ...s,
          crew,
          pins,
          crewPhotoUrl: resolvedCrewPhoto,
          memberAvatarUrls: resolvedAvatars,
          checkedAt,
          pending: pending(),
        }));
      } catch (error) {
        if (
          error instanceof Error &&
          error.cause === "crew_denied" &&
          !cancelled &&
          identity.current === scope
        ) {
          localStorage.removeItem(pendingKey);
          localStorage.removeItem(storageKey);
          setState((s) => ({ ...s, crew: null, pending: null, invite: null }));
        }
        const pendingNow = pending();
        if (!cancelled)
          setState((s) => ({
            ...s,
            error: error instanceof Error ? error.message : "Couldn’t refresh your crew.",
            ...(pendingNow?.command.op === "stop"
              ? {
                  revocationPending: {
                    crewId: pendingNow.command.crewId,
                    userId: currentUserId,
                    pointId: null,
                    error:
                      "GPS stopped on this device, but remote removal couldn’t be confirmed with the server. Retry when connected.",
                  },
                }
              : {}),
          }));
      } finally {
        running = false;
        if (!cancelled) setState((s) => ({ ...s, loading: false }));
      }
    }
    const start = () => {
      void refresh();
    };
    trigger.current = start;
    const storage = (event: StorageEvent) => {
      if (event.key === pendingKey) start();
    };
    start();
    const timer = setInterval(() => {
      if (document.visibilityState === "visible") start();
    }, 15000);
    const visibility = () => {
      if (document.visibilityState === "visible") start();
    };
    document.addEventListener("visibilitychange", visibility);
    window.addEventListener("online", start);
    window.addEventListener("focus", start);
    window.addEventListener("storage", storage);
    return () => {
      cancelled = true;
      trigger.current = () => {};
      clearInterval(timer);
      document.removeEventListener("visibilitychange", visibility);
      window.removeEventListener("online", start);
      window.removeEventListener("focus", start);
      window.removeEventListener("storage", storage);
    };
  }, [eventId, userId, scope, ready, storageKey, pendingKey]);

  const activeCrewId = state.scope === scope ? (state.crew?.id ?? null) : null;
  useEffect(() => {
    if (!userId || !ready || !activeCrewId) return;
    return subscribeCrewPins(activeCrewId, {
      onUpserted: (pin) => {
        setState((s) => {
          if (!s.crew || s.crew.id !== pin.crewId) return s;
          const nextPins = [pin, ...s.pins.filter((p) => p.userId !== pin.userId)];
          const nextCrew: Crew = {
            ...s.crew,
            members: s.crew.members.map((m) =>
              m.id === pin.userId ? { ...m, pointId: pin.pointId, expiresAt: pin.expiresAt } : m,
            ),
          };
          const checkedAt = new Date().toISOString();
          try {
            localStorage.setItem(
              storageKey,
              JSON.stringify({ crew: nextCrew, pins: nextPins, checkedAt }),
            );
          } catch {
            /* Ignore quota errors. */
          }
          return { ...s, crew: nextCrew, pins: nextPins, checkedAt };
        });
      },
      onRemoved: (removed) => {
        setState((s) => {
          if (!s.crew || s.crew.id !== removed.crewId) return s;
          const nextPins = s.pins.filter((p) => p.userId !== removed.userId);
          const nextCrew: Crew = {
            ...s.crew,
            members: s.crew.members.map((m) =>
              m.id === removed.userId ? { ...m, pointId: null, expiresAt: null } : m,
            ),
          };
          const checkedAt = new Date().toISOString();
          try {
            localStorage.setItem(
              storageKey,
              JSON.stringify({ crew: nextCrew, pins: nextPins, checkedAt }),
            );
          } catch {
            /* Ignore quota errors. */
          }
          return { ...s, crew: nextCrew, pins: nextPins, checkedAt };
        });
      },
      onLostAlert: (alert) => {
        setState((s) => ({ ...s, lostAlert: alert }));
      },
      onChatMessage: (msg) => {
        if (typeof window !== "undefined") {
          window.dispatchEvent(new CustomEvent("eb:crew-chat", { detail: msg }));
        }
      },
      onCrewUpdated: () => {
        trigger.current();
      },
    });
  }, [activeCrewId, ready, storageKey, userId]);
  function command(value: CrewCommand) {
    if (!userId || !ready || identity.current !== scope) return false;
    try {
      if (localStorage.getItem(pendingKey) && value.op !== "stop")
        throw new Error("Finish the waiting crew action before starting another.");
      const parsed = commandSchema.parse(value);
      const pending = { id: crypto.randomUUID(), command: parsed };
      localStorage.setItem(pendingKey, JSON.stringify(pending));
      setState((s) => ({ ...s, pending, error: "" }));
      trigger.current();
      return true;
    } catch (cause) {
      setState((s) => ({
        ...s,
        error: cause instanceof Error ? cause.message : "Couldn’t save this crew action.",
      }));
      return false;
    }
  }
  const visible = state.scope === scope ? state : { ...initial, scope };
  const stopping = visible.pending?.command.op === "stop";
  const crew = visible.crew && {
    ...visible.crew,
    members: visible.crew.members.map((m) =>
      stopping && m.id === userId ? { ...m, pointId: null, expiresAt: null } : m,
    ),
  };
  async function retryRemoteRevocation() {
    const pendingRev = revocationRef.current;
    if (!pendingRev) return true;
    const res = await removeCrewPin({
      crewId: pendingRev.crewId,
      userId: pendingRev.userId,
      pointId: pendingRev.pointId,
    });
    if (res.ok) {
      setState((s) => ({
        ...s,
        revocationPending: null,
        pins: s.pins.filter((p) => p.userId !== pendingRev.userId),
      }));
      return true;
    }
    setState((s) => ({
      ...s,
      revocationPending: { ...pendingRev, error: res.error },
    }));
    return false;
  }

  return {
    ...visible,
    crew,
    command,
    refresh: () => trigger.current(),
    dismissLostAlert: () => setState((s) => ({ ...s, lostAlert: null })),
    recordAckedPin: (pin: CrewPin) =>
      setState((s) => ({
        ...s,
        pins: [pin, ...s.pins.filter((p) => p.userId !== pin.userId)],
      })),
    markRevocationPending: (pendingRev: PendingRemoteRevocation | null) =>
      setState((s) => ({
        ...s,
        revocationPending: pendingRev,
        pins: pendingRev ? s.pins.filter((p) => p.userId !== pendingRev.userId) : s.pins,
      })),
    retryRemoteRevocation,
  };
}
