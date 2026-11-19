import { useState } from "react";
import {
  ArrowUpRight,
  Ban,
  Bus,
  Camera,
  ClipboardCheck,
  HelpCircle,
  IdCard,
  Info as InfoIcon,
  ShieldCheck,
  Ticket,
  ChevronRight,
} from "lucide-react";
import { dateLabel, formatEventHours } from "@/lib/attendee/event-clock";
import { getTicketProviderName } from "@/lib/attendee/tickets";
import { getEventCategoryTerms } from "@/lib/intelligence/event-intelligence";
import { isModuleEnabled, resolveEventTemplate } from "@/lib/templates/event-templates";
import { useCompanion } from "./context";
import { EventSections } from "./EventSections";
import { PreparationChecklist } from "./PreparationChecklist";
import { RideBookmark } from "./RideBookmark";
import { SafetyPanel } from "./SafetyAccess";

type EssentialOption = "entry" | "transport" | "safety";

export function InfoView() {
  const { data, showOnMap, openSheet } = useCompanion();
  const [selected, setSelected] = useState<EssentialOption>("entry");
  const { config: templateConfig } = resolveEventTemplate({
    category: data.event.category,
    templateConfig: data.event.templateConfig,
  });
  const terms = getEventCategoryTerms(data.event.category, templateConfig);
  const ticketUrl = data.event.ticketUrl || data.festival.ticketUrl;
  const provider = getTicketProviderName(ticketUrl);
  const showTicketsRow = isModuleEnabled(templateConfig, "tickets") && Boolean(ticketUrl);

  const destinations: {
    id: EssentialOption | "ask";
    label: string;
    subtitle: string;
    icon: typeof ClipboardCheck;
  }[] = [
    {
      id: "entry",
      label: terms.entryRulesLabel,
      subtitle: "ID, access rules & checklist",
      icon: ClipboardCheck,
    },
    {
      id: "transport",
      label: "Transport & Parking",
      subtitle: "Directions & saved ride spot",
      icon: Bus,
    },
    {
      id: "safety",
      label: "Safety & Support",
      subtitle: "Medics, exits & private ICE card",
      icon: ShieldCheck,
    },
    {
      id: "ask",
      label: terms.askLabel,
      subtitle: "Verified event answers",
      icon: HelpCircle,
    },
  ];

  return (
    <div className="pb-8">
      <div className="px-4 pt-4">
        <p className="eb-kicker text-primary">{data.event.name}</p>
        <h1 className="eb-page-title mt-1">Essentials</h1>
        <p className="mt-1.5 text-[14px] text-muted-foreground">
          {data.event.venueName} · {data.event.city} · {formatEventHours(data.event)}
        </p>
      </div>

      <EventSections />

      {/* Exactly 4 clear editorial hairline destinations — zero Settings card soup */}
      <div className="px-4">
        <div className="eb-list" role="group" aria-label="Event essentials options">
          {destinations.map(({ id, label, subtitle, icon: Icon }) => {
            const isSelected = id !== "ask" && selected === id;
            return (
              <button
                key={id}
                type="button"
                aria-pressed={id !== "ask" ? isSelected : undefined}
                onClick={() => {
                  if (id === "ask") openSheet({ kind: "assistant" });
                  else setSelected(id);
                }}
                className={`eb-row py-3.5 ${isSelected ? "border-l-[3px] border-l-primary pl-3" : ""}`}
              >
                <span
                  className={`grid size-10 flex-none place-items-center rounded-lg ${
                    isSelected
                      ? "bg-primary text-primary-foreground"
                      : "bg-secondary text-foreground"
                  }`}
                >
                  <Icon size={19} aria-hidden />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-[16px] font-bold leading-snug text-foreground">
                    {label}
                  </span>
                  <span className="block text-[14px] text-muted-foreground">{subtitle}</span>
                </span>
                <ChevronRight
                  size={17}
                  className={isSelected ? "text-primary" : "text-tertiary-foreground"}
                  aria-hidden
                />
              </button>
            );
          })}
        </div>

        {/* Focused scannable detail panel for the chosen Essentials destination */}
        <div className="mt-6">
          {selected === "entry" && (
            <div className="space-y-5">
              <div>
                <h2 className="eb-section-heading mb-3">{terms.entryRulesLabel}</h2>
                <ul className="eb-list">
                  {data.festival.rules.map((rule) => {
                    const Icon = /\b(18\+|id|identification|badge)\b/i.test(rule)
                      ? IdCard
                      : /\b(camera|drone|drones|umbrella|umbrellas)\b/i.test(rule)
                        ? Camera
                        : /\b(prohibited|glass|weapons|outside|no)\b/i.test(rule)
                          ? Ban
                          : InfoIcon;
                    return (
                      <li key={rule} className="eb-row items-start py-3 text-[15px] leading-snug">
                        <span
                          aria-hidden
                          className="mt-0.5 grid size-8 flex-none place-items-center rounded-lg bg-secondary text-primary"
                        >
                          <Icon size={16} />
                        </span>
                        <span className="min-w-0 flex-1 pt-0.5">{rule}</span>
                      </li>
                    );
                  })}
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
                    className="eb-chip"
                    onClick={() => showOnMap(filter)}
                  >
                    {label} ↗
                  </button>
                ))}
              </div>
            </div>
          )}

          {selected === "transport" && (
            <div className="space-y-5">
              <div className="eb-panel space-y-3 p-4">
                <h2 className="eb-section-heading">Transport &amp; Parking</h2>
                <p className="text-[15px] leading-relaxed text-foreground">
                  {data.festival.transport}
                </p>
                <a
                  href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${data.event.venueName} ${data.event.city} ${data.event.country}`)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex min-h-11 items-center gap-1 text-[15px] font-semibold text-primary"
                >
                  Open {data.event.venueName} in Maps <ArrowUpRight size={16} aria-hidden />
                </a>
              </div>
              <details className="eb-panel px-4" open>
                <summary className="min-h-12 cursor-pointer content-center text-[16px] font-semibold">
                  Parking &amp; ride bookmark
                </summary>
                <RideBookmark />
              </details>
              <details className="eb-panel px-4">
                <summary className="min-h-12 cursor-pointer content-center text-[16px] font-semibold">
                  Local conditions &amp; phrase guide
                </summary>
                <div className="space-y-2 pb-4 pt-1 text-[14px]">
                  <p className="text-muted-foreground">
                    Daylight for {data.event.city} ({data.event.country}): bring warm layers for the
                    evening and check official local updates closer to event day.
                  </p>
                  <ul className="divide-y divide-separator">
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
            <div className="space-y-3">
              <h2 className="eb-section-heading">Safety &amp; Support</h2>
              <SafetyPanel />
            </div>
          )}
        </div>

        {/* External Ticketing Provider Row (only when ticketing is enabled & published) */}
        {showTicketsRow && (
          <div className="mt-7">
            <div className="eb-list">
              <button
                type="button"
                onClick={() => openSheet({ kind: "buy-tickets" })}
                className="eb-row justify-between py-3.5"
              >
                <span className="flex min-w-0 items-center gap-3">
                  <span className="grid size-10 flex-none place-items-center rounded-lg bg-favorite-soft text-primary">
                    <Ticket size={18} aria-hidden />
                  </span>
                  <span className="min-w-0">
                    <span className="block text-[16px] font-semibold">
                      Tickets · Buy from {provider}
                    </span>
                    <span className="block text-[13px] text-muted-foreground">
                      {data.event.ticketSalesClose
                        ? `Sales close ${dateLabel(new Date(data.event.ticketSalesClose), data.event.timezone, { day: "numeric", month: "short", year: "numeric" })} · external link`
                        : `External ticket listing on ${provider} · save your copy offline`}
                    </span>
                  </span>
                </span>
                <ArrowUpRight size={18} className="flex-none text-muted-foreground" aria-hidden />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
