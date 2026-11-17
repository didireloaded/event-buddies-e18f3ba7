import { useEffect, useRef, useState } from "react";
import type { DemoData } from "@/lib/event/types";
import { loadSelection, saveAction } from "./client";
import { queuedActions, actionPrefix } from "./outbox";
import type { AccountSnapshot } from "./schema";

type SyncState = {
  status: "guest" | "checking" | "synced" | "offline" | "error";
  pending: number;
  error: string;
  updatedAt: string | null;
};
export function useAccountSync({
  data,
  userId,
  scope,
  ready,
  version,
  accept,
}: {
  data: DemoData;
  userId: string | null;
  scope: string;
  ready: boolean;
  version: number;
  accept: (snapshot: AccountSnapshot, actionId?: string) => void;
}) {
  const [state, setState] = useState<SyncState>({
    status: "guest",
    pending: 0,
    error: "",
    updatedAt: null,
  });
  const acceptRef = useRef(accept);
  acceptRef.current = accept;
  const trigger = useRef<() => void>(() => {});
  useEffect(() => {
    if (!ready || !userId) {
      setState({ status: "guest", pending: 0, error: "", updatedAt: null });
      return;
    }
    let cancelled = false;
    let running = false;
    let newestRevision = -1;
    async function run() {
      if (running || cancelled) return;
      const pending = queuedActions(scope);
      if (!navigator.onLine) {
        setState((previous) => ({
          ...previous,
          status: "offline",
          pending: pending.length,
          error: "",
        }));
        return;
      }
      running = true;
      setState((previous) => ({
        ...previous,
        status: "checking",
        pending: pending.length,
        error: "",
      }));
      try {
        let snapshot = await loadSelection(data, userId!);
        if (cancelled) return;
        if (snapshot.revision >= newestRevision) {
          acceptRef.current(snapshot);
          newestRevision = snapshot.revision;
        }
        let action = queuedActions(scope)[0];
        while (action && !cancelled) {
          snapshot = await saveAction(data, userId!, action);
          if (cancelled) return;
          acceptRef.current(snapshot, action.id);
          newestRevision = Math.max(newestRevision, snapshot.revision);
          action = queuedActions(scope)[0];
        }
        if (!cancelled)
          setState({ status: "synced", pending: 0, error: "", updatedAt: snapshot.updatedAt });
      } catch (cause) {
        if (!cancelled)
          setState((previous) => ({
            ...previous,
            status: navigator.onLine ? "error" : "offline",
            pending: queuedActions(scope).length,
            error: navigator.onLine
              ? cause instanceof Error
                ? cause.message
                : "Account sync failed. Try again."
              : "",
          }));
      } finally {
        running = false;
      }
    }
    const start = () => {
      void run();
    };
    trigger.current = start;
    const storage = (event: StorageEvent) => {
      if (event.key?.startsWith(actionPrefix(scope))) start();
    };
    window.addEventListener("online", start);
    window.addEventListener("offline", start);
    window.addEventListener("focus", start);
    window.addEventListener("storage", storage);
    const timer = window.setInterval(start, 30000);
    start();
    return () => {
      cancelled = true;
      trigger.current = () => {};
      clearInterval(timer);
      window.removeEventListener("online", start);
      window.removeEventListener("offline", start);
      window.removeEventListener("focus", start);
      window.removeEventListener("storage", storage);
    };
  }, [data, userId, scope, ready]);
  useEffect(() => {
    if (version) trigger.current();
  }, [version]);
  return { ...state, retry: () => trigger.current() };
}
