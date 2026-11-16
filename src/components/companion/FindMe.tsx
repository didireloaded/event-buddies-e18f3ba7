import { useEffect, useRef, useState } from "react";
import { initials, useCompanion } from "./context";

function SignalScreen({ onClose }: { onClose: () => void }) {
  const { attendee, places, now } = useCompanion();
  const dialog = useRef<HTMLDialogElement>(null);
  const here = attendee.preferences.here;
  const pointId =
    here && now !== null && here.expiresAt > now
      ? here.pointId
      : attendee.preferences.meeting?.pointId;
  const place = places.find((p) => p.id === pointId);
  useEffect(() => {
    const trigger = document.activeElement as HTMLElement | null;
    const el = dialog.current;
    el?.showModal();
    return () => {
      el?.close();
      if (trigger?.isConnected) trigger.focus({ preventScroll: true });
    };
  }, []);
  return (
    <dialog
      ref={dialog}
      className="fixed inset-0 m-0 h-dvh max-h-none w-screen max-w-none bg-favorite p-6 text-primary-foreground"
      aria-labelledby="find-me-title"
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
    >
      <div className="flex h-full flex-col items-center justify-between gap-4 pb-safe pt-safe text-center">
        <div className="flex w-full items-center justify-between">
          <h2 id="find-me-title" className="text-[20px] font-bold">
            Find me
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="min-h-12 rounded-full bg-primary px-6 font-bold text-primary-foreground"
          >
            Close
          </button>
        </div>
        <div>
          <p className="text-[clamp(6rem,35vw,14rem)] font-black leading-none">
            {initials(attendee.preferences.profile.name)}
          </p>
          <p className="mt-5 text-[32px] font-bold">{attendee.preferences.profile.name}</p>
          {place && <p className="mt-3 text-[22px]">{place.name}</p>}
        </div>
        <p className="max-w-sm text-[17px]">
          Hold your screen up for your friends. This signal stays on your screen.
        </p>
      </div>
    </dialog>
  );
}

export function FindMe() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        type="button"
        className="min-h-11 rounded-full bg-favorite px-4 text-[15px] font-semibold text-primary-foreground"
        onClick={() => setOpen(true)}
      >
        Find me screen
      </button>
      {open && <SignalScreen onClose={() => setOpen(false)} />}
    </>
  );
}
