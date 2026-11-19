import { supabase } from "@/integrations/supabase/client";
import { accountConfigured } from "@/lib/account/use-auth";
import { photoStore } from "./ride-photo";
import { eventTime } from "./schedule";
import type { TicketTier } from "./use-attendee";
import type { Place } from "./map";
import type { DemoData } from "@/lib/event/types";

export const TICKET_MAX_BYTES = 8 * 1024 * 1024;
export const TICKET_MIME_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "application/pdf",
] as const;

export type SavedTicketMeta = {
  id: string;
  eventId: string;
  eventName: string;
  eventDateIso: string;
  label: string;
  tier: TicketTier;
  holderName: string;
  fileType: "image" | "pdf" | "code";
  storageKey: string | null;
  ticketCode: string | null;
  fileSize: number | null;
  addedAt: string;
};

export const TICKETS_INDEX_KEY = "event-buddies:tickets-index:v1";
const TICKETS_CHANGE_EVENT = "event-buddies:tickets-updated";

export function primaryTicketStorageKey(eventId: string): string {
  return `ticket:${eventId}`;
}

export function extraTicketStorageKey(eventId: string, ticketId: string): string {
  return `ticket:${eventId}:${ticketId}`;
}

export function formatTicketTier(tier: TicketTier | string | null | undefined): string {
  switch (tier) {
    case "vip":
      return "VIP";
    case "all_access":
      return "All-access";
    case "platinum":
      return "Platinum";
    case "experience":
      return "Experience";
    case "general":
      return "General";
    default:
      return "General";
  }
}

export function getTicketProviderName(url: string | null | undefined): string {
  if (!url) return "official provider";
  try {
    const host = new URL(url).hostname.toLowerCase();
    if (host.includes("howler")) return "Howler";
    if (host.includes("webtickets")) return "Webtickets";
    if (host.includes("quicket")) return "Quicket";
    if (host.includes("eventbrite")) return "Eventbrite";
    if (host.includes("dice")) return "DICE";
    return host.replace(/^www\./, "");
  } catch {
    return "official provider";
  }
}

export function getEventGateLabel(data: DemoData): string {
  const entrance = data.points.find((p) => p.type === "entrance");
  if (!entrance) return "Main Gate";
  return entrance.name;
}

export function getEventOpensTime(data: DemoData): string {
  return eventTime(data.event.doorsOpenAt ?? data.event.startAt);
}

/**
 * Determines whether a venue point requires a restricted ticket tier.
 * Public zones return null (open to everyone, never locked).
 */
export function requiredTierForPlace(place: Place): "vip" | "platinum" | "experience" | null {
  const metaTier =
    typeof place.metadata?.["accessTier"] === "string"
      ? place.metadata["accessTier"].toLowerCase()
      : null;
  if (metaTier === "vip") return "vip";
  if (metaTier === "platinum") return "platinum";
  if (metaTier === "experience") return "experience";
  if (metaTier === "all") return null;

  const lower = place.name.toLowerCase();
  if (lower.includes("platinum")) return "platinum";
  if (/\bvvip\b|\bvip\b/.test(lower)) return "vip";
  if (place.type === "zone" && lower.includes("experience")) return "experience";
  return null;
}

/**
 * Checks whether a venue location is locked for the attendee's effective tier.
 * Public locations (requiredTier === null) are NEVER locked.
 * VIP/Platinum/Experience zones render dimmed (never hidden) when locked.
 */
export function isZoneLockedForTier(
  place: Place,
  userTier: TicketTier | null | undefined,
): boolean {
  const required = requiredTierForPlace(place);
  if (!required) return false;
  const effective: TicketTier = userTier ?? "general";
  if (effective === "all_access") return false;
  if (required === "experience") {
    return effective !== "experience" && effective !== "vip" && effective !== "platinum";
  }
  if (required === "vip") {
    return effective !== "vip" && effective !== "platinum";
  }
  if (required === "platinum") {
    return effective !== "platinum" && effective !== "vip";
  }
  return false;
}

export function readAllSavedTickets(): SavedTicketMeta[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = JSON.parse(localStorage.getItem(TICKETS_INDEX_KEY) ?? "[]");
    if (!Array.isArray(raw)) return [];
    return raw.filter(
      (item): item is SavedTicketMeta =>
        Boolean(item) &&
        typeof item === "object" &&
        typeof (item as Record<string, unknown>)["id"] === "string" &&
        typeof (item as Record<string, unknown>)["eventId"] === "string",
    );
  } catch {
    return [];
  }
}

export function readEventTickets(eventId: string): SavedTicketMeta[] {
  return readAllSavedTickets().filter((t) => t.eventId === eventId);
}

