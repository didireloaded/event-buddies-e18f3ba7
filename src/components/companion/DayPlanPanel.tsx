import { useEffect, useRef, useState } from "react";
import { suggestDayPlan } from "@/lib/day-plan/day-plan.functions";
import { buildPlanFacts } from "@/lib/day-plan/schema";
import { useCompanion } from "./context";

export function DayPlanPanel() {
  const { attendee, data } = useCompanion();
  const { preferences, ready } = attendee;
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
      const eventContext = data
        ? (() => {
            const built = buildPlanFacts(data, {
              savedArtistIds: preferences.savedArtists,
              meeting: preferences.meeting,
            });
            return {
              eventId: data.event.id,
              eventName: data.event.name,
              category: data.event.category,
              venue: built.event.venue,
              gatesOpen: built.event.gatesOpen,
              ends: built.event.ends,
              entry: data.festival.rules[0] ?? built.event.entry,
              stages: built.stages,
              setTimesPublished: built.setTimesPublished,
              savedArtists: built.savedArtists,
              meeting: built.meeting,
            };
          })()
        : undefined;
      const result = await suggestDayPlan({
        signal: AbortSignal.any([controller.signal, AbortSignal.timeout(12000)]),
        data: {
          savedArtistIds: preferences.savedArtists,
          meeting: preferences.meeting,
          ...(eventContext ? { eventContext } : {}),
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
      className="mx-4 mt-4 border-y border-border py-4"
      aria-labelledby="day-plan-heading"
      aria-busy={busy}
    >
      <h2 id="day-plan-heading" className="text-[20px] font-semibold">
        Your day plan
      </h2>
      {empty && (
        <p className="mt-1 text-[15px] text-muted-foreground">
          Save an artist using a heart below, or choose a meeting time in Crew.
        </p>
      )}
      <button
        type="button"
        className="min-h-11 text-left font-semibold text-primary disabled:opacity-50"
        disabled={!ready || empty || busy}
        onClick={() => void suggest()}
      >
        {busy ? "Suggesting your day…" : "Suggest my day plan"}
      </button>
      {busy && (
        <p role="status" className="text-[15px] text-muted-foreground">
          Checking your favourites and meeting time…
        </p>
      )}
      {error && (
        <div role="alert" className="text-[15px]">
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
        <div aria-live="polite">
          <p className="mt-2 text-[15px]">{plan.summary}</p>
          <ol className="mt-2 divide-y divide-border">
            {plan.items.map((item, index) => (
              <li key={`${item.kind}-${index}`} className="py-3">
                <p className="text-[15px] font-semibold">{item.time}</p>
                <p className="font-semibold">{item.title}</p>
                {item.place && <p className="text-[15px] text-muted-foreground">{item.place}</p>}
                <p className="text-[15px] text-muted-foreground">{item.detail}</p>
              </li>
            ))}
          </ol>
          <p className="text-[15px] text-muted-foreground">{plan.note}</p>
          <button
            type="button"
            disabled={!ready}
            className="min-h-11 font-semibold text-primary"
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
      )}
      <p className="mt-1 text-[14px] text-muted-foreground">
        Suggested plans stay on this device. Review your plan here. Set times drop closer to
        festival day.
      </p>
    </section>
  );
}
