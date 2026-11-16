import { useState } from "react";
import { eventTime } from "@/lib/attendee/schedule";
import { useCompanion } from "./context";
import { PrimaryButton } from "./ui";

export function LandmarkCheckin() {
  const { attendee, places, map, now } = useCompanion();
  const landmarks = places.filter((p) => p.type === "stage" || p.type === "entrance");
  const [chosen, setChosen] = useState(landmarks[0]?.id ?? "");
  const here = attendee.preferences.here;
  const active = here && now !== null && here.expiresAt > now;
  const current = active ? places.find((p) => p.id === here.pointId) : null;
  return (
    <section className="mx-4 mt-4 border-y border-border py-3" aria-label="Your landmark check-in">
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-[17px] font-bold">
          {current ? `You’re at ${current.name}` : "Where are you?"}
        </h2>
        {current && (
          <button
            type="button"
            className="min-h-11 px-2 text-[15px] font-semibold"
            onClick={() => attendee.update({ here: null })}
          >
            Clear
          </button>
        )}
      </div>
      <div className="mt-2 flex items-center gap-2">
        <label className="min-w-0 flex-1">
          <span className="sr-only">Your current landmark</span>
          <select className="ios-field" value={chosen} onChange={(e) => setChosen(e.target.value)}>
            {landmarks.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </label>
        <PrimaryButton
          className="w-auto flex-none"
          disabled={!attendee.ready}
          onClick={() => {
            if (
              attendee.update({ here: { pointId: chosen, expiresAt: Date.now() + 2 * 3600000 } })
            ) {
              map.setQuery("");
              map.setFilter("all");
              map.setSelected(chosen);
              attendee.notify("Landmark saved privately for two hours");
            }
          }}
        >
          I’m here
        </PrimaryButton>
      </div>
      <p className="mt-2 text-[14px] text-muted-foreground">
        {current && here
          ? `Private on this phone · expires at ${eventTime(new Date(here.expiresAt))} CAT`
          : "Choose a landmark. Private on this phone, cleared from view after two hours."}
      </p>
    </section>
  );
}
