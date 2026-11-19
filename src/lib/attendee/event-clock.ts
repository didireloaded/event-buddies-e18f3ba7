import { useEffect, useState } from "react";
import type { DemoData, EventRecord } from "@/lib/event/types";
import { eventLifecycle } from "./lifecycle";
import { eventTime } from "./schedule";

export function countdownLabel(meetingAt: string, now: number | null) {
  if (now === null) return "Meeting time";
  const remaining = Math.ceil((Date.parse(meetingAt) - now) / 60000);
  if (remaining <= 0) return "Your meeting time has arrived";
  if (remaining >= 1440) {
    const days = Math.floor(remaining / 1440);
    return `${days} ${days === 1 ? "day" : "days"} to go`;
  }
  return `${Math.floor(remaining / 60)}h ${remaining % 60}m to go`;
}

export function useEventClock(intervalMs = 60000) {
  const [now, setNow] = useState<number | null>(null);
  useEffect(() => {
    const tick = () => setNow(Date.now());
    const frame = requestAnimationFrame(tick);
    let interval: ReturnType<typeof setInterval> | undefined;
    const sync = () => {
      clearInterval(interval);
      if (document.visibilityState === "visible") {
        tick();
        interval = setInterval(tick, intervalMs);
      }
    };
    sync();
    document.addEventListener("visibilitychange", sync);
    window.addEventListener("focus", tick);
    return () => {
      cancelAnimationFrame(frame);
      clearInterval(interval);
      window.removeEventListener("focus", tick);
      document.removeEventListener("visibilitychange", sync);
    };
  }, [intervalMs]);
  return now;
}

export function eventPhase(data: DemoData, now: number | null) {
  const lifecycle = eventLifecycle(data, now);
  if (lifecycle.phase === "cancelled") return { label: "Event cancelled", live: false };
  if (data.event.dateConfirmed === false) return { label: "Date TBC", live: false };
  if (now === null) return { label: "Upcoming event", live: false };
  if (now < +new Date(data.event.startAt)) {
    const minutes = Math.ceil((+new Date(data.event.startAt) - now) / 60000);
    return {
      label:
        minutes >= 1440
          ? `Opens in ${Math.floor(minutes / 1440)} days`
          : minutes >= 60
            ? `Opens in ${Math.floor(minutes / 60)}h ${minutes % 60}m`
            : `Opens in ${minutes} min`,
      live: false,
    };
  }
  if (now >= lifecycle.endsAt) return { label: "Event finished", live: false };
  return { label: "Event is on", live: true };
}

export function dateLabel(
  value: Date | string,
  timezone: string,
  options: Intl.DateTimeFormatOptions = { day: "numeric", month: "long" },
) {
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: timezone,
    ...options,
  }).format(new Date(value));
}

export function formatEventDate(
  event: Pick<EventRecord, "startAt" | "timezone" | "dateConfirmed">,
  options: Intl.DateTimeFormatOptions = { day: "numeric", month: "long", year: "numeric" },
): string {
  if (event.dateConfirmed === false) return "Date TBC";
  return dateLabel(event.startAt, event.timezone, options);
}

export function formatEventHours(
  event: Pick<EventRecord, "startAt" | "endAt" | "dateConfirmed" | "gatesConfirmed">,
): string {
  if (event.dateConfirmed === false || event.gatesConfirmed === false) return "Hours TBC";
  return `${eventTime(event.startAt)}–${eventTime(event.endAt)} CAT`;
}
