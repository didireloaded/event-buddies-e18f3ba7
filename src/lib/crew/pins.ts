import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { accountConfigured } from "@/lib/account/use-auth";

type UntypedRpc = (
  fn: string,
  args?: Record<string, unknown>,
) => Promise<{ data: unknown; error: { message: string } | null }>;

const callRpc: UntypedRpc = (fn, args) => (supabase.rpc as unknown as UntypedRpc)(fn, args);

export function roundVenueCoord(value: number | null | undefined): number | null {
  if (typeof value !== "number" || !Number.isFinite(value)) return null;
  if (value < 0 || value > 100) return null;
  return Math.round(value * 10) / 10;
}

export function roundGpsCoord(
  value: number | null | undefined,
  min: number,
  max: number,
): number | null {
  if (typeof value !== "number" || !Number.isFinite(value)) return null;
  if (value < min || value > max) return null;
  return Math.round(value * 10000) / 10000;
}

export function crewPinChannelTopic(crewId: string): string {
  return `crew:${crewId}:pins`;
}

export const crewPinSchema = z.object({
  id: z.string().optional(),
  eventId: z.string().optional(),
  crewId: z.string(),
  userId: z.string(),
  displayName: z.string(),
  pointId: z.string().nullable(),
  x: z.number().nullable().default(null),
  y: z.number().nullable().default(null),
  lat: z.number().nullable().default(null),
  lng: z.number().nullable().default(null),
  createdAt: z.string().optional(),
  expiresAt: z.string(),
});
export type CrewPin = z.infer<typeof crewPinSchema>;

export const pinRemovedSchema = z.object({
  crewId: z.string(),
  userId: z.string(),
  pointId: z.string().nullable().optional(),
});
export type PinRemovedPayload = z.infer<typeof pinRemovedSchema>;

export const crewLostAlertSchema = z.object({
  id: z.string(),
  crewId: z.string(),
  eventId: z.string(),
  userId: z.string(),
  authorName: z.string(),
  pointId: z.string().nullable(),
  placeName: z.string(),
  message: z.string(),
  createdAt: z.string(),
});
export type CrewLostAlert = z.infer<typeof crewLostAlertSchema>;

export const crewRealtimeChatSchema = z.object({
  id: z.string(),
  eventId: z.string(),
  crewId: z.string(),
  authorId: z.string(),
  authorName: z.string(),
  kind: z.enum(["ping", "safe", "sos", "poll", "travel", "message"]),
  message: z.string().min(1).max(200),
  pointId: z.string().nullable().default(null),
  meta: z.record(z.string(), z.unknown()).default({}),
  createdAt: z.string(),
});
export type CrewRealtimeChat = z.infer<typeof crewRealtimeChatSchema>;

/**
 * Opt-in, single-shot GPS coordinate reading rounded to 4 decimal places (~11m).
 * Never uses watchPosition or continuous background tracking.
 */
export function requestOneTimeGeolocation(
  timeoutMs = 6000,
): Promise<{ lat: number; lng: number } | null> {
  if (typeof navigator === "undefined" || !("geolocation" in navigator)) {
    return Promise.resolve(null);
  }
  return new Promise((resolve) => {
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const lat = roundGpsCoord(pos.coords.latitude, -90, 90);
        const lng = roundGpsCoord(pos.coords.longitude, -180, 180);
        if (lat !== null && lng !== null) resolve({ lat, lng });
        else resolve(null);
      },
      () => resolve(null),
      { enableHighAccuracy: false, timeout: timeoutMs, maximumAge: 60000 },
    );
  });
}

export async function triggerCrewPushNotification(title: string, body: string): Promise<void> {
  if (typeof window === "undefined") return;
  try {
    navigator.vibrate?.([200, 100, 200]);
  } catch {
    /* Ignore vibration restrictions. */
  }
  if (typeof Notification === "undefined" || Notification.permission !== "granted") return;
  try {
    if ("serviceWorker" in navigator) {
      const reg = await navigator.serviceWorker.getRegistration();
      if (reg && typeof reg.showNotification === "function") {
        await reg.showNotification(title, {
          body,
          tag: "event-buddies-crew-alert",
        });
        return;
      }
    }
    new Notification(title, { body, tag: "event-buddies-crew-alert" });
  } catch {
    /* Ignore notification errors on unsupported browsers. */
  }
}

export async function listCrewPins(crewId: string): Promise<CrewPin[]> {
  if (!accountConfigured || !crewId) return [];
  try {
    const { data, error } = await callRpc("list_crew_pins", { p_crew_id: crewId });
    if (error || !Array.isArray(data)) return [];
    return data.flatMap((row) => {
      const parsed = crewPinSchema.safeParse(row);
      return parsed.success ? [parsed.data] : [];
    });
  } catch {
    return [];
  }
}

