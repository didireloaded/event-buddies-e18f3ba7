import { useState } from "react";
import { Hand, Beer, Footprints, HandHelping } from "lucide-react";
import { activeLandmarkPin } from "@/lib/attendee/lifecycle";
import { bumpLink, type BumpPlan } from "@/lib/attendee/festival-bump";
import { eventTime } from "@/lib/attendee/schedule";
import { useCompanion } from "./context";
import { Section } from "./ui";

const PINGS = [
  { label: "I’m here", icon: Hand, message: "I’m at" },
  { label: "Join me", icon: Beer, message: "Come join me at" },
  { label: "Walk with me", icon: Footprints, message: "Can someone walk with me from" },
  { label: "Need a hand", icon: HandHelping, message: "Could someone come and help me at" },
];

export function QuickPings() {
  const { data, attendee, places, now } = useCompanion();
  const here = attendee.preferences.here;
  const activeHere = activeLandmarkPin(data, here, now)?.pointId ?? null;
  const [chosen, setChosen] = useState(
    activeHere ?? attendee.preferences.meeting?.pointId ?? places[0]?.id ?? "",
  );
  const [copy, setCopy] = useState("");
  const [busy, setBusy] = useState(false);
  const place = places.find((p) => p.id === chosen);
  const send = async (message: string) => {
    if (!place) return;
    const meeting = attendee.preferences.meeting;
    const plan: BumpPlan = {
      version: 1,
      event: data.event.id,
      name: attendee.preferences.profile.name,
      artists: attendee.preferences.savedArtists.slice(0, 3),
      meeting,
    };
    const text = `${message} ${place.name}. ${meeting ? `Our meeting is at ${eventTime(meeting.at)} CAT. ` : ""}${bumpLink(window.location.href, plan)}`;
    setCopy(text);
    setBusy(true);
    try {
      if (navigator.share) await navigator.share({ title: "Event Buddies · quick message", text });
      else {
        await navigator.clipboard.writeText(text);
        attendee.notify("Message copied. Paste it into your crew chat.");
      }
    } catch (error) {
      if (!(error instanceof DOMException && error.name === "AbortError"))
        attendee.notify("Copy the message below to share it.", true);
    } finally {
      setBusy(false);
    }
  };
  return (
    <Section title="Send a quick message" id="crew-pings" className="px-4">
      <label className="block text-[15px] font-semibold">
        Landmark
        <select
          className="ios-field mt-2"
          value={chosen}
          onChange={(event) => setChosen(event.target.value)}
        >
          {places.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>
      </label>
      <div className="mt-3 grid grid-cols-2 gap-2">
        {PINGS.map(({ label, icon: Icon, message }) => (
          <button
            key={label}
            type="button"
            disabled={busy || !attendee.ready}
            className="ios-press flex min-h-12 items-center justify-center gap-2 rounded-full bg-popover px-3 text-[15px] font-semibold"
            onClick={() => send(message)}
          >
            <Icon size={18} strokeWidth={1.75} aria-hidden />
            {label}
          </button>
        ))}
      </div>
      <p className="mt-2 text-[14px] text-muted-foreground">
        Share through your messaging app or copy for later. Ask a steward or use first aid for
        urgent assistance.
      </p>
      {copy && (
        <label className="mt-3 block text-[15px]">
          Your message
          <textarea
            className="ios-field mt-1"
            readOnly
            value={copy}
            onFocus={(event) => event.target.select()}
          />
        </label>
      )}
    </Section>
  );
}
