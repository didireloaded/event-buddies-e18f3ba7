import { actionSchema, type AccountAction } from "./schema";
/** Every queued action has its own atomic storage entry, shared safely across browser tabs. */
export const actionPrefix = (scope: string) => `${scope}:action:`;
export function queuedActions(scope: string): AccountAction[] {
  const prefix = actionPrefix(scope);
  const actions: AccountAction[] = [];
  for (let index = 0; index < localStorage.length; index++) {
    const key = localStorage.key(index);
    if (!key?.startsWith(prefix)) continue;
    try {
      const parsed = actionSchema.safeParse(JSON.parse(localStorage.getItem(key) ?? "null"));
      if (parsed.success) actions.push(parsed.data);
    } catch {
      /* Ignore malformed browser records. */
    }
  }
  return actions.sort((a, b) => a.createdAt - b.createdAt || a.id.localeCompare(b.id));
}
export function enqueue(scope: string, patch: AccountAction["patch"]) {
  const pending = queuedActions(scope);
  const action: AccountAction = {
    id: crypto.randomUUID(),
    createdAt: Math.max(Date.now(), (pending.at(-1)?.createdAt ?? 0) + 1),
    patch,
  };
  localStorage.setItem(actionPrefix(scope) + action.id, JSON.stringify(action));
  return action;
}
export function acknowledge(scope: string, id: string) {
  localStorage.removeItem(actionPrefix(scope) + id);
}
export function clearAccountCache(scope: string) {
  const keys: string[] = [];
  for (let index = 0; index < localStorage.length; index++) {
    const key = localStorage.key(index);
    if (key === scope || key?.startsWith(`${scope}:`)) keys.push(key);
  }
  for (const key of keys) localStorage.removeItem(key);
}
