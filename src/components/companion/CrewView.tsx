import { CalendarClock, Info, Map as MapIcon, Pencil, ShieldCheck, UserPlus } from "lucide-react";
import { useEffect, useState } from "react";
import { eventTime } from "@/lib/attendee/schedule";
import type { LocalMeeting } from "@/lib/attendee/meeting";
import { initials, useCompanion } from "./context";
import { Avatar, Chevron, IconTile, PrimaryButton, RowText, Section, SecondaryButton } from "./ui";

export function countdownLabel(meetingAt: string, now: number | null) {
  if (now === null) return "Meeting time";
  const remaining = Math.ceil((Date.parse(meetingAt) - now) / 60000);
  if (remaining <= 0) return "Your meeting time has arrived";
  if (remaining >= 1440) {
    const days = Math.floor(remaining / 1440);
    return `${days} ${days === 1 ? "day" : "days"} to go`;
  }
  return `${Math.floor(remaining / 60)}h ${remaining % 60}m to go`;
}

function MeetingCountdown({ meeting }: { meeting: LocalMeeting }) {
  const [now, setNow] = useState<number | null>(null);
  useEffect(() => {
    setNow(Date.now());
    const timer = setInterval(() => setNow(Date.now()), 15000);
    return () => clearInterval(timer);
  }, []);
  return (
    <span className="text-[15px] text-muted-foreground" aria-live="polite">
      {countdownLabel(meeting.at, now)}
    </span>
  );
}

export function CrewView() {
  const { data, attendee, places, openSheet, openPlace } = useCompanion();
  const { preferences } = attendee;
  const meeting = preferences.meeting;
  const meetingPlace = meeting ? places.find((p) => p.id === meeting.pointId) : undefined;

  return (
    <>
      <h1 className="px-4 text-[34px] font-bold tracking-tight">Crew</h1>
      <p className="px-4 text-[15px] text-muted-foreground">{data.crew.name} · demo crew</p>

      <Section title="Meeting plan" id="crew-meeting" className="px-4">
        <div className="ios-group p-4">
          {meeting && meetingPlace ? (
            <>
              <p className="text-[13px] font-semibold uppercase tracking-wide text-muted-foreground">
                Regroup at
              </p>
              <h2 className="text-[22px] font-bold leading-tight">{meetingPlace.name}</h2>
              <p className="mt-1 text-[28px] font-bold tabular-nums">
                {eventTime(meeting.at)} <span className="text-[17px] font-semibold text-muted-foreground">CAT</span>
              </p>
              <MeetingCountdown meeting={meeting} />
              <div className="mt-4 grid grid-cols-2 gap-2">
                <SecondaryButton onClick={() => openPlace(meeting.pointId)}>
                  <MapIcon size={18} /> Show on map
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
                <RowText title="Same place. Same time." subtitle="Pick a landmark on the plan and a time to regroup." />
              </div>
              <PrimaryButton className="mt-4" onClick={() => openSheet({ kind: "meeting" })}>
                Make a meeting plan
              </PrimaryButton>
            </>
          )}
        </div>
        <p className="ios-footnote">
          Saved on this device only. Sharing plans with your crew needs accounts, which aren’t connected yet.
        </p>
      </Section>

      <Section title="People" id="crew-people" className="px-4">
        <div className="ios-group ios-group-indent">
          {data.crewMembers.map((member, index) => {
            const isMe = index === 0;
            const name = isMe ? preferences.profile.name : member.displayName;
            return (
              <button
                key={member.userId}
                type="button"
                className="ios-row"
                onClick={() => openSheet({ kind: "member", id: member.userId })}
              >
                <Avatar index={index} label={initials(name)} />
                <RowText
                  title={
                    <>
                      {name}
                      {isMe && <span className="ml-1.5 text-[15px] text-muted-foreground">(you)</span>}
                    </>
                  }
                  subtitle={isMe ? preferences.status : "Demo profile · location off"}
                />
                <Chevron />
              </button>
            );
          })}
          <div className="ios-row" aria-disabled="true">
            <IconTile icon={UserPlus} tone="bg-pin-other" />
            <RowText
              title={<span className="text-muted-foreground">Invite friends</span>}
              subtitle="Unavailable · needs accounts (not connected)"
            />
          </div>
        </div>
      </Section>

      <Section title="Privacy" id="crew-privacy" className="px-4">
        <div className="ios-group">
          <button type="button" className="ios-row" onClick={() => openSheet({ kind: "privacy" })}>
            <IconTile icon={ShieldCheck} tone="bg-pin-entrance" />
            <RowText
              title="Live location isn’t connected"
              subtitle="Your phone’s location is never read in this demo."
            />
            <Info size={18} className="text-primary" aria-hidden />
          </button>
        </div>
      </Section>
    </>
  );
}
