import { useEffect, useRef, useState } from "react";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { accountConfigured } from "@/lib/account/use-auth";
import {
  commandSchema,
  crewSchema,
  readCrew,
  sendCrew,
  type Crew,
  type CrewCommand,
} from "./client";
const pendingSchema = z.object({ id: z.string().uuid(), command: commandSchema });
type Pending = z.infer<typeof pendingSchema>;
type State = {
  scope: string;
  crew: Crew | null;
  loading: boolean;
  pending: Pending | null;
  error: string;
  checkedAt: string | null;
  invite: { code: string; expiresAt: string } | null;
};
const initial: State = {
  scope: "",
  crew: null,
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
    let cancelled = false;
    let running = false;
    let cached: Crew | null = null;
    let checkedAt: string | null = null;
    const channel =
      accountConfigured && typeof supabase.channel === "function"
        ? supabase.channel(`crew-sync:${eventId}`)
        : null;
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
          if (result.ok && channel) {
            void channel.send({
              type: "broadcast",
              event: "crew-updated",
              payload: { eventId },
            });
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
        const checkedAt = new Date().toISOString();
        localStorage.setItem(storageKey, JSON.stringify({ crew, checkedAt }));
        setState((s) => ({ ...s, crew, checkedAt, pending: pending() }));
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
    if (channel) {
      channel.on("broadcast", { event: "crew-updated" }, () => start()).subscribe();
    }
    return () => {
      cancelled = true;
      trigger.current = () => {};
      clearInterval(timer);
      if (channel && typeof supabase.removeChannel === "function") {
        void supabase.removeChannel(channel);
      }
      document.removeEventListener("visibilitychange", visibility);
      window.removeEventListener("online", start);
      window.removeEventListener("focus", start);
      window.removeEventListener("storage", storage);
    };
  }, [eventId, userId, scope, ready, storageKey, pendingKey]);
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
  return { ...visible, crew, command, refresh: () => trigger.current() };
}
