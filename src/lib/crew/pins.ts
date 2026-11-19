import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { accountConfigured } from "@/lib/account/use-auth";

type UntypedRpc = (
  fn: string,
  args?: Record<string, unknown>,
) => Promise<{ data: unknown; error: { message: string; code?: string } | null }>;

type InvokeEdgeFn = (
  fn: string,
  opts: { body: Record<string, unknown> },
) => Promise<{ data: unknown; error: { message?: string } | null }>;

const callRpc: UntypedRpc = (fn, args) => (supabase.rpc as unknown as UntypedRpc)(fn, args);

function isRpcSignatureMismatch(error: { message?: string; code?: string } | null | undefined) {
  if (!error) return false;
  if (error.code === "PGRST202") return true;
  const msg = (error.message ?? "").toLowerCase();
  return msg.includes("could not find the function") || msg.includes("pgrst202");
}

function clampDurationMinutes(value: number | null | undefined): number {
  if (typeof value !== "number" || !Number.isFinite(value)) return 60;
  return Math.max(1, Math.min(720, Math.round(value)));
}

function roundAccuracyMeters(value: number | null | undefined): number | null {
  if (typeof value !== "number" || !Number.isFinite(value) || value < 0 || value > 5000) {
    return null;
  }
  return Math.round(value * 10) / 10;
}

function didServerHonorExpiry(
  savedExpiresAt: string,
  requestedExpiresAtIso: string | null,
  usedLegacySignature: boolean,
): boolean {
  if (!requestedExpiresAtIso) return !usedLegacySignature;
  const savedMs = Date.parse(savedExpiresAt);
  const reqMs = Date.parse(requestedExpiresAtIso);
  if (!Number.isFinite(savedMs) || !Number.isFinite(reqMs)) return false;
  // Server may clamp earlier (e.g. event end), which is stricter/safe; warn if it extends > 3m past requested deadline.
  return savedMs <= reqMs + 3 * 60 * 1000;
}

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
  accuracyMeters: z.number().nullable().optional(),
  sessionId: z.string().nullable().optional(),
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

export type DropPinResult =
  | { ok: true; persisted: boolean; pin: CrewPin; expiryEnforcedByServer: boolean }
  | { ok: false; persisted: false; error: string };

export type RemovePinResult =
  { ok: true; confirmed: true } | { ok: false; confirmed: false; error: string };

