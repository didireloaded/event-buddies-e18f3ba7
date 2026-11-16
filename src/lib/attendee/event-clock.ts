import { useEffect, useState } from "react";
import type { DemoData } from "@/lib/event/types";

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
  if (now >= +new Date(data.event.endAt)) return { label: "Event finished", live: false };
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
