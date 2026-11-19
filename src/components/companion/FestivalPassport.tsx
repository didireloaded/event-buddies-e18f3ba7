import { useState } from "react";
import { Check, MapPin, Stamp } from "lucide-react";
import { useCompanion } from "./context";
import { PrimaryButton, Section } from "./ui";

export function FestivalPassport() {
  const { data, places, attendee, openPlace } = useCompanion();
  const [customText, setCustomText] = useState("");
  const stops = places.filter(
    (p) => p.type === "stage" || p.type === "food" || p.type === "sponsor",
  );
  const displayStops = stops.length > 0 ? stops.slice(0, 8) : places.slice(0, 6);
  const customStamps = attendee.preferences.customStamps;
  const collectedCount = displayStops.filter((p) =>
    attendee.preferences.stamps.includes(p.id),
  ).length;

  const termsLabel = data.event.category.toLowerCase().includes("conference")
    ? "Exhibitor & session checkpoints"
    : data.event.category.toLowerCase().includes("market")
      ? "Market tasting checkpoints"
      : "Venue checkpoints";

  return (
    <Section title="Event Passport" id="crew-passport" className="px-4">
      <div className="mb-5 border-b border-separator pb-4">
        <p className="eb-kicker text-primary">{termsLabel}</p>
        <p className="eb-display mt-1 text-[24px]">
          {collectedCount} of {displayStops.length} stamps collected
        </p>
        <p className="mt-1.5 text-[14px] text-muted-foreground">
          Self-reported check-ins saved on this phone for {data.event.name}. Verified organiser QR
          checkpoints are marked separately when enabled.
        </p>
      </div>

      {/* Visual Collectible Stamp Grid */}
      <div className="grid grid-cols-2 gap-3">
        {displayStops.map((p) => {
          const collected = attendee.preferences.stamps.includes(p.id);
          return (
            <div
              key={p.id}
              className={`flex flex-col justify-between rounded-xl border p-3.5 transition-colors ${
                collected
                  ? "border-primary bg-favorite-soft"
                  : "border-dashed border-border bg-card"
              }`}
            >
              <button
                type="button"
                disabled={!attendee.ready}
                aria-pressed={collected}
                onClick={() =>
                  attendee.update({
                    stamps: collected
                      ? attendee.preferences.stamps.filter((id) => id !== p.id)
                      : [...attendee.preferences.stamps, p.id],
                  })
                }
                className="text-left"
              >
                <span
                  className={`grid size-11 place-items-center rounded-full border-2 ${
                    collected
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-dashed border-muted-foreground/40 text-muted-foreground"
                  }`}
                >
                  {collected ? <Check size={20} aria-hidden /> : <Stamp size={18} aria-hidden />}
                </span>
                <span className="mt-2.5 block text-[15px] font-bold leading-snug">{p.name}</span>
                <span className="mt-0.5 block text-[12px] text-muted-foreground">
                  {collected ? "Stamped · self-reported" : "Tap to stamp"}
                </span>
              </button>
              <button
                type="button"
                className="mt-2.5 inline-flex min-h-11 items-center gap-1 text-[13px] font-semibold text-primary"
                onClick={() => openPlace(p.id)}
              >
                <MapPin size={13} aria-hidden /> Map ↗
              </button>
            </div>
          );
        })}
      </div>

      {displayStops.length > 0 && collectedCount === displayStops.length && (
        <p className="mt-4 rounded-xl bg-favorite-soft px-4 py-3 text-[15px] font-semibold text-primary">
          Passport complete · All {data.event.name} stops stamped!
        </p>
      )}

      <div className="mt-5 border-t border-border pt-4">
        <h3 className="text-[17px] font-semibold">Custom crew checkpoints</h3>
        {customStamps.length > 0 && (
          <div className="mt-2 divide-y divide-border">
            {customStamps.map((stamp) => (
              <div key={stamp.id} className="flex min-h-14 items-center gap-3 py-1.5">
                <input
                  type="checkbox"
                  id={`custom-stamp-${stamp.id}`}
                  className="size-6 accent-favorite"
                  disabled={!attendee.ready}
                  checked={stamp.checked}
                  onChange={(e) =>
                    attendee.update({
                      customStamps: customStamps.map((s) =>
                        s.id === stamp.id ? { ...s, checked: e.target.checked } : s,
                      ),
                    })
                  }
                />
                <label htmlFor={`custom-stamp-${stamp.id}`} className="flex-1 font-medium">
                  {stamp.label}
                </label>
                <button
                  type="button"
                  className="min-h-11 px-2 text-[14px] text-destructive"
                  onClick={() =>
                    attendee.update({
                      customStamps: customStamps.filter((s) => s.id !== stamp.id),
                    })
                  }
                >
                  Remove
                </button>
              </div>
            ))}
          </div>
        )}
        <form
          className="mt-3 flex gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            if (!customText.trim() || customStamps.length >= 12) return;
            if (
              attendee.update({
                customStamps: [
                  ...customStamps,
                  {
                    id: crypto.randomUUID(),
                    label: customText.trim(),
                    checked: false,
                  },
                ],
              })
            ) {
              setCustomText("");
            }
          }}
        >
          <input
            aria-label="New custom checkpoint"
            className="eb-field flex-1"
            maxLength={80}
            placeholder="Add a personal or crew checkpoint…"
            value={customText}
            onChange={(e) => setCustomText(e.target.value)}
          />
          <PrimaryButton
            type="submit"
            disabled={!attendee.ready || !customText.trim() || customStamps.length >= 12}
            className="w-auto px-5"
          >
            Add
          </PrimaryButton>
        </form>
      </div>
    </Section>
  );
}
