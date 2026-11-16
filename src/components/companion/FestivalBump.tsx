import { useCallback, useEffect, useRef, useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import { bumpLink, readBump, type BumpPlan } from "@/lib/attendee/festival-bump";
import { eventTime } from "@/lib/attendee/schedule";
import { useCompanion } from "./context";
import { Sheet } from "./Sheet";
import { PrimaryButton, SecondaryButton, Section } from "./ui";

function CameraScanner({
  onCode,
  onError,
}: {
  onCode: (code: string) => void;
  onError: (message: string) => void;
}) {
  const video = useRef<HTMLVideoElement>(null);
  useEffect(() => {
    let stopped = false;
    let stream: MediaStream | undefined;
    let frame = 0;
    let decode: typeof import("jsqr").default | undefined;
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    const scan = () => {
      const el = video.current;
      if (el && ctx && decode && el.readyState >= 2) {
        canvas.width = 640;
        canvas.height = Math.round((640 * el.videoHeight) / el.videoWidth);
        ctx.drawImage(el, 0, 0, canvas.width, canvas.height);
        const pixels = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const code = decode(pixels.data, pixels.width, pixels.height);
        if (code) {
          onCode(code.data);
          return;
        }
      }
      frame = requestAnimationFrame(scan);
    };
    void import("jsqr")
      .then(async (module) => {
        decode = module.default;
        if (stopped) return null;
        if (!navigator.mediaDevices) throw new Error("Camera unavailable");
        return navigator.mediaDevices.getUserMedia({
          video: { facingMode: "environment" },
          audio: false,
        });
      })
      .then(async (media) => {
        if (!media) return;
        if (stopped) {
          media.getTracks().forEach((track) => track.stop());
          return;
        }
        stream = media;
        if (video.current) {
          video.current.srcObject = media;
          await video.current.play();
        }
        frame = requestAnimationFrame(scan);
      })
      .catch(() => {
        if (!stopped) onError("Camera unavailable. Paste your friend’s sharing code below.");
      });
    return () => {
      stopped = true;
      cancelAnimationFrame(frame);
      stream?.getTracks().forEach((track) => track.stop());
    };
  }, [onCode, onError]);
  return (
    <video
      ref={video}
      autoPlay
      muted
      playsInline
      className="aspect-square w-full rounded-xl bg-muted object-cover"
      aria-label="Point your camera at your friend’s QR code"
    />
  );
}

export function FestivalBump() {
  const { data, attendee, places } = useCompanion();
  const [mode, setMode] = useState<"show" | "scan" | null>(null);
  const [raw, setRaw] = useState("");
  const [incoming, setIncoming] = useState<BumpPlan | null>(null);
  const [error, setError] = useState("");
  const [scanning, setScanning] = useState(false);
  const [contact, setContact] = useState({ name: "", phone: "" });
  const [shareLink, setShareLink] = useState("");
  const [receiverName, setReceiverName] = useState("");
  const needsName = !attendee.preferences.hasName;
  const payload = JSON.stringify({
    version: 1,
    event: data.event.id,
    name: attendee.preferences.profile.name,
    artists: attendee.preferences.savedArtists.slice(0, 3),
    meeting: attendee.preferences.meeting,
    ...(contact.name && contact.phone ? { contact } : {}),
  });
  const receive = useCallback(
    (code: string) => {
      setScanning(false);
      try {
        let content = code.trim();
        if (/^https?:\/\//.test(content)) {
          const url = new URL(content);
          content = new URLSearchParams(url.hash.split("?")[1] ?? "").get("plan") ?? "";
        }
        setIncoming(readBump(content, data));
        setError("");
      } catch (err) {
        setError(
          err instanceof SyntaxError
            ? "This QR is not a Festival Bump code."
            : err instanceof Error
              ? err.message
              : "Couldn’t read this code.",
        );
      }
    },
    [data],
  );
  useEffect(() => {
    const reviewLink = () => {
      const raw = new URLSearchParams(window.location.hash.split("?")[1] ?? "").get("plan");
      if (!raw) return;
      setMode("scan");
      receive(raw);
      window.history.replaceState(null, "", "#crew");
    };
    reviewLink();
    window.addEventListener("hashchange", reviewLink);
    return () => window.removeEventListener("hashchange", reviewLink);
  }, [receive]);
  const sharePlan = async () => {
    const url = bumpLink(window.location.href, JSON.parse(payload));
    setShareLink(url);
    try {
      if (navigator.share)
        await navigator.share({
          title: "Our Sound of Summer meetup",
          text: "Open this plan to review our meeting point and artists.",
          url,
        });
      else {
        await navigator.clipboard.writeText(url);
        attendee.notify("Meetup link copied. Send it in WhatsApp or Messages.");
      }
    } catch (err) {
      if (!(err instanceof DOMException && err.name === "AbortError"))
        attendee.notify("Copy the meetup link below to share it.", true);
    }
  };
  const meetingPlace = incoming?.meeting && places.find((p) => p.id === incoming.meeting?.pointId);
  return (
    <Section title="Festival Bump" id="crew-bump" className="px-4">
      <p className="mb-3 text-[15px] text-muted-foreground">
        Share a meeting and your top three favourites phone-to-phone. Works without a connection
        once the app is loaded.
      </p>
      <div className="grid grid-cols-2 gap-2">
        <PrimaryButton disabled={!attendee.ready} onClick={() => setMode("show")}>
          Show QR
        </PrimaryButton>
        <SecondaryButton
          onClick={() => {
            setMode("scan");
            setIncoming(null);
            setError("");
          }}
        >
          Scan friend
        </SecondaryButton>
      </div>
      <SecondaryButton className="mt-2" disabled={!attendee.ready} onClick={sharePlan}>
        Share meetup link
      </SecondaryButton>
      {shareLink && (
        <label className="mt-2 block text-[14px] text-muted-foreground">
          Anyone with this link can read the shared plan.
          <input
            className="ios-field mt-1"
            readOnly
            value={shareLink}
            onFocus={(event) => event.target.select()}
          />
        </label>
      )}
      {mode && (
        <Sheet
          title={mode === "show" ? "Share your plan" : "Receive a plan"}
          onClose={() => {
            setMode(null);
            setScanning(false);
          }}
        >
          {mode === "show" ? (
            <>
              <div className="mx-auto my-4 w-fit max-w-full bg-white p-4">
                <QRCodeSVG
                  value={payload}
                  size={260}
                  level="M"
                  marginSize={2}
                  className="h-auto max-w-full"
                />
              </div>
              <p className="text-[15px]">
                Includes your name, meeting and first three saved artists.
              </p>
              <label className="mt-4 block text-[15px]">
                Emergency contact name (optional)
                <input
                  className="ios-field mt-1 w-full"
                  maxLength={50}
                  value={contact.name}
                  onChange={(e) => setContact({ ...contact, name: e.target.value })}
                />
              </label>
              <label className="mt-3 block text-[15px]">
                Emergency contact phone (optional)
                <input
                  className="ios-field mt-1 w-full"
                  type="tel"
                  maxLength={30}
                  value={contact.phone}
                  onChange={(e) => setContact({ ...contact, phone: e.target.value })}
                />
              </label>
              <p className="my-3 text-[14px] text-muted-foreground">
                Anyone scanning this screen can read the details you include.
              </p>
              <label className="block text-[15px]">
                Sharing code
                <textarea
                  className="ios-field mt-1 w-full text-[16px]"
                  readOnly
                  value={payload}
                  onFocus={(e) => e.target.select()}
                />
              </label>
            </>
          ) : (
            <>
              <SecondaryButton
                onClick={() => {
                  setScanning(true);
                  setError("");
                }}
              >
                Start camera
              </SecondaryButton>
              {scanning && (
                <CameraScanner
                  onCode={receive}
                  onError={(message) => {
                    setError(message);
                    setScanning(false);
                  }}
                />
              )}
              <label className="mt-4 block text-[15px]">
                Or paste a sharing code
                <textarea
                  className="ios-field mt-1 w-full text-[16px]"
                  maxLength={3000}
                  value={raw}
                  onChange={(e) => setRaw(e.target.value)}
                />
              </label>
              <SecondaryButton className="mt-2" onClick={() => receive(raw)}>
                Review plan
              </SecondaryButton>
              {error && (
                <p role="alert" className="mt-3 text-destructive">
                  {error}
                </p>
              )}
              {incoming && (
                <div className="mt-4 border-t border-border pt-4">
                  {needsName && (
                    <label className="mb-4 block text-[15px] font-semibold">
                      Your name
                      <input
                        className="ios-field mt-2"
                        autoComplete="nickname"
                        maxLength={50}
                        value={receiverName}
                        placeholder="What should your friends call you?"
                        onChange={(event) => setReceiverName(event.target.value)}
                      />
                    </label>
                  )}
                  <h3 className="text-[20px] font-bold">{incoming.name}’s plan</h3>
                  <p>
                    {meetingPlace && incoming.meeting
                      ? `${meetingPlace.name} · ${eventTime(incoming.meeting.at)} CAT`
                      : "No meeting included"}
                  </p>
                  <p className="mt-2">
                    {incoming.artists
                      .map((id) => data.festival.artists.find((a) => a.id === id)?.name)
                      .join(" · ") || "No favourites included"}
                  </p>
                  {incoming.contact && (
                    <p className="mt-2">
                      Emergency contact · {incoming.contact.name} · {incoming.contact.phone}
                    </p>
                  )}
                  <p className="my-3 text-[14px] text-muted-foreground">
                    Import adds their favourites and replaces your saved meeting when a meeting is
                    included.
                  </p>
                  <PrimaryButton
                    disabled={needsName && receiverName.trim().length < 2}
                    onClick={() => {
                      if (
                        attendee.update({
                          onboardingDone: true,
                          hasName: true,
                          following: true,
                          ...(needsName
                            ? {
                                profile: {
                                  ...attendee.preferences.profile,
                                  name: receiverName.trim(),
                                },
                              }
                            : {}),
                          sharedPlans: [
                            { receivedAt: Date.now(), plan: incoming },
                            ...attendee.preferences.sharedPlans.filter(
                              (entry) => JSON.stringify(entry.plan) !== JSON.stringify(incoming),
                            ),
                          ].slice(0, 10),
                          savedArtists: [
                            ...new Set([...attendee.preferences.savedArtists, ...incoming.artists]),
                          ],
                          ...(incoming.meeting ? { meeting: incoming.meeting } : {}),
                        })
                      ) {
                        attendee.notify(`Imported ${incoming.name}’s plan`);
                        navigator.vibrate?.(20);
                        setMode(null);
                      }
                    }}
                  >
                    Import plan
                  </PrimaryButton>
                </div>
              )}
            </>
          )}
        </Sheet>
      )}
    </Section>
  );
}
