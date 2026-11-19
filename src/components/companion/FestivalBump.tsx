import { useCallback, useEffect, useState } from "react";
import { QrCode, ScanLine, Share2 } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import { bumpLink, readBump, type BumpPlan } from "@/lib/attendee/festival-bump";
import { eventTime } from "@/lib/attendee/schedule";
import { useCompanion } from "./context";
import { QrCameraScanner } from "./QrCameraScanner";
import { Sheet } from "./Sheet";
import { PrimaryButton, SecondaryButton, Section } from "./ui";

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
    ...(attendee.preferences.badges.length ? { badges: attendee.preferences.badges } : {}),
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
          title: `Our ${data.event.name} meetup`,
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
    <Section title="Share with a friend" id="crew-bump" className="px-4">
      <div className="eb-panel space-y-2 p-3">
        <div className="grid grid-cols-2 gap-2">
          <PrimaryButton disabled={!attendee.ready} onClick={() => setMode("show")}>
            <QrCode size={18} aria-hidden /> Show QR
          </PrimaryButton>
          <SecondaryButton
            onClick={() => {
              setMode("scan");
              setIncoming(null);
              setError("");
            }}
          >
            <ScanLine size={18} aria-hidden /> Scan friend
          </SecondaryButton>
        </div>
        <SecondaryButton disabled={!attendee.ready} onClick={sharePlan}>
          <Share2 size={17} aria-hidden /> Share meetup link
        </SecondaryButton>
      </div>
      {shareLink && (
        <label className="mt-2 block text-[14px] text-muted-foreground">
          Anyone with this link can read the shared plan.
          <input
            className="eb-field mt-1"
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
                  className="eb-field mt-1 w-full"
                  maxLength={50}
                  value={contact.name}
                  onChange={(e) => setContact({ ...contact, name: e.target.value })}
                />
              </label>
              <label className="mt-3 block text-[15px]">
                Emergency contact phone (optional)
                <input
                  className="eb-field mt-1 w-full"
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
                  className="eb-field mt-1 w-full text-[16px]"
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
                <QrCameraScanner
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
                  className="eb-field mt-1 w-full text-[16px]"
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
                        className="eb-field mt-2"
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
                  {incoming.badges && incoming.badges.length > 0 && (
                    <p className="mt-2 text-[14px] text-primary">
                      Interests · {incoming.badges.join(" · ")}
                    </p>
                  )}
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
                          selectedEventId: data.event.id,
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
