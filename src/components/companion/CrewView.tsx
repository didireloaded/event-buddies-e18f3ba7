import { CalendarClock, Info, Map as MapIcon, Pencil, ShieldCheck } from "lucide-react";
import { eventTime } from "@/lib/attendee/schedule";
import { countdownLabel } from "@/lib/attendee/event-clock";
import type { LocalMeeting } from "@/lib/attendee/meeting";
import { initials, useCompanion } from "./context";
import { FestivalBump } from "./FestivalBump";
import { FestivalPassport } from "./FestivalPassport";
import { PlanBackup } from "./PlanBackup";
import { Regroup } from "./Regroup";
import { SharedPlans } from "./SharedPlans";
import { Avatar, Chevron, IconTile, PrimaryButton, RowText, Section, SecondaryButton } from "./ui";

export { countdownLabel } from "@/lib/attendee/event-clock";

function MeetingCountdown({ meeting }: { meeting: LocalMeeting }) {
  const { now } = useCompanion();
  return (
    <span className="text-[15px] text-muted-foreground" aria-live="polite">
      {countdownLabel(meeting.at, now)}
    </span>
  );
}

export function CrewView() {
  const { attendee, places, openSheet, openPlace } = useCompanion();
  const { preferences } = attendee;
  const meeting = preferences.meeting;
  const meetingPlace = meeting ? places.find((p) => p.id === meeting.pointId) : undefined;

  return (
    <>
      <h1 className="display-title px-4 pt-2 text-[44px]">Crew</h1>
      <p className="px-4 text-[15px] text-muted-foreground">
        Pick a place. Agree on a time. Share the plan.
      </p>

      <div className="mt-4 px-4">
        <Regroup />
      </div>
      <Section title="Meeting plan" id="crew-meeting" className="px-4">
        <div className="ios-card p-4">
          {meeting && meetingPlace ? (
            <>
              <p className="text-[13px] font-semibold uppercase tracking-wide text-muted-foreground">
                Regroup at
              </p>
              <h2 className="text-[22px] font-bold leading-tight">{meetingPlace.name}</h2>
              <p className="mt-1 text-[28px] font-bold tabular-nums">
                {eventTime(meeting.at)}{" "}
                <span className="text-[17px] font-semibold text-muted-foreground">CAT</span>
              </p>
              <MeetingCountdown meeting={meeting} />
              <div className="mt-4 grid grid-cols-2 gap-2">
                <SecondaryButton onClick={() => openPlace(meeting.pointId)}>
                  <MapIcon size={18} /> Map
                </SecondaryButton>
                <SecondaryButton onClick={() => openSheet({ kind: "meeting" })}>
                  <Pencil size={17} /> Edit
                </SecondaryButton>
              </div>
            </>
          ) : (
            <>
              <div className="flex items-center gap-3">
                <IconTile icon={CalendarClock} tone="bg-pin-amenity" />
                <RowText
                  title="Where are we meeting?"
                  subtitle="Choose a stage, gate or landmark. Your friends can scan the plan into their phones."
                />
              </div>
              <PrimaryButton className="mt-4" onClick={() => openSheet({ kind: "meeting" })}>
                Make a meeting plan
              </PrimaryButton>
            </>
          )}
        </div>
        <p className="ios-footnote">
          Saved on this device. Use Festival Bump to share a copy with a friend.
        </p>
      </Section>

      <FestivalBump />
      <SharedPlans />

      <Section title="Your festival profile" id="crew-people" className="px-4">
        <div className="ios-group ios-group-indent">
          <button type="button" className="ios-row" onClick={() => openSheet({ kind: "profile" })}>
            <Avatar index={0} label={initials(preferences.profile.name)} />
            <RowText
              title={
                preferences.profile.name === "Guest" ? "Add your name" : preferences.profile.name
              }
              subtitle="The name friends see when you share your plan"
            />
            <Chevron />
          </button>
        </div>
        <label className="mt-4 block text-[15px] font-semibold">
          Festival mode
          <select
            className="ios-field mt-2"
            value={preferences.festivalMode ?? ""}
            onChange={(event) => {
              const value = event.target.value;
              if (value === "music" || value === "friends" || value === "both")
                attendee.update({ festivalMode: value });
            }}
          >
            <option value="" disabled>
              Choose your mode
            </option>
            <option value="music">Here for the music</option>
            <option value="friends">Here to meet people</option>
            <option value="both">A bit of both</option>
          </select>
        </label>
      </Section>

      <Section title="Privacy" id="crew-privacy" className="px-4">
        <label className="mb-4 flex min-h-12 items-center gap-3">
          <input
            type="checkbox"
            className="size-6 accent-favorite"
            checked={preferences.batterySaver}
            onChange={(e) => attendee.update({ batterySaver: e.target.checked })}
          />
          <span>
            <strong className="block">Low-power mode</strong>
            <span className="text-[14px] text-muted-foreground">
              Refresh countdowns once a minute. Pause background timers.
            </span>
          </span>
        </label>
        <div className="ios-group">
          <button type="button" className="ios-row" onClick={() => openSheet({ kind: "privacy" })}>
            <IconTile icon={ShieldCheck} tone="bg-pin-entrance" />
            <RowText
              title="You control what you share"
              subtitle="QR sharing sends the details you choose. Live location and accounts are pending."
            />
            <Info size={18} className="text-primary" aria-hidden />
          </button>
        </div>
        <PlanBackup />
      </Section>
      <FestivalPassport />
    </>
  );
}
