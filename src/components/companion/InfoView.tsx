import { useCompanion } from "./context";
import { eventTime } from "@/lib/attendee/schedule";
import { Section } from "./ui";
import { EventSections } from "./EventSections";
import { PreparationChecklist } from "./PreparationChecklist";
import { RideBookmark } from "./RideBookmark";

export function InfoView() {
  const { data, showOnMap, openSheet } = useCompanion();
  return (
    <div className="px-4">
      <h1 className="ios-large-title pt-2">Essentials</h1>
      <div className="-mx-4">
        <EventSections />
      </div>
      <p className="mt-3 text-[17px]">
        {data.event.venueName} · {data.event.city}
      </p>
      <p className="text-[15px] text-muted-foreground">
        {eventTime(data.event.startAt)}–{eventTime(data.event.endAt)} CAT
      </p>
      <Section title="Transport" id="info-transport">
        <p className="text-[16px] leading-relaxed">{data.festival.transport}</p>
      </Section>
      <PreparationChecklist />
      <details className="mt-4 rounded-xl bg-popover px-4">
        <summary className="min-h-12 cursor-pointer content-center text-[17px] font-semibold">
          Parking & ride bookmark
        </summary>
        <RideBookmark />
      </details>
      <button
        type="button"
        className="ios-row mt-4 w-full rounded-2xl bg-popover text-favorite"
        onClick={() => openSheet({ kind: "assistant" })}
      >
        Ask about the festival
      </button>
      <Section title="Entry & venue rules" id="info-rules">
        <ul className="list-disc space-y-3 pl-5 text-[16px] leading-relaxed">
          {data.festival.rules.map((rule) => (
            <li key={rule}>{rule}</li>
          ))}
        </ul>
      </Section>
      <Section title="Find facilities" id="info-facilities">
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
      </Section>
      <Section title="Coastal conditions" id="info-coast">
        <p className="text-[16px]">
          Astronomical daylight for Langstrand (22.82°S, 14.54°E) on 28 December: golden hour
          ~19:00–19:45 CAT · sunset ~19:45 CAT.
        </p>
        <p className="mt-2 text-[15px] text-muted-foreground">
          Forecast and tide tables drop during festival week — check beach conditions with the
          on-site team and bring warm layers for the evening.
        </p>
      </Section>
      <details className="mt-4 rounded-xl bg-popover px-4">
        <summary className="min-h-12 cursor-pointer content-center text-[17px] font-semibold">
          Local phrase guide (EN · AF · OW · DE)
        </summary>
        <div className="space-y-2 pb-4 pt-1 text-[14px]">
          <p className="text-muted-foreground">
            Common greetings and festival phrases used along the Erongo coast (Swakopmund,
            Langstrand and Walvis Bay):
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
                AF: Waar is noodhulp? · OW: Openi oshipangelo / ekwatho? · DE: Wo ist die Erste
                Hilfe?
              </span>
            </li>
            <li className="py-2">
              <strong>Meet me at the main gate</strong>
              <span className="block text-muted-foreground">
                AF: Ontmoet my by die hoofhek · DE: Triff mich am Haupteingang
              </span>
            </li>
            <li className="py-2">
              <strong>Thank you / Safe travels home</strong>
              <span className="block text-muted-foreground">
                AF: Dankie, veilig ry · OW: Tangi unene, enda nawa · DE: Danke, gute Heimfahrt
              </span>
            </li>
          </ul>
        </div>
      </details>
      <a
        className="mt-6 flex min-h-12 items-center font-semibold"
        href={data.festival.ticketUrl}
        target="_blank"
        rel="noreferrer"
      >
        Official tickets on Howler ↗<span className="sr-only"> Opens in a new tab</span>
      </a>
    </div>
  );
}
