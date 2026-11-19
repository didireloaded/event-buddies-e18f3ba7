import { useRef, useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import { bumpLink, type BumpPlan } from "@/lib/attendee/festival-bump";
import { eventTime } from "@/lib/attendee/schedule";
import { dateLabel } from "@/lib/attendee/event-clock";
import { useCompanion } from "./context";
import { Sheet } from "./Sheet";
import { MeetingForm } from "./forms";
import { PrimaryButton, SecondaryButton } from "./ui";

export function Regroup() {
  const { data, attendee, places, map, openPlace } = useCompanion();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(false);
  const [link, setLink] = useState("");
  const [exporting, setExporting] = useState(false);
  const qr = useRef<HTMLDivElement>(null);
  const meeting = attendee.preferences.meeting;
  const place = places.find((p) => p.id === meeting?.pointId);
  const plan: BumpPlan = {
    version: 1,
    event: data.event.id,
    name: attendee.preferences.profile.name,
    artists: attendee.preferences.savedArtists.slice(0, 3),
    meeting,
  };
  const share = async () => {
    const url = bumpLink(window.location.href, plan);
    setLink(url);
    try {
      if (navigator.share)
        await navigator.share({
          title: "Let’s regroup",
          text: `Meet at ${place?.name}, ${meeting ? eventTime(meeting.at) : ""} CAT. Open the plan for the venue pin.`,
          url,
        });
      else {
        await navigator.clipboard.writeText(url);
        attendee.notify("Regroup link copied");
      }
    } catch (error) {
      if (!(error instanceof DOMException && error.name === "AbortError"))
        attendee.notify("Copy the regroup link below to share it.", true);
    }
  };
  const exportCard = async () => {
    if (!meeting || !place || !qr.current) return;
    setExporting(true);
    let imageUrl = "";
    try {
      const svg = qr.current.querySelector("svg");
      if (!svg) throw new Error("QR missing");
      imageUrl = URL.createObjectURL(
        new Blob([new XMLSerializer().serializeToString(svg)], {
          type: "image/svg+xml;charset=utf-8",
        }),
      );
      const image = new Image();
      image.src = imageUrl;
      await image.decode();
      const canvas = document.createElement("canvas");
      canvas.width = 1080;
      canvas.height = 1350;
      const ctx = canvas.getContext("2d");
      if (!ctx) throw new Error("Canvas unavailable");
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, 1080, 1350);
      ctx.fillStyle = "#111111";
      ctx.font = "bold 42px sans-serif";
      ctx.fillText("eventbuddies.", 72, 100);
      ctx.font = "bold 82px sans-serif";
      ctx.fillText("LET’S REGROUP", 72, 230);
      ctx.fillStyle = "#111111";
      ctx.fillRect(72, 280, 936, 8);
      ctx.fillStyle = "#111111";
      ctx.font = "bold 44px sans-serif";
      const words = place.name.split(" ");
      let line = "";
      let y = 370;
      for (const word of words) {
        if (ctx.measureText(`${line} ${word}`).width > 900) {
          ctx.fillText(line, 72, y);
          y += 56;
          line = word;
        } else line = line ? `${line} ${word}` : word;
      }
      ctx.fillText(line, 72, y);
      ctx.font = "bold 90px sans-serif";
      ctx.fillText(`${eventTime(meeting.at)} CAT`, 72, y + 115);
      ctx.font = "30px sans-serif";
      ctx.fillText(
        `${dateLabel(data.event.startAt, data.event.timezone, { day: "numeric", month: "short", year: "numeric" }).toUpperCase()} · ${data.event.name.toUpperCase()}`,
        72,
        y + 175,
      );
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(300, 690, 480, 480);
      ctx.drawImage(image, 320, 710, 440, 440);
      ctx.fillStyle = "#111111";
      ctx.font = "30px sans-serif";
      ctx.fillText("Scan in Event Buddies → Crew → Scan friend", 72, 1230);
      const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/png"));
      if (!blob) throw new Error("Export unavailable");
      const url = URL.createObjectURL(blob);
      const download = document.createElement("a");
      download.href = url;
      download.download = "sound-of-summer-regroup.png";
      download.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch {
      attendee.notify("Couldn’t export the card. Use the QR or regroup link.", true);
    } finally {
      if (imageUrl) URL.revokeObjectURL(imageUrl);
      setExporting(false);
    }
  };
  return (
    <>
      <button
        type="button"
        className="eb-press min-h-11 rounded-full bg-secondary px-4 text-[15px] font-semibold"
        disabled={!attendee.ready}
        onClick={() => {
          setOpen(true);
          setEditing(!meeting);
          setLink("");
        }}
      >
        Lost someone? Regroup
      </button>
      {open && (
        <Sheet title="Let’s regroup" onClose={() => setOpen(false)}>
          {editing || !meeting || !place ? (
            <>
              <p className="mb-4 text-[15px] text-muted-foreground">
                Pick a clear landmark, agree on a time, then share the same plan with everyone.
              </p>
              <MeetingForm
                eventStart={data.event.startAt}
                eventEnd={data.event.endAt}
                timezone={data.event.timezone}
                places={places}
                initial={meeting}
                selectedId={map.selected ?? attendee.preferences.here?.pointId ?? null}
                disabled={!attendee.ready}
                onSave={(next) => {
                  if (attendee.update({ meeting: next })) {
                    setEditing(!next);
                    setLink("");
                    attendee.notify(
                      next ? "Regroup plan saved. Share it with your friends." : "Meeting removed",
                    );
                  }
                }}
              />
            </>
          ) : (
            <>
              <h3 className="mt-2 text-[26px] font-bold">{place.name}</h3>
              <p className="mb-4 text-[32px] font-bold">{eventTime(meeting.at)} CAT</p>
              <PrimaryButton onClick={share}>Send regroup plan</PrimaryButton>
              <div className="my-3 grid grid-cols-2 gap-2">
                <SecondaryButton
                  onClick={() => {
                    setOpen(false);
                    openPlace(place.id);
                  }}
                >
                  See meeting pin
                </SecondaryButton>
                <SecondaryButton onClick={() => setEditing(true)}>Change plan</SecondaryButton>
              </div>
              <div ref={qr} className="mx-auto my-4 w-fit max-w-full bg-white p-4">
                <QRCodeSVG
                  value={JSON.stringify(plan)}
                  size={240}
                  marginSize={2}
                  className="h-auto max-w-full"
                />
              </div>
              <p className="mb-3 text-[14px] text-muted-foreground">
                Friends can scan this offline. Sending a link through messaging needs a connection.
                Anyone with this QR or link can read the shared plan.
              </p>
              <SecondaryButton disabled={exporting} onClick={exportCard}>
                {exporting ? "Creating card…" : "Download regroup card"}
              </SecondaryButton>
              {link && (
                <label className="mt-3 block text-[15px]">
                  Regroup link
                  <input
                    className="eb-field mt-1"
                    readOnly
                    value={link}
                    onFocus={(e) => e.target.select()}
                  />
                </label>
              )}
            </>
          )}
        </Sheet>
      )}
    </>
  );
}
