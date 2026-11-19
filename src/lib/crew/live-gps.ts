import { roundGpsCoord } from "./pins";

export type LiveLocationDuration = "15m" | "60m" | "until_end";

export type LiveLocationStatus =
  | "off"
  | "starting"
  | "live"
  | "paused_background"
  | "outdated"
  | "permission_denied"
  | "unavailable";

export type LiveGpsPosition = {
  lat: number;
  lng: number;
  accuracyMeters: number;
  capturedAt: number;
  sessionId: string;
  expiresAt: number;
};

export const STALE_AFTER_MS = 2 * 60 * 1000; // 2 minutes
export const LOW_ACCURACY_THRESHOLD_METERS = 50;
export const MIN_PUBLISH_INTERVAL_MS = 12 * 1000; // Adaptive throttle (~12s minimum)

export function computeLiveShareExpiry(
  duration: LiveLocationDuration,
  eventEndAt: Date,
  nowMs = Date.now(),
): number {
  const hardEnd = +eventEndAt;
  if (duration === "15m")
    return Math.min(nowMs + 15 * 60 * 1000, Math.max(nowMs + 15 * 60 * 1000, hardEnd));
  if (duration === "60m")
    return Math.min(nowMs + 60 * 60 * 1000, Math.max(nowMs + 60 * 60 * 1000, hardEnd));
  return Math.max(nowMs + 15 * 60 * 1000, hardEnd);
}

/** Rough Haversine distance in metres for adaptive movement throttling. */
export function distanceMeters(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6_371_000;
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export function classifyPositionFreshness(
  capturedAt: number | null,
  status: LiveLocationStatus,
  nowMs = Date.now(),
): {
  label: string;
  isStale: boolean;
} {
  if (status === "off") return { label: "Location private", isStale: false };
  if (status === "permission_denied") return { label: "Location permission denied", isStale: true };
  if (status === "unavailable") return { label: "Location unavailable", isStale: true };
  if (status === "paused_background") {
    return { label: "Sharing paused while backgrounded", isStale: true };
  }
  if (!capturedAt) return { label: "Checking GPS…", isStale: false };
  const age = nowMs - capturedAt;
  if (age > STALE_AFTER_MS) {
    return { label: "Location outdated", isStale: true };
  }
  if (age > 45_000) {
    return { label: "Last seen recently", isStale: false };
  }
  return { label: "Live", isStale: false };
}

export function formatAccuracyBadge(accuracyMeters: number | null | undefined): string {
  if (typeof accuracyMeters !== "number" || !Number.isFinite(accuracyMeters)) return "";
  const rounded = Math.max(1, Math.round(accuracyMeters));
  if (rounded > LOW_ACCURACY_THRESHOLD_METERS) {
    return `Approximate (~${rounded}m)`;
  }
  return `±${rounded}m`;
}

/**
 * Starts an opt-in, active-session geolocation watcher (`watchPosition`).
 * - Filters invalid / extreme outlier callbacks (accuracy > 250m)
 * - Throttles transmissions (>= 12s or > 10m movement)
 * - Pauses status cleanly when `document.visibilityState !== "visible"` (honest PWA boundary)
 * - Auto-revokes at `expiresAt` or immediately on `stop()` (Ghost Mode)
 */
export function startActiveLiveGps(options: {
  expiresAt: number;
  sessionId: string;
  onPosition: (pos: LiveGpsPosition) => void;
  onStatusChange: (status: LiveLocationStatus, error?: string) => void;
  onExpired: () => void;
}): () => void {
  if (typeof navigator === "undefined" || !("geolocation" in navigator)) {
    options.onStatusChange(
      "unavailable",
      "GPS isn’t supported on this browser. Use a landmark pin instead.",
    );
    return () => {};
  }

  let stopped = false;
  let lastSentAt = 0;
  let lastLat: number | null = null;
  let lastLng: number | null = null;
  let watchId: number | null = null;

  options.onStatusChange("starting");

  const stopAll = () => {
    if (stopped) return;
    stopped = true;
    if (watchId !== null) {
      try {
        navigator.geolocation.clearWatch(watchId);
      } catch {
        /* Ignore cleanup errors. */
      }
      watchId = null;
    }
    if (typeof document !== "undefined") {
      document.removeEventListener("visibilitychange", onVisibility);
    }
    clearInterval(expiryTimer);
  };

  const onVisibility = () => {
    if (stopped) return;
    if (typeof document !== "undefined" && document.visibilityState === "hidden") {
      options.onStatusChange("paused_background");
    } else if (Date.now() < options.expiresAt) {
      options.onStatusChange("live");
    }
  };

  if (typeof document !== "undefined") {
    document.addEventListener("visibilitychange", onVisibility);
  }

  const expiryTimer = setInterval(() => {
    if (stopped) return;
    if (Date.now() >= options.expiresAt) {
      stopAll();
      options.onStatusChange("off");
      options.onExpired();
    }
  }, 5000);

  watchId = navigator.geolocation.watchPosition(
    (raw) => {
      if (stopped) return;
      const nowMs = Date.now();
      if (nowMs >= options.expiresAt) {
        stopAll();
        options.onStatusChange("off");
        options.onExpired();
        return;
      }
      const lat = roundGpsCoord(raw.coords.latitude, -90, 90);
      const lng = roundGpsCoord(raw.coords.longitude, -180, 180);
      const accuracy = Math.round(raw.coords.accuracy ?? 999);
      if (lat === null || lng === null || accuracy > 250) {
        // Ignore obvious outliers / unusable coarse cell-tower jumps
        return;
      }

      const moved =
        lastLat !== null && lastLng !== null
          ? distanceMeters(lastLat, lastLng, lat, lng)
          : Infinity;
      if (nowMs - lastSentAt < MIN_PUBLISH_INTERVAL_MS && moved < 10) {
        return;
      }

      lastSentAt = nowMs;
      lastLat = lat;
      lastLng = lng;
      options.onStatusChange(
        typeof document !== "undefined" && document.visibilityState === "hidden"
          ? "paused_background"
          : "live",
      );
      options.onPosition({
        lat,
        lng,
        accuracyMeters: accuracy,
        capturedAt: nowMs,
        sessionId: options.sessionId,
        expiresAt: options.expiresAt,
      });
    },
    (err) => {
      if (stopped) return;
      if (err.code === 1) {
        stopAll();
        options.onStatusChange(
          "permission_denied",
          "Location permission was denied. You can still share a venue landmark.",
        );
      } else {
        options.onStatusChange(
          "unavailable",
          "GPS signal is weak or unavailable right now. Landmark sharing still works.",
        );
      }
    },
    {
      enableHighAccuracy: true,
      timeout: 15_000,
      maximumAge: 10_000,
    },
  );

  return stopAll;
}