export async function dropCrewPin(input: {
  eventId: string;
  crewId: string;
  userId: string;
  displayName: string;
  pointId: string | null;
  x?: number | null | undefined;
  y?: number | null | undefined;
  lat?: number | null | undefined;
  lng?: number | null | undefined;
}): Promise<{ ok: true; pin: CrewPin } | { ok: false; error: string }> {
  const rx = roundVenueCoord(input.x);
  const ry = roundVenueCoord(input.y);
  const rlat = roundGpsCoord(input.lat, -90, 90);
  const rlng = roundGpsCoord(input.lng, -180, 180);

  let savedPin: CrewPin | null = null;

  if (accountConfigured) {
    // 1. Try the drop_pin RPC first (lowest latency, triggers DB broadcast on crew:{id}:pins)
    try {
      const { data, error } = await callRpc("drop_pin", {
        p_event_id: input.eventId,
        p_crew_id: input.crewId,
        p_point_id: input.pointId,
        p_x: rx,
        p_y: ry,
        p_lat: rlat,
        p_lng: rlng,
      });
      if (!error && data) {
        const parsed = crewPinSchema.safeParse(data);
        if (parsed.success) savedPin = parsed.data;
      }
    } catch {
      /* Fall through to Edge Function below if RPC is not applied yet. */
    }

    // 2. If RPC wasn't applied yet, try the drop-pin Edge Function
    if (!savedPin && typeof supabase.functions?.invoke === "function") {
      try {
        const { data, error } = await supabase.functions.invoke("drop-pin", {
          body: {
            action: "drop",
            eventId: input.eventId,
            crewId: input.crewId,
            pointId: input.pointId,
            x: rx,
            y: ry,
            lat: rlat,
            lng: rlng,
          },
        });
        if (
          !error &&
          data &&
          typeof data === "object" &&
          (data as Record<string, unknown>)["pin"]
        ) {
          const parsed = crewPinSchema.safeParse((data as Record<string, unknown>)["pin"]);
          if (parsed.success) savedPin = parsed.data;
        }
      } catch {
        /* Fall through to live broadcast pin below. */
      }
    }
  }

  // 3. Construct the pin record (60m expiry) and broadcast on crew:{id}:pins for immediate <1s cross-phone delivery
  const pinRecord: CrewPin = savedPin ?? {
    id: crypto.randomUUID(),
    eventId: input.eventId,
    crewId: input.crewId,
    userId: input.userId,
    displayName: input.displayName,
    pointId: input.pointId,
    x: rx,
    y: ry,
    lat: rlat,
    lng: rlng,
    createdAt: new Date().toISOString(),
    expiresAt: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
  };

  await broadcastCrewPinEvent(input.crewId, "pin:upserted", pinRecord);
  return { ok: true, pin: pinRecord };
}

export async function removeCrewPin(input: {
  crewId: string;
  userId: string;
  pointId?: string | null | undefined;
}): Promise<void> {
  if (accountConfigured) {
    try {
      await callRpc("remove_pin", { p_crew_id: input.crewId });
    } catch {
      /* Ignore if RPC not yet applied. */
    }
  }
  await broadcastCrewPinEvent(input.crewId, "pin:removed", {
    crewId: input.crewId,
    userId: input.userId,
    pointId: input.pointId ?? null,
  });
}

export async function broadcastCrewLostAlert(alert: CrewLostAlert): Promise<void> {
  await broadcastCrewPinEvent(alert.crewId, "crew:lost", alert);
  if (accountConfigured && typeof supabase.functions?.invoke === "function") {
    try {
      await supabase.functions.invoke("send-crew-push", { body: alert });
    } catch {
      /* Web push Edge Function is optional when Realtime channel is active. */
    }
  }
}

export async function broadcastCrewChatMessage(msg: CrewRealtimeChat): Promise<void> {
  await broadcastCrewPinEvent(msg.crewId, "crew:chat", msg);
}

export async function broadcastCrewUpdated(crewId: string, eventId: string): Promise<void> {
  await broadcastCrewPinEvent(crewId, "crew:updated", { crewId, eventId });
}

export type RealtimeChannelHandle = {
  on: (
    type: "broadcast",
    filter: { event: string },
    cb: (msg: { payload?: unknown }) => void,
  ) => unknown;
  subscribe: (cb?: (status: string) => void) => unknown;
  send?: (args: {
    type: "broadcast";
    event: string;
    payload: Record<string, unknown>;
  }) => Promise<unknown> | unknown;
};