export async function dropCrewPin(
  input: {
    eventId: string;
    crewId: string;
    userId: string;
    displayName: string;
    pointId: string | null;
    x?: number | null | undefined;
    y?: number | null | undefined;
    lat?: number | null | undefined;
    lng?: number | null | undefined;
    durationMinutes?: number | null | undefined;
    expiresAt?: string | null | undefined;
    accuracyMeters?: number | null | undefined;
    sessionId?: string | null | undefined;
  },
  options?: {
    configured?: boolean;
    rpc?: UntypedRpc;
    invokeEdge?: InvokeEdgeFn;
  },
): Promise<DropPinResult> {
  const rx = roundVenueCoord(input.x);
  const ry = roundVenueCoord(input.y);
  const rlat = roundGpsCoord(input.lat, -90, 90);
  const rlng = roundGpsCoord(input.lng, -180, 180);
  const durationMinutes = clampDurationMinutes(input.durationMinutes);
  const requestedExpiresAt =
    input.expiresAt && Number.isFinite(Date.parse(input.expiresAt))
      ? new Date(Date.parse(input.expiresAt)).toISOString()
      : new Date(Date.now() + durationMinutes * 60 * 1000).toISOString();
  const accuracyMeters = roundAccuracyMeters(input.accuracyMeters);
  const sessionId =
    input.sessionId &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(input.sessionId)
      ? input.sessionId
      : null;

  const isConfigured = options?.configured ?? accountConfigured;

  if (isConfigured) {
    const rpcFn = options?.rpc ?? callRpc;
    const edgeFn: InvokeEdgeFn | null =
      options?.invokeEdge ??
      (typeof supabase.functions?.invoke === "function"
        ? (fn, opts) =>
            supabase.functions.invoke(fn, opts) as Promise<{
              data: unknown;
              error: { message?: string } | null;
            }>
        : null);
    let savedPin: CrewPin | null = null;
    let usedLegacySignature = false;
    let lastError = "";

    // 1. Try authoritative drop_pin RPC with server-enforced expiry parameters first
    try {
      const { data, error } = await rpcFn("drop_pin", {
        p_event_id: input.eventId,
        p_crew_id: input.crewId,
        p_point_id: input.pointId,
        p_x: rx,
        p_y: ry,
        p_lat: rlat,
        p_lng: rlng,
        p_duration_minutes: durationMinutes,
        p_expires_at: requestedExpiresAt,
        p_accuracy_m: accuracyMeters,
        p_session_id: sessionId,
      });
      if (!error && data) {
        const parsed = crewPinSchema.safeParse(data);
        if (parsed.success) savedPin = parsed.data;
        else lastError = "The server returned an unreadable location confirmation.";
      } else if (isRpcSignatureMismatch(error)) {
        // Legacy 7-arg RPC still deployed in Cloud — retry cleanly and flag expiryEnforcedByServer accurately.
        usedLegacySignature = true;
        const legacy = await rpcFn("drop_pin", {
          p_event_id: input.eventId,
          p_crew_id: input.crewId,
          p_point_id: input.pointId,
          p_x: rx,
          p_y: ry,
          p_lat: rlat,
          p_lng: rlng,
        });
        if (!legacy.error && legacy.data) {
          const parsed = crewPinSchema.safeParse(legacy.data);
          if (parsed.success) savedPin = parsed.data;
          else lastError = "The server returned an unreadable location confirmation.";
        } else if (legacy.error?.message) {
          lastError = legacy.error.message;
        }
      } else if (error?.message) {
        lastError = error.message;
      }
    } catch (err) {
      lastError = err instanceof Error ? err.message : "Network error reaching crew service.";
    }

    // 2. Fallback to the drop-pin Edge Function if RPC failed
    if (!savedPin && edgeFn) {
      try {
        const { data, error } = await edgeFn("drop-pin", {
          body: {
            action: "drop",
            eventId: input.eventId,
            crewId: input.crewId,
            pointId: input.pointId,
            x: rx,
            y: ry,
            lat: rlat,
            lng: rlng,
            durationMinutes,
            expiresAt: requestedExpiresAt,
            accuracyMeters,
            sessionId,
          },
        });
        if (
          !error &&
          data &&
          typeof data === "object" &&
          (data as Record<string, unknown>)["pin"]
        ) {
          const rec = data as Record<string, unknown>;
          const parsed = crewPinSchema.safeParse(rec["pin"]);
          if (parsed.success) {
            savedPin = parsed.data;
            if (rec["expiryEnforcedByServer"] === false) {
              usedLegacySignature = true;
            }
          }
        } else if (error?.message) {
          lastError = error.message;
        }
      } catch (err) {
        lastError = err instanceof Error ? err.message : "Network error reaching crew service.";
      }
    }

    // P0: Never fabricate or broadcast an unacknowledged pin when server persistence failed.
    if (!savedPin) {
      const friendly = /closed/i.test(lastError)
        ? "Location sharing has closed for this event."
        : /membership|sign in/i.test(lastError)
          ? "Sign in and join this crew before sharing your location."
          : "Couldn’t confirm your location with the server. Your crew wasn’t updated.";
      return { ok: false, persisted: false, error: friendly };
    }

    const expiryEnforcedByServer = didServerHonorExpiry(
      savedPin.expiresAt,
      requestedExpiresAt,
      usedLegacySignature,
    );

    await broadcastCrewPinEvent(input.crewId, "pin:upserted", savedPin);
    return { ok: true, persisted: true, pin: savedPin, expiryEnforcedByServer };
  }

  // Unconfigured / local-only preview mode (honestly reports persisted: false)
  const localPin: CrewPin = {
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
    accuracyMeters,
    sessionId,
    createdAt: new Date().toISOString(),
    expiresAt: requestedExpiresAt,
  };

  await broadcastCrewPinEvent(input.crewId, "pin:upserted", localPin);
  return { ok: true, persisted: false, pin: localPin, expiryEnforcedByServer: false };
}

export async function removeCrewPin(
  input: {
    crewId: string;
    userId: string;
    pointId?: string | null | undefined;
  },
  options?: {
    configured?: boolean;
    rpc?: UntypedRpc;
    invokeEdge?: InvokeEdgeFn;
  },
): Promise<RemovePinResult> {
  const isConfigured = options?.configured ?? accountConfigured;

  if (isConfigured) {
    const rpcFn = options?.rpc ?? callRpc;
    const edgeFn: InvokeEdgeFn | null =
      options?.invokeEdge ??
      (typeof supabase.functions?.invoke === "function"
        ? (fn, opts) =>
            supabase.functions.invoke(fn, opts) as Promise<{
              data: unknown;
              error: { message?: string } | null;
            }>
        : null);
    let confirmed = false;
    try {
      const { data, error } = await rpcFn("remove_pin", { p_crew_id: input.crewId });
      const dataRejected =
        data && typeof data === "object" && (data as Record<string, unknown>)["ok"] === false;
      if (!error && !dataRejected) {
        confirmed = true;
      }
    } catch {
      /* Fall through to Edge Function below. */
    }

    if (!confirmed && edgeFn) {
      try {
        const { data, error } = await edgeFn("drop-pin", {
          body: { action: "remove", crewId: input.crewId },
        });
        if (
          !error &&
          data &&
          typeof data === "object" &&
          (data as Record<string, unknown>)["ok"] === true
        ) {
          confirmed = true;
        }
      } catch {
        /* Still unconfirmed. */
      }
    }

    // P0: Never swallow DB errors or broadcast fake removal when server revocation failed.
    if (!confirmed) {
      return {
        ok: false,
        confirmed: false,
        error:
          "GPS stopped on this device, but remote removal couldn’t be confirmed with the server. Retry when connected.",
      };
    }
  }

  await broadcastCrewPinEvent(input.crewId, "pin:removed", {
    crewId: input.crewId,
    userId: input.userId,
    pointId: input.pointId ?? null,
  });
  return { ok: true, confirmed: true };
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
