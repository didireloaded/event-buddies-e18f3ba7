import { useCompanion } from "./context";
import { useEffect, useRef } from "react";
import { activeLandmarkPin } from "@/lib/attendee/lifecycle";

export function PinPrivacy() {
  const { data, attendee, now, places, openSheet } = useCompanion();
  const here = attendee.preferences.here;
  const active = activeLandmarkPin(data, here, now);
  const attemptedExpiry = useRef<number | null>(null);
  useEffect(() => {
    if (
      attendee.ready &&
      here &&
      now !== null &&
      !active &&
      attemptedExpiry.current !== here.expiresAt
    ) {
      attemptedExpiry.current = here.expiresAt;
      attendee.update({ here: null });
    }
  }, [attendee, here, now, active]);
  const remaining = active && now !== null ? Math.ceil((active.expiresAt - now) / 60000) : 0;
  return (
    <div className="mx-auto flex max-w-3xl items-center justify-between gap-2 border-t border-border px-safe py-1 text-[13px]">
      <button
        type="button"
        className="min-h-11 text-left"
        onClick={() => openSheet({ kind: "privacy" })}
      >
        {active
          ? `Private pin · ${places.find((p) => p.id === active.pointId)?.name} · ${remaining}m left`
          : "Ghost mode · no location broadcast"}
      </button>
      {active && (
        <button
          type="button"
          className="min-h-11 flex-none px-2 font-semibold"
          onClick={() => {
            if (attendee.update({ here: null })) attendee.notify("Private pin cleared");
          }}
        >
          Clear pin
        </button>
      )}
    </div>
  );
}
