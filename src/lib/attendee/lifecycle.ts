import type { DemoData } from "@/lib/event/types";

const HOUR = 3600000;
const DAY = 24 * HOUR;
export type EventPhase =
  "upcoming" | "live" | "afterglow" | "recap" | "archive" | "dormant" | "cancelled";
export type LandmarkPin = { pointId: string; expiresAt: number };

export function eventLifecycle(data: DemoData, now: number | null) {
  if (data.event.dateConfirmed === false) {
    const base = now ?? Date.now();
    const endsAt = base + 30 * DAY;
    return {
      phase: (data.event.status === "cancelled" ? "cancelled" : "upcoming") as EventPhase,
      endsAt,
      recapAt: endsAt + DAY,
      pinsEndAt: base + 12 * HOUR,
      archiveAt: endsAt + 7 * DAY,
      dormantAt: endsAt + 30 * DAY,
    };
  }
  const setEnds = data.performances
    .filter((set) => set.status !== "cancelled")
    .map((set) => +new Date(set.scheduledEnd))
    .filter(Number.isFinite);
  const endsAt = Math.max(+new Date(data.event.endAt), ...setEnds);
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: data.event.timezone,
    year: "numeric",
    month: "numeric",
    day: "numeric",
  }).formatToParts(new Date(endsAt));
  const part = (name: string) => Number(parts.find((value) => value.type === name)!.value);
  // This event is in Namibia: next-day 10:00 CAT is 08:00 UTC, without DST.
  const recapAt = Date.UTC(part("year"), part("month") - 1, part("day") + 1, 8);
  const pinsEndAt = endsAt + 2 * HOUR;
  const archiveAt = endsAt + 7 * DAY;
  const dormantAt = endsAt + 30 * DAY;
  let phase: EventPhase = "upcoming";
  if (data.event.status === "cancelled") phase = "cancelled";
  else if (now !== null) {
    if (now >= dormantAt) phase = "dormant";
    else if (now >= archiveAt) phase = "archive";
    else if (now >= recapAt) phase = "recap";
    else if (now >= endsAt) phase = "afterglow";
    else if (now >= +new Date(data.event.startAt)) phase = "live";
  }
  return { phase, endsAt, recapAt, pinsEndAt, archiveAt, dormantAt };
}

export function activeLandmarkPin(data: DemoData, pin: LandmarkPin | null, now: number | null) {
  if (!pin || now === null) return null;
  const lifecycle = eventLifecycle(data, now);
  if (lifecycle.phase === "cancelled" || now >= Math.min(pin.expiresAt, lifecycle.pinsEndAt))
    return null;
  return { ...pin, expiresAt: Math.min(pin.expiresAt, lifecycle.pinsEndAt) };
}

export function landmarkPinExpiry(data: DemoData, now: number) {
  return Math.min(now + HOUR, eventLifecycle(data, now).pinsEndAt);
}
