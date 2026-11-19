import { useEffect, useRef, useState } from "react";
import { initials, useCompanion } from "./context";
import { activeLandmarkPin } from "@/lib/attendee/lifecycle";
import { countdownLabel, eventPhase } from "@/lib/attendee/event-clock";
import { saveMemory } from "@/lib/attendee/memories";
import { Segmented } from "./ui";

function SignalScreen({ onClose }: { onClose: () => void }) {
  const { data, attendee, places, now } = useCompanion();
  const dialog = useRef<HTMLDialogElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [mode, setMode] = useState<"name" | "message" | "countdown" | "timer">("name");
  const [timerEndsAt, setTimerEndsAt] = useState<number | null>(null);
  const [secondsLeft, setSecondsLeft] = useState<number | null>(null);
  const [useCameraSnap, setUseCameraSnap] = useState(false);
  const [snapStatus, setSnapStatus] = useState("");
  const [message, setMessage] = useState("Meet me here");
  const [light, setLight] = useState(false);
  const here = attendee.preferences.here;
  const pointId =
    activeLandmarkPin(data, here, now)?.pointId ?? attendee.preferences.meeting?.pointId;
  const place = places.find((p) => p.id === pointId);

  useEffect(() => {
    return () => {
      streamRef.current?.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (timerEndsAt === null || mode !== "timer") return;
    let interval: number | undefined;
    let snapped = false;
    const tick = () => {
      const remaining = Math.max(0, Math.ceil((timerEndsAt - Date.now()) / 1000));
      setSecondsLeft(remaining);
      if (remaining === 0) {
        window.clearInterval(interval);
        if (useCameraSnap && !snapped && videoRef.current && videoRef.current.videoWidth > 0) {
          snapped = true;
          const el = videoRef.current;
          const canvas = document.createElement("canvas");
          canvas.width = el.videoWidth;
          canvas.height = el.videoHeight;
          const ctx = canvas.getContext("2d");
          if (ctx) {
            ctx.drawImage(el, 0, 0, canvas.width, canvas.height);
            canvas.toBlob(
              (blob) => {
                if (!blob) return;
                void saveMemory({
                  id: crypto.randomUUID(),
                  eventId: data.event.id,
                  createdAt: Date.now(),
                  caption: `${attendee.preferences.profile.name}’s 5s crew snap`,
                  pointId: pointId ?? null,
                  photo: blob,
                })
                  .then(() => {
                    setSnapStatus("Photo saved to your private Photo Diary.");
                    attendee.notify("Group photo saved to your Photo Diary");
                  })
                  .catch(() => {
                    setSnapStatus("Couldn’t save photo to storage.");
                  });
              },
              "image/jpeg",
              0.9,
            );
          }
        }
      }
    };
    tick();
    if (timerEndsAt > Date.now()) interval = window.setInterval(tick, 250);
    return () => window.clearInterval(interval);
  }, [timerEndsAt, mode, useCameraSnap, data.event.id, attendee, pointId]);
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
      className="signal-screen fixed inset-0 m-0 h-dvh max-h-none w-screen max-w-none p-6"
      data-light={light}
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
        <div className="w-full">
          <p
            className="break-words text-[clamp(2.5rem,12vw,6rem)] leading-tight font-bold"
            aria-live={mode === "countdown" ? "polite" : "off"}
          >
            {mode === "name"
              ? initials(attendee.preferences.profile.name)
              : mode === "message"
                ? message || "Your message"
                : mode === "timer"
                  ? secondsLeft === null
                    ? "Ready?"
                    : secondsLeft === 0
                      ? "Photo time"
                      : secondsLeft
                  : attendee.preferences.meeting
                    ? countdownLabel(attendee.preferences.meeting.at, now)
                    : eventPhase(data, now).label}
          </p>
          <p className="mt-5 text-[32px] font-bold">{attendee.preferences.profile.name}</p>
          {place && <p className="mt-3 text-[22px]">{place.name}</p>}
        </div>
        <div className="w-full space-y-3">
          <Segmented
            label="Signal display"
            value={mode}
            options={[
              { value: "name", label: "Name" },
              { value: "message", label: "Message" },
              { value: "countdown", label: attendee.preferences.meeting ? "Meetup" : "Event" },
              { value: "timer", label: "Timer" },
            ]}
            onChange={setMode}
          />
          {mode === "message" && (
            <input
              className="eb-field"
              aria-label="Big screen message"
              maxLength={60}
              value={message}
              onChange={(event) => setMessage(event.target.value)}
            />
          )}
          {mode === "countdown" && (
            <p className="text-[15px]">
              {attendee.preferences.meeting ? "Until your saved meetup" : "Until doors open"}
            </p>
          )}
          {mode === "timer" && (
            <>
              {useCameraSnap && (
                <video
                  ref={videoRef}
                  autoPlay
                  muted
                  playsInline
                  className="mx-auto max-h-44 w-44 rounded-xl bg-muted object-cover"
                  aria-label="Group photo camera preview"
                />
              )}
              <div className="flex flex-wrap justify-center gap-2">
                <button
                  type="button"
                  className="min-h-12 rounded-xl border border-current px-4 text-[17px] font-semibold"
                  onClick={() => {
                    setSnapStatus("");
                    setTimerEndsAt(Date.now() + 5000);
                  }}
                >
                  Start 5-second countdown
                </button>
                <button
                  type="button"
                  className="min-h-12 rounded-xl border border-current px-4 text-[16px] font-semibold"
                  onClick={async () => {
                    setSnapStatus("");
                    if (useCameraSnap) {
                      streamRef.current?.getTracks().forEach((t) => t.stop());
                      streamRef.current = null;
                      setUseCameraSnap(false);
                      return;
                    }
                    try {
                      if (!navigator.mediaDevices?.getUserMedia) throw new Error("No camera");
                      const stream = await navigator.mediaDevices.getUserMedia({
                        video: { facingMode: "user" },
                        audio: false,
                      });
                      streamRef.current = stream;
                      setUseCameraSnap(true);
                      window.setTimeout(() => {
                        if (videoRef.current) {
                          videoRef.current.srcObject = stream;
                          void videoRef.current.play();
                        }
                      }, 50);
                      setTimerEndsAt(Date.now() + 5000);
                    } catch {
                      setSnapStatus(
                        "Camera unavailable. Use the screen countdown with your camera app.",
                      );
                    }
                  }}
                >
                  {useCameraSnap ? "Close camera" : "5s camera auto-snap"}
                </button>
              </div>
              {snapStatus && (
                <p role="status" className="text-[14px] font-medium">
                  {snapStatus}
                </p>
              )}
              <p className="text-[14px]">
                A countdown for your group photo. Open your camera to take the picture.
              </p>
            </>
          )}
          <button
            type="button"
            aria-pressed={light}
            className="min-h-11 px-4 text-[17px] underline"
            onClick={() => setLight(!light)}
          >
            {light ? "Use black screen" : "Use white screen"}
          </button>
          <p className="text-[14px]">Hold up your phone. This signal stays on your screen.</p>
        </div>
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
        className="eb-press min-h-11 rounded-full bg-favorite-soft px-4 text-[15px] font-semibold text-favorite"
        onClick={() => setOpen(true)}
      >
        Find me screen
      </button>
      {open && <SignalScreen onClose={() => setOpen(false)} />}
    </>
  );
}
