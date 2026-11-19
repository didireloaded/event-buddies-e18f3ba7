import { CalendarCheck2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { suggestDayPlan } from "@/lib/day-plan/day-plan.functions";
import { getEventCategoryTerms } from "@/lib/intelligence/event-intelligence";
import { useCompanion } from "./context";

export function DayPlanPanel() {
  const { attendee, data } = useCompanion();
  const { preferences, ready } = attendee;
  const terms = getEventCategoryTerms(data?.event?.category);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const request = useRef<AbortController | null>(null);
  useEffect(() => () => request.current?.abort(), []);
  const plan = preferences.dayPlan;
  const empty = !preferences.savedArtists.length && !preferences.meeting;
  async function suggest() {
    if (request.current || !ready || empty) return;
    const controller = new AbortController();
    request.current = controller;
    setBusy(true);
    setError("");
    try {
      const result = await suggestDayPlan({
        signal: AbortSignal.any([controller.signal, AbortSignal.timeout(12000)]),
        data: {
          ...(data?.event?.id ? { eventId: data.event.id } : {}),
          savedArtistIds: preferences.savedArtists,
          meeting: preferences.meeting,
        },
      });
      if (controller.signal.aborted) return;
      if (!result.ok) setError(result.error);
      else if (!attendee.update({ dayPlan: result.plan }))
        setError("Couldn’t save the suggested plan on this device. Free storage and try again.");
    } catch {
      if (!controller.signal.aborted)
        setError("Couldn’t reach the planning service. Check your connection and retry.");
    } finally {
      if (!controller.signal.aborted) {
        request.current = null;
        setBusy(false);
      }
    }
  }
  return (
    <section
      className="ios-card mx-4 mt-3 space-y-2.5 px-4 py-3.5"
      aria-labelledby="day-plan-heading"
      aria-busy={busy}
    >
      <div className="flex items-start gap-2.5">
        <span
          aria-hidden
          className="mt-0.5 grid size-9 flex-none place-items-center rounded-xl bg-favorite-soft text-primary"
        >
          <CalendarCheck2 size={18} />
        </span>
        <div className="min-w-0 flex-1">
          <h2 id="day-plan-heading" className="text-[16px] font-semibold leading-tight">
            Your day plan
          </h2>
          <p className="mt-0.5 text-[13px] leading-snug text-muted-foreground">
            {empty
              ? `Save ${terms.isConferenceLike ? "a speaker" : "an artist"} using a heart below, or pick a meeting in Crew.`
              : "Suggested plans stay on this device."}
          </p>
        </div>
      </div>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <button
          type="button"
          className="ios-press inline-flex min-h-11 items-center rounded-full bg-favorite-soft px-4 text-[14px] font-semibold text-primary disabled:opacity-45"
          disabled={!ready || empty || busy}
          onClick={() => void suggest()}
        >
          {busy ? "Suggesting your day…" : "Suggest my day plan"}
        </button>
        {empty && (
          <p className="text-[12px] text-muted-foreground">Suggested plans stay on this device.</p>
        )}
      </div>
      {busy && (
        <p role="status" className="mt-2 text-[14px] text-muted-foreground">
          Checking your favourites and meeting time…
        </p>
      )}
      {error && (
        <div role="alert" className="mt-2 text-[14px] text-destructive">
          <p>{error}</p>
          <button
            type="button"
            className="min-h-11 font-semibold text-primary"
            disabled={busy || empty}
            onClick={() => void suggest()}
          >
            Retry day plan
          </button>
        </div>
      )}
      {plan && (
        <div aria-live="polite" className="mt-3 border-t border-separator pt-3">
          <p className="text-[15px] font-medium">{plan.summary}</p>
          <ol className="mt-2 divide-y divide-border">
            {plan.items.map((item, index) => (
              <li key={`${item.kind}-${index}`} className="py-2.5">
                <p className="text-[13px] font-semibold text-primary">{item.time}</p>
                <p className="text-[16px] font-semibold">{item.title}</p>
                {item.place && <p className="text-[14px] text-muted-foreground">{item.place}</p>}
                <p className="text-[14px] text-muted-foreground">{item.detail}</p>
              </li>
            ))}
          </ol>
          <div className="mt-2 flex items-center justify-between gap-2">
            <p className="text-[13px] text-muted-foreground">{plan.note}</p>
            <button
              type="button"
              disabled={!ready}
              className="min-h-11 flex-none text-[14px] font-semibold text-primary"
              onClick={() => {
                request.current?.abort();
                request.current = null;
                setBusy(false);
                setError("");
                attendee.update({ dayPlan: null });
              }}
            >
              Clear plan
            </button>
          </div>
        </div>
      )}
    </section>
  );
}