function writeAllSavedTickets(tickets: SavedTicketMeta[]): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(TICKETS_INDEX_KEY, JSON.stringify(tickets));
    window.dispatchEvent(new CustomEvent(TICKETS_CHANGE_EVENT));
  } catch {
    /* Ignore quota failures. */
  }
}

export function subscribeTicketChanges(listener: () => void): () => void {
  if (typeof window === "undefined") return () => {};
  const handler = () => listener();
  window.addEventListener(TICKETS_CHANGE_EVENT, handler);
  window.addEventListener("storage", handler);
  return () => {
    window.removeEventListener(TICKETS_CHANGE_EVENT, handler);
    window.removeEventListener("storage", handler);
  };
}

export async function saveUploadedTicket(input: {
  eventId: string;
  eventName: string;
  eventDateIso: string;
  file: File;
  holderName: string;
  tier: TicketTier;
  label?: string | undefined;
  replacePrimary?: boolean | undefined;
}): Promise<SavedTicketMeta> {
  const existingForEvent = readEventTickets(input.eventId);
  const usePrimaryKey = input.replacePrimary || existingForEvent.length === 0;
  const id =
    usePrimaryKey && existingForEvent[0]?.storageKey === primaryTicketStorageKey(input.eventId)
      ? existingForEvent[0].id
      : crypto.randomUUID();
  const storageKey = usePrimaryKey
    ? primaryTicketStorageKey(input.eventId)
    : extraTicketStorageKey(input.eventId, id);

  await photoStore(storageKey, "save", input.file);

  const meta: SavedTicketMeta = {
    id,
    eventId: input.eventId,
    eventName: input.eventName,
    eventDateIso: input.eventDateIso,
    label:
      input.label?.trim() ||
      (usePrimaryKey
        ? `${formatTicketTier(input.tier)} pass`
        : `Ticket ${existingForEvent.length + 1}`),
    tier: input.tier,
    holderName: input.holderName.trim() || "Attendee",
    fileType: input.file.type === "application/pdf" ? "pdf" : "image",
    storageKey,
    ticketCode: null,
    fileSize: input.file.size,
    addedAt: new Date().toISOString(),
  };

  const all = readAllSavedTickets().filter((t) => t.id !== id);
  writeAllSavedTickets([meta, ...all]);
  return meta;
}

export function saveManualCodeTicket(input: {
  eventId: string;
  eventName: string;
  eventDateIso: string;
  ticketCode: string;
  holderName: string;
  tier: TicketTier;
  label?: string | undefined;
}): SavedTicketMeta {
  const existingForEvent = readEventTickets(input.eventId);
  const id = crypto.randomUUID();
  const meta: SavedTicketMeta = {
    id,
    eventId: input.eventId,
    eventName: input.eventName,
    eventDateIso: input.eventDateIso,
    label: input.label?.trim() || `Ticket ${existingForEvent.length + 1}`,
    tier: input.tier,
    holderName: input.holderName.trim() || "Attendee",
    fileType: "code",
    storageKey: null,
    ticketCode: input.ticketCode.trim().slice(0, 120),
    fileSize: null,
    addedAt: new Date().toISOString(),
  };
  const all = readAllSavedTickets();
  writeAllSavedTickets([meta, ...all]);
  return meta;
}

export function updateEventTicketsTier(eventId: string, tier: TicketTier, ticketId?: string): void {
  const all = readAllSavedTickets();
  const updated = all.map((t) => {
    if (t.eventId !== eventId) return t;
    if (ticketId && t.id !== ticketId) return t;
    return { ...t, tier };
  });
  writeAllSavedTickets(updated);
}

export async function removeSavedTicket(ticketId: string, eventId: string): Promise<void> {
  const all = readAllSavedTickets();
  const target = all.find((t) => t.id === ticketId && t.eventId === eventId);
  if (target?.storageKey) {
    await photoStore(target.storageKey, "remove");
  } else {
    await photoStore(primaryTicketStorageKey(eventId), "remove");
  }
  writeAllSavedTickets(all.filter((t) => t.id !== ticketId));
}

export async function ensurePrimaryBlobIndexed(
  data: DemoData,
  holderName: string,
  tier: TicketTier | null,
): Promise<{
  tickets: SavedTicketMeta[];
  primaryBlob: Blob | null;
}> {
  const key = primaryTicketStorageKey(data.event.id);
  const primaryBlob = await photoStore(key, "read");
  const current = readEventTickets(data.event.id);
  if (primaryBlob && !current.some((t) => t.storageKey === key)) {
    const recovered: SavedTicketMeta = {
      id: `primary-${data.event.id}`,
      eventId: data.event.id,
      eventName: data.event.name,
      eventDateIso: data.event.startAt.toISOString(),
      label: `${formatTicketTier(tier ?? "general")} pass`,
      tier: tier ?? "general",
      holderName: holderName || "Attendee",
      fileType: primaryBlob.type === "application/pdf" ? "pdf" : "image",
      storageKey: key,
      ticketCode: null,
      fileSize: primaryBlob.size,
      addedAt: new Date().toISOString(),
    };
    writeAllSavedTickets([recovered, ...readAllSavedTickets()]);
    return { tickets: [recovered, ...current], primaryBlob };
  }
  return { tickets: current, primaryBlob };
}

