export type GlobalBuddy = {
  id: string;
  name: string;
  handle: string;
  addedAt: string;
  lastEventName?: string;
};

export const GLOBAL_BUDDIES_KEY = "event-buddies:global-buddies:v1";

export function readGlobalBuddies(): GlobalBuddy[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = JSON.parse(localStorage.getItem(GLOBAL_BUDDIES_KEY) ?? "[]");
    if (!Array.isArray(raw)) return [];
    return raw.filter(
      (item): item is GlobalBuddy =>
        Boolean(item) &&
        typeof item === "object" &&
        typeof (item as Record<string, unknown>)["id"] === "string" &&
        typeof (item as Record<string, unknown>)["name"] === "string",
    );
  } catch {
    return [];
  }
}

export function addGlobalBuddy(input: {
  name: string;
  handle?: string;
  lastEventName?: string;
}): GlobalBuddy[] {
  const cleanName = input.name.trim().slice(0, 50);
  if (cleanName.length < 2) return readGlobalBuddies();
  const cleanHandle = (input.handle?.trim() || cleanName.toLowerCase().replace(/[^a-z0-9]+/g, "_"))
    .replace(/^@+/, "")
    .slice(0, 30);

  const existing = readGlobalBuddies();
  const duplicate = existing.some(
    (b) =>
      b.name.toLowerCase() === cleanName.toLowerCase() ||
      (cleanHandle && b.handle.toLowerCase() === cleanHandle.toLowerCase()),
  );
  if (duplicate) return existing;

  const next: GlobalBuddy[] = [
    {
      id: crypto.randomUUID(),
      name: cleanName,
      handle: cleanHandle || "buddy",
      addedAt: new Date().toISOString(),
      ...(input.lastEventName ? { lastEventName: input.lastEventName } : {}),
    },
    ...existing,
  ].slice(0, 50);

  if (typeof window !== "undefined") {
    try {
      localStorage.setItem(GLOBAL_BUDDIES_KEY, JSON.stringify(next));
    } catch {
      /* Ignore quota failures. */
    }
  }
  return next;
}

export function removeGlobalBuddy(id: string): GlobalBuddy[] {
  const next = readGlobalBuddies().filter((b) => b.id !== id);
  if (typeof window !== "undefined") {
    try {
      localStorage.setItem(GLOBAL_BUDDIES_KEY, JSON.stringify(next));
    } catch {
      /* Ignore storage failures. */
    }
  }
  return next;
}
