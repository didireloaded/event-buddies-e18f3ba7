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
const pendingSchema = z.object({ id: z.string().uuid(), command: commandSchema });
type Pending = z.infer<typeof pendingSchema>;
type State = {
  scope: string;
  crew: Crew | null;
  pins: CrewPin[];
  lostAlert: CrewLostAlert | null;
  loading: boolean;
  pending: Pending | null;
  error: string;
  checkedAt: string | null;
  invite: { code: string; expiresAt: string } | null;
};
const initial: State = {
  scope: "",
  crew: null,
  pins: [],
  lostAlert: null,
  loading: false,
  pending: null,
  error: "",
  checkedAt: null,
  invite: null,
};
export function useCrew(eventId: string, userId: string | null, scope: string, ready: boolean) {
  const [state, setState] = useState<State>(initial);
  const trigger = useRef<() => void>(() => {});
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
        if (!navigator.onLine)
          throw new Error(
            "Offline. Your last crew snapshot is shown. Pending actions will retry when connected.",
          );
        while (action && !cancelled) {
          const result = await sendCrew(eventId, action.id, action.command);
          if (cancelled || identity.current !== scope) return;
          if (pending()?.id === action.id) localStorage.removeItem(pendingKey);
          if (!result.ok) {
            setState((s) => ({ ...s, error: result.error ?? "This crew action needs review." }));
          }
          if (result.ok) {
            if (action.command.op === "share") {
              void dropCrewPin({
                eventId,
                crewId: action.command.crewId,
                userId: currentUserId,
                displayName:
                  cached?.members.find((m) => m.id === currentUserId)?.name ?? "Crew member",
                pointId: action.command.pointId,
              });
            } else if (action.command.op === "stop") {
              void removeCrewPin({
                crewId: action.command.crewId,
                userId: currentUserId,
              });
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
        const pins = crew ? await listCrewPins(crew.id) : [];
        if (cancelled || identity.current !== scope) return;
        const checkedAt = new Date().toISOString();
        localStorage.setItem(storageKey, JSON.stringify({ crew, pins, checkedAt }));
        setState((s) => ({ ...s, crew, pins, checkedAt, pending: pending() }));
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
        if (!cancelled)
          setState((s) => ({
            ...s,
            error: error instanceof Error ? error.message : "Couldn’t refresh your crew.",
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
  return {
    ...visible,
    crew,
    command,
    refresh: () => trigger.current(),
    dismissLostAlert: () => setState((s) => ({ ...s, lostAlert: null })),
  };
}
