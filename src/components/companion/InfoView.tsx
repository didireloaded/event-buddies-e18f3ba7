import { useCompanion } from "./context";
import { eventTime } from "@/lib/attendee/schedule";
import { Section } from "./ui";

export function InfoView() {
  const { data, showOnMap } = useCompanion();
  return (
    <div className="px-4">
      <h1 className="display-title pt-2 text-[44px]">Essentials</h1>
      <p className="mt-3 text-[17px]">
        {data.event.venueName} · {data.event.city}
      </p>
      <p className="text-[15px] text-muted-foreground">
        {eventTime(data.event.startAt)}–{eventTime(data.event.endAt)} CAT
      </p>
      <Section title="Transport" id="info-transport">
        <p className="text-[16px] leading-relaxed">{data.festival.transport}</p>
      </Section>
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
        <p className="text-[16px]">Weather, sunset and tide information pending.</p>
        <p className="mt-2 text-[16px]">
          Bring warm layers for the evening. Check beach conditions with the on-site team.
        </p>
      </Section>
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