export async function readTicketBlob(ticket: SavedTicketMeta): Promise<Blob | null> {
  if (!ticket.storageKey) return null;
  try {
    return await photoStore(ticket.storageKey, "read");
  } catch {
    return null;
  }
}

type UntypedTicketsTable = {
  from: (table: string) => {
    upsert: (
      row: Record<string, unknown>,
      opts?: { onConflict?: string },
    ) => Promise<{ error: { message: string } | null }>;
    select: (cols: string) => {
      eq: (
        col: string,
        val: string,
      ) => Promise<{ data: Record<string, unknown>[] | null; error: { message: string } | null }>;
    };
    delete: () => {
      eq: (
        col: string,
        val: string,
      ) => {
        eq: (col2: string, val2: string) => Promise<{ error: { message: string } | null }>;
      };
    };
  };
};

/**
 * Best-effort cloud backup of ticket metadata & tier into public.tickets when signed in,
 * so a lost phone recovers ticket records & map tiers without breaking offline-first operation.
 */
export async function syncTicketToCloud(userId: string, ticket: SavedTicketMeta): Promise<void> {
  if (!accountConfigured || !userId) return;
  try {
    const client = supabase as unknown as UntypedTicketsTable;
    await client.from("tickets").upsert(
      {
        user_id: userId,
        event_id: ticket.eventId,
        label: ticket.label,
        tier: ticket.tier,
        file_type: ticket.fileType,
        holder_name: ticket.holderName,
        ticket_code: ticket.ticketCode,
        added_at: ticket.addedAt,
      },
      { onConflict: "user_id,event_id,label" },
    );
  } catch {
    /* Table may not be applied in Cloud yet; local offline copy stays intact. */
  }
}

export async function deleteTicketFromCloud(
  userId: string,
  eventId: string,
  label: string,
): Promise<void> {
  if (!accountConfigured || !userId) return;
  try {
    const client = supabase as unknown as {
      from: (table: string) => {
        delete: () => {
          eq: (
            col: string,
            val: string,
          ) => {
            eq: (
              col2: string,
              val2: string,
            ) => {
              eq: (col3: string, val3: string) => Promise<{ error: { message: string } | null }>;
            };
          };
        };
      };
    };
    await client
      .from("tickets")
      .delete()
      .eq("user_id", userId)
      .eq("event_id", eventId)
      .eq("label", label);
  } catch {
    /* Table may not be applied in Cloud yet; local deletion still succeeds. */
  }
}

export async function pullTicketsFromCloud(
  userId: string,
  eventNameById: (eventId: string) => { name: string; dateIso: string },
): Promise<SavedTicketMeta[]> {
  if (!accountConfigured || !userId) return readAllSavedTickets();
  try {
    const client = supabase as unknown as UntypedTicketsTable;
    const { data, error } = await client
      .from("tickets")
      .select("id,event_id,label,tier,file_type,holder_name,ticket_code,added_at")
      .eq("user_id", userId);
    if (error || !Array.isArray(data)) return readAllSavedTickets();

    const local = readAllSavedTickets();
    const merged = [...local];
    for (const row of data) {
      const eventId = typeof row["event_id"] === "string" ? row["event_id"] : null;
      const label = typeof row["label"] === "string" ? row["label"] : null;
      if (!eventId || !label) continue;
      if (merged.some((t) => t.eventId === eventId && t.label === label)) continue;
      const info = eventNameById(eventId);
      merged.push({
        id: typeof row["id"] === "string" ? row["id"] : crypto.randomUUID(),
        eventId,
        eventName: info.name,
        eventDateIso: info.dateIso,
        label,
        tier:
          row["tier"] === "vip" ||
          row["tier"] === "all_access" ||
          row["tier"] === "experience" ||
          row["tier"] === "platinum"
            ? (row["tier"] as TicketTier)
            : "general",
        holderName: typeof row["holder_name"] === "string" ? row["holder_name"] : "Attendee",
        fileType:
          row["file_type"] === "pdf" || row["file_type"] === "code" ? row["file_type"] : "image",
        storageKey: null,
        ticketCode: typeof row["ticket_code"] === "string" ? row["ticket_code"] : null,
        fileSize: null,
        addedAt: typeof row["added_at"] === "string" ? row["added_at"] : new Date().toISOString(),
      });
    }
    writeAllSavedTickets(merged);
    return merged;
  } catch {
    return readAllSavedTickets();
  }
}
