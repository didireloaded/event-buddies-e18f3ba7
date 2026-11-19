import { useState } from "react";
import { ArrowUpRight, Bus, ClipboardCheck, HelpCircle, ShieldCheck, Ticket } from "lucide-react";
import { dateLabel } from "@/lib/attendee/event-clock";
import { eventTime } from "@/lib/attendee/schedule";
import { getTicketProviderName } from "@/lib/attendee/tickets";
import { getEventCategoryTerms } from "@/lib/intelligence/event-intelligence";
import { useCompanion } from "./context";
import { EventSections } from "./EventSections";
import { PreparationChecklist } from "./PreparationChecklist";
import { RideBookmark } from "./RideBookmark";
import { SafetyPanel } from "./SafetyAccess";

type EssentialOption = "entry" | "transport" | "safety";

export function InfoView() {
  const { data, showOnMap, openSheet } = useCompanion();
  const [selected, setSelected] = useState<EssentialOption>("entry");
  const terms = getEventCategoryTerms(data.event.category);
  const ticketUrl = data.event.ticketUrl || data.festival.ticketUrl;
  const provider = getTicketProviderName(ticketUrl);

  return (
    <div className="px-4 pb-6">
      <h1 className="ios-large-title pt-2">Essentials</h1>
      <div className="-mx-4">
        <EventSections />
      </div>
      <p className="mt-2 text-[15px] text-muted-foreground">
        {data.event.venueName} · {data.event.city} · {eventTime(data.event.startAt)}–
        {eventTime(data.event.endAt)} CAT
      </p>

      {/* Exactly 4 clear visual options (Attendee Redesign #6) */}
      <div
        className="mt-4 grid grid-cols-2 gap-2.5"
        role="group"
        aria-label="Event essentials options"
      >
        <button
          type="button"
          aria-pressed={selected === "entry"}
          onClick={() => setSelected("entry")}
          className={`ios-press flex flex-col items-start rounded-2xl p-4 text-left ring-1 ${
            selected === "entry"
              ? "bg-favorite-soft text-foreground ring-primary"
              : "bg-popover text-foreground ring-border/70"
          }`}
        >
          <ClipboardCheck size={22} className="text-primary" aria-hidden />
          <span className="mt-3 text-[16px] font-semibold">{terms.entryRulesLabel}</span>
          <span className="mt-0.5 text-[13px] text-muted-foreground">
            ID, rules &amp; checklist
          </span>
        </button>

        <button
          type="button"
          aria-pressed={selected === "transport"}
          onClick={() => setSelected("transport")}
          className={`ios-press flex flex-col items-start rounded-2xl p-4 text-left ring-1 ${
            selected === "transport"
              ? "bg-favorite-soft text-foreground ring-primary"
              : "bg-popover text-foreground ring-border/70"
          }`}
        >
          <Bus size={22} className="text-primary" aria-hidden />
          <span className="mt-3 text-[16px] font-semibold">Transport &amp; Parking</span>
          <span className="mt-0.5 text-[13px] text-muted-foreground">
            Directions &amp; ride spot
          </span>
        </button>

        <button
          type="button"
          aria-pressed={selected === "safety"}
          onClick={() => setSelected("safety")}
          className={`ios-press flex flex-col items-start rounded-2xl p-4 text-left ring-1 ${
            selected === "safety"
              ? "bg-favorite-soft text-foreground ring-primary"
              : "bg-popover text-foreground ring-border/70"
          }`}
        >
          <ShieldCheck size={22} className="text-primary" aria-hidden />
          <span className="mt-3 text-[16px] font-semibold">Safety &amp; Support</span>
          <span className="mt-0.5 text-[13px] text-muted-foreground">
            Medics, exits &amp; ICE card
          </span>
        </button>

        <button
          type="button"
          onClick={() => openSheet({ kind: "assistant" })}
          className="ios-press flex flex-col items-start rounded-2xl bg-popover p-4 text-left text-foreground ring-1 ring-border/70"
        >
          <HelpCircle size={22} className="text-primary" aria-hidden />
          <span className="mt-3 text-[16px] font-semibold">
            {terms.isConferenceLike ? "Ask about this event" : "Ask about the festival"}
          </span>
          <span className="mt-0.5 text-[13px] text-muted-foreground">Verified event answers</span>
        </button>
      </div>

      {/* Focused scannable detail panel for the chosen Essentials option */}
      <div className="mt-5">
        {selected === "entry" && (
          <div className="space-y-4">
            <div className="ios-card p-4">
              <h2 className="text-[17px] font-semibold">{terms.entryRulesLabel}</h2>
              <ul className="mt-2 list-disc space-y-2 pl-5 text-[15px] leading-relaxed">
                {data.festival.rules.map((rule) => (
                  <li key={rule}>{rule}</li>
                ))}
              </ul>
            </div>
            <PreparationChecklist />
            <div className="flex flex-wrap gap-2">
              {(
                [
                  { filter: "entrance", label: "Gates" },
                  { filter: "toilet", label: "Toilets" },
                  { filter: "first-aid", label: "Medics" },
                  { filter: "food", label: "Food" },
                ] as const
              ).map(({ filter, label }) => (
                <button
                  key={filter}
                  type="button"
                  className="ios-chip"
                  onClick={() => showOnMap(filter)}
                >
                  {label} ↗
                </button>
              ))}
            </div>
          </div>
        )}

        {selected === "transport" && (
          <div className="space-y-4">
            <div className="ios-card space-y-3 p-4">
              <h2 className="text-[17px] font-semibold">Transport &amp; Parking</h2>
              <p className="text-[15px] leading-relaxed">{data.festival.transport}</p>
              <a
                href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${data.event.venueName} ${data.event.city} ${data.event.country}`)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex min-h-11 items-center gap-1 text-[15px] font-semibold text-primary"
              >
                Open {data.event.venueName} in Maps <ArrowUpRight size={16} aria-hidden />
              </a>
            </div>
            <details className="rounded-xl bg-popover px-4" open>
              <summary className="min-h-12 cursor-pointer content-center text-[16px] font-semibold">
                Parking &amp; ride bookmark
              </summary>
              <RideBookmark />
            </details>
            <details className="rounded-xl bg-popover px-4">
              <summary className="min-h-12 cursor-pointer content-center text-[16px] font-semibold">
                Local conditions &amp; phrase guide
              </summary>
              <div className="space-y-2 pb-4 pt-1 text-[14px]">
                <p>
                  Daylight for {data.event.city} ({data.event.country}): bring warm layers for the
                  evening and check official local updates closer to event day.
                </p>
                <ul className="divide-y divide-border">
                  <li className="py-2">
                    <strong>Hello / How are you?</strong>
                    <span className="block text-muted-foreground">
                      AF: Hallo, hoe gaan dit? · OW: Wa lalapo? / Onawa? · DE: Hallo, wie geht’s?
                    </span>
                  </li>
                  <li className="py-2">
                    <strong>Where is first aid / medic?</strong>
                    <span className="block text-muted-foreground">
                      AF: Waar is noodhulp? · OW: Openi oshipangelo / ekwatho? · DE: Wo ist die
                      Erste Hilfe?
                    </span>
                  </li>
                </ul>
              </div>
            </details>
          </div>
        )}

        {selected === "safety" && (
          <div className="ios-card p-4">
            <h2 className="mb-3 text-[17px] font-semibold">Safety &amp; Support</h2>
            <SafetyPanel />
          </div>
        )}
      </div>

      {/* Surface 3 — Event Hub -> Info -> "Tickets" row (honest external provider attribution) */}
      <div className="mt-6">
        <div className="ios-group">
          <button
            type="button"
            onClick={() => openSheet({ kind: "buy-tickets" })}
            className="ios-row justify-between py-3.5"
          >
            <span className="flex items-center gap-3">
              <span className="grid size-9 place-items-center rounded-lg bg-favorite-soft text-primary">
                <Ticket size={18} aria-hidden />
              </span>
              <span className="min-w-0">
                <span className="block text-[16px] font-semibold">
                  Tickets · Buy from {provider}
                </span>
                <span className="block text-[13px] text-muted-foreground">
                  {data.event.ticketSalesClose
                    ? `Sales close ${dateLabel(new Date(data.event.ticketSalesClose), data.event.timezone, { day: "numeric", month: "short", year: "numeric" })} · external link`
                    : ticketUrl
                      ? `External ticket listing on ${provider} · save your copy offline`
                      : "No external ticket link published yet"}
                </span>
              </span>
            </span>
            <ArrowUpRight size={18} className="flex-none text-muted-foreground" aria-hidden />
          </button>
        </div>
      </div>
    </div>
  );
}
