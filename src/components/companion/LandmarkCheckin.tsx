import { useState } from "react";
import { eventTime } from "@/lib/attendee/schedule";
import { useCompanion } from "./context";
import { PrimaryButton } from "./ui";
import { activeLandmarkPin, eventLifecycle, landmarkPinExpiry } from "@/lib/attendee/lifecycle";

export function LandmarkCheckin() {
  const { data, attendee, places, openPlace, now } = useCompanion();
  const landmarks = places.filter((p) => p.type === "stage" || p.type === "entrance");
  const [chosen, setChosen] = useState(landmarks[0]?.id ?? "");
  const here = attendee.preferences.here;
  const active = activeLandmarkPin(data, here, now);
  const life = eventLifecycle(data, now);
  const closed = life.phase === "cancelled" || (now !== null && now >= life.pinsEndAt);
  const current = active ? places.find((p) => p.id === active.pointId) : null;
  return (
    <details className="mx-4 mt-2 border-y border-border py-1" aria-label="Your landmark check-in">
      <summary className="min-h-11 cursor-pointer content-center text-[15px] font-semibold">
        {current ? `You’re at ${current.name} · update` : "Mark where I am"}
      </summary>
      <div className="flex items-center justify-between gap-2">
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
          <select className="eb-field" value={chosen} onChange={(e) => setChosen(e.target.value)}>
            {landmarks.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </label>
        <PrimaryButton
          className="w-auto flex-none"
          disabled={!attendee.ready || now === null || closed}
          onClick={(event) => {
            const timestamp = Date.now();
            const expiry = landmarkPinExpiry(data, timestamp);
            if (data.event.status === "cancelled" || expiry <= timestamp) return;
            if (attendee.update({ here: { pointId: chosen, expiresAt: expiry } })) {
              openPlace(chosen);
              attendee.notify(`Landmark saved privately until ${eventTime(new Date(expiry))} CAT`);
              event.currentTarget.closest("details")?.removeAttribute("open");
            }
          }}
        >
          I’m here
        </PrimaryButton>
      </div>
      <p className="mt-2 text-[14px] text-muted-foreground">
        {closed
          ? "Landmark check-ins have ended for this event."
          : current && active
            ? `Private on this phone · expires at ${eventTime(new Date(active.expiresAt))} CAT`
            : "Choose a landmark. Private on this phone, cleared after one hour."}
      </p>
    </details>
  );
}
