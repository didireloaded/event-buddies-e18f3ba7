import { useCompanion } from "./context";
import { Section } from "./ui";

export function FestivalPassport() {
  const { places, attendee, openPlace } = useCompanion();
  const stops = places.filter((p) => p.type === "stage" || p.type === "food");
  return (
    <Section title="Your festival passport" id="crew-passport" className="px-4">
      <p className="mb-3 text-[15px] text-muted-foreground">
        {attendee.preferences.stamps.length} of {stops.length} stops checked off. Self-reported
        visits, saved on this device.
      </p>
      <div className="divide-y divide-border">
        {stops.map((p) => (
          <div key={p.id} className="flex min-h-16 items-center gap-3 py-2">
            <input
              type="checkbox"
              id={`stamp-${p.id}`}
              className="size-6 accent-favorite"
              disabled={!attendee.ready}
              checked={attendee.preferences.stamps.includes(p.id)}
              onChange={(e) =>
                attendee.update({
                  stamps: e.target.checked
                    ? [...attendee.preferences.stamps, p.id]
                    : attendee.preferences.stamps.filter((id) => id !== p.id),
                })
              }
            />
            <label htmlFor={`stamp-${p.id}`} className="flex-1 font-semibold">
              {p.name}
            </label>
            <button type="button" className="min-h-11 px-2" onClick={() => openPlace(p.id)}>
              Map ↗
            </button>
          </div>
        ))}
      </div>
      {stops.every((p) => attendee.preferences.stamps.includes(p.id)) && (
        <p className="mt-3 font-semibold text-favorite">
          Coastal explorer · All passport stops collected
        </p>
      )}
    </Section>
  );
}
