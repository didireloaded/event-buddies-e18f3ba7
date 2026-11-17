import {
  Ticket,
  ShieldCheck,
  Smartphone,
  UserRound,
  CalendarDays,
  Camera,
  Stamp,
} from "lucide-react";
import { initials, useCompanion } from "./context";
import { AccountPanel } from "./AccountPanel";
import { AfterEventData } from "./AfterEventData";
import { Avatar, Chevron, IconTile, RowText, Section } from "./ui";

export function YouView() {
  const { attendee, openSheet, offlineStatus } = useCompanion();
  const { preferences } = attendee;
  return (
    <div className="px-4">
      <h1 className="ios-large-title pt-2">You</h1>
      <AccountPanel />
      <button
        type="button"
        className="ios-row mt-4 gap-4 rounded-2xl bg-popover py-5"
        onClick={() => openSheet({ kind: "profile" })}
      >
        <Avatar label={initials(preferences.profile.name)} size="lg" />
        <span className="min-w-0 flex-1">
          <span className="block break-words text-[22px] font-bold tracking-tight">
            {preferences.hasName ? preferences.profile.name : "Your festival name"}
          </span>
          <span className="mt-1 block text-[15px] text-muted-foreground">
            Edit name · {preferences.savedArtists.length} saved artists
          </span>
        </span>
        <Chevron />
      </button>
      <Section title="Festival mode" id="you-preferences">
        <div className="ios-group ios-group-indent">
          <a href="#events" className="ios-row">
            <IconTile icon={CalendarDays} />
            <RowText title="Switch event" />
            <Chevron />
          </a>
          <label className="ios-row">
            <IconTile icon={UserRound} />
            <span className="flex-1 text-[17px]">Here for</span>
            <select
              aria-label="Festival mode"
              className="min-h-11 max-w-[50%] bg-transparent text-right text-[17px] text-muted-foreground"
              value={preferences.festivalMode ?? ""}
              onChange={(event) => {
                const mode = event.target.value;
                if (mode === "music" || mode === "friends" || mode === "both")
                  attendee.update({ festivalMode: mode });
              }}
            >
              <option value="" disabled>
                Choose
              </option>
              <option value="music">Music</option>
              <option value="friends">Friends</option>
              <option value="both">Both</option>
            </select>
          </label>
        </div>
      </Section>
      <Section title="Saved on this phone" id="you-saved">
        <div className="ios-group ios-group-indent">
          <button type="button" className="ios-row" onClick={() => openSheet({ kind: "ticket" })}>
            <IconTile icon={Ticket} />
            <RowText title="Ticket vault" subtitle="Your offline ticket copy" />
            <Chevron />
          </button>
          <button type="button" className="ios-row" onClick={() => openSheet({ kind: "memories" })}>
            <IconTile icon={Camera} />
            <RowText title="Photo diary" subtitle="Private memories and landmarks" />
            <Chevron />
          </button>
          <button type="button" className="ios-row" onClick={() => openSheet({ kind: "passport" })}>
            <IconTile icon={Stamp} />
            <RowText
              title="Festival passport"
              subtitle={`${preferences.stamps.length} stops checked off`}
            />
            <Chevron />
          </button>
        </div>
      </Section>
      <Section title="Privacy & app" id="you-app">
        <div className="ios-group ios-group-indent">
          <button type="button" className="ios-row" onClick={() => openSheet({ kind: "privacy" })}>
            <IconTile icon={ShieldCheck} />
            <RowText
              title="Location & saved data"
              subtitle="Private pins, sharing and clear data"
            />
            <Chevron />
          </button>
          <button type="button" className="ios-row" onClick={() => openSheet({ kind: "offline" })}>
            <IconTile icon={Smartphone} />
            <RowText
              title="Offline & installation"
              subtitle={
                offlineStatus === "registered"
                  ? "Offline copy saved on this phone"
                  : "Check your offline copy"
              }
            />
            <Chevron />
          </button>
        </div>
      </Section>
      <AfterEventData />
    </div>
  );
}
