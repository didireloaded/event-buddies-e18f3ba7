import { useState } from "react";
import { useCompanion } from "./context";
import { PrimaryButton, Section } from "./ui";

export function FestivalPassport() {
  const { places, attendee, openPlace } = useCompanion();
  const [customText, setCustomText] = useState("");
  const stops = places.filter((p) => p.type === "stage" || p.type === "food");
  const customStamps = attendee.preferences.customStamps;
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
            className="ios-field flex-1"
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