export type RealtimeClientLike = {
  channel?: (
    topic: string,
    opts?: { config?: { private?: boolean; broadcast?: { self?: boolean } } },
  ) => RealtimeChannelHandle;
  removeChannel?: (channel: unknown) => unknown;
};

const activeChannels = new Map<string, RealtimeChannelHandle>();

export async function broadcastCrewPinEvent(
  crewId: string,
  event: "pin:upserted" | "pin:removed" | "crew:lost" | "crew:chat" | "crew:updated",
  payload: Record<string, unknown>,
): Promise<void> {
  if (!crewId) return;

  // 1. Broadcast over the active subscribed private Supabase Realtime channel for this crew
  const existing = activeChannels.get(crewId);
  if (existing && typeof existing.send === "function") {
    try {
      await existing.send({
        type: "broadcast",
        event,
        payload,
      });
    } catch {
      /* Non-fatal if Realtime websocket is reconnecting. */
    }
  } else if (accountConfigured && typeof supabase.channel === "function") {
    let ch: ReturnType<typeof supabase.channel> | null = null;
    try {
      const topic = crewPinChannelTopic(crewId);
      ch = supabase.channel(topic, { config: { private: true } });
      await ch.send({
        type: "broadcast",
        event,
        payload,
      });
    } catch {
      /* Non-fatal if Realtime websocket is reconnecting. */
    } finally {
      if (ch && typeof supabase.removeChannel === "function") {
        void supabase.removeChannel(ch);
      }
    }
  }
}

export function subscribeCrewPins(
  crewId: string,
  handlers: {
    onUpserted: (pin: CrewPin) => void;
    onRemoved: (removed: PinRemovedPayload) => void;
    onLostAlert?: (alert: CrewLostAlert) => void;
    onChatMessage?: (msg: CrewRealtimeChat) => void;
    onCrewUpdated?: () => void;
    onAnyChange?: () => void;
  },
  options?: { client?: RealtimeClientLike; configured?: boolean },
): () => void {
  const client = options?.client ?? (supabase as unknown as RealtimeClientLike);
  const configured = options?.configured ?? accountConfigured;
  if (!configured || !crewId || typeof client.channel !== "function") {
    return () => {};
  }

  let disposed = false;
  const topic = crewPinChannelTopic(crewId);
  const activeChannel = client.channel(topic, {
    config: { private: true, broadcast: { self: false } },
  });
  activeChannels.set(crewId, activeChannel);

  const attachListeners = (ch: RealtimeChannelHandle) => {
    ch.on("broadcast", { event: "pin:upserted" }, (msg: { payload?: unknown }) => {
      if (disposed) return;
      const parsed = crewPinSchema.safeParse(msg.payload);
      if (parsed.success) handlers.onUpserted(parsed.data);
      handlers.onAnyChange?.();
    });
    ch.on("broadcast", { event: "pin:removed" }, (msg: { payload?: unknown }) => {
      if (disposed) return;
      const parsed = pinRemovedSchema.safeParse(msg.payload);
      if (parsed.success) handlers.onRemoved(parsed.data);
      handlers.onAnyChange?.();
    });
    ch.on("broadcast", { event: "crew:lost" }, (msg: { payload?: unknown }) => {
      if (disposed) return;
      const parsed = crewLostAlertSchema.safeParse(msg.payload);
      if (parsed.success) {
        handlers.onLostAlert?.(parsed.data);
        void triggerCrewPushNotification(
          `${parsed.data.authorName} is looking for you`,
          parsed.data.message,
        );
      }
      handlers.onAnyChange?.();
    });
    ch.on("broadcast", { event: "crew:chat" }, (msg: { payload?: unknown }) => {
      if (disposed) return;
      const parsed = crewRealtimeChatSchema.safeParse(msg.payload);
      if (parsed.success) handlers.onChatMessage?.(parsed.data);
      handlers.onAnyChange?.();
    });
    ch.on("broadcast", { event: "crew:updated" }, () => {
      if (disposed) return;
      handlers.onCrewUpdated?.();
      handlers.onAnyChange?.();
    });
    return ch;
  };

  // Never downgrade a private crew channel to an unauthenticated public channel on CHANNEL_ERROR.
  attachListeners(activeChannel).subscribe();

  return () => {
    disposed = true;
    if (activeChannels.get(crewId) === activeChannel) {
      activeChannels.delete(crewId);
    }
    if (typeof client.removeChannel === "function") {
      void client.removeChannel(activeChannel);
    }
  };
}
