import { useEffect, useState } from "react";
import { MessageCircle, MapPin, Dices, UserPlus, Trash2, Stamp } from "lucide-react";
import { eventTime } from "@/lib/attendee/schedule";
import {
  addGlobalBuddy,
  readGlobalBuddies,
  removeGlobalBuddy,
  type GlobalBuddy,
} from "@/lib/crew/buddies";
import { initials, useCompanion } from "./context";
import { ConnectedCrew } from "./ConnectedCrew";
import { CrewCoordination } from "./CrewCoordination";
import { CrewPeople } from "./CrewPeople";
import { FestivalBump } from "./FestivalBump";
import { FindMe } from "./FindMe";
import { Regroup } from "./Regroup";
import { Avatar, Chevron, IconTile, PrimaryButton, RowText, Section } from "./ui";

export { countdownLabel } from "@/lib/attendee/event-clock";

export function CrewView() {
  const { data, openSheet, attendee, places } = useCompanion();
  const meeting = attendee.preferences.meeting;
  const place = places.find((point) => point.id === meeting?.pointId);
  const [buddies, setBuddies] = useState<GlobalBuddy[]>([]);
  const [addingBuddy, setAddingBuddy] = useState(false);
  const [buddyName, setBuddyName] = useState("");
  const [buddyHandle, setBuddyHandle] = useState("");

  useEffect(() => {
    setBuddies(readGlobalBuddies());
  }, []);

  return (
    <>
      <h1 className="ios-large-title px-4 pt-2">Crew</h1>
      <ConnectedCrew />
      <CrewPeople />

      {/* Global Buddies — personal friend connections across events, separate from event crew */}
      <Section
        title="Your Buddies (across all events)"
        id="global-buddies"
        className="px-4"
        footer="Personal friend list saved globally across events. Event crew membership is managed separately per event."
      >
        <div className="ios-card space-y-3 p-4">
          {buddies.length > 0 ? (
            <ul className="divide-y divide-border">
              {buddies.map((b, idx) => (
                <li key={b.id} className="flex min-h-12 items-center gap-3 py-2">
                  <Avatar label={initials(b.name)} index={idx + 1} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[16px] font-semibold">{b.name}</p>
                    <p className="truncate text-[13px] text-muted-foreground">
                      @{b.handle}
                      {b.lastEventName ? ` · ${b.lastEventName}` : ""}
                    </p>
                  </div>
                  <button
                    type="button"
                    aria-label={`Remove ${b.name} from buddies`}
                    onClick={() => setBuddies(removeGlobalBuddy(b.id))}
                    className="grid size-10 flex-none place-items-center text-destructive"
                  >
                    <Trash2 size={17} aria-hidden />
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-[14px] text-muted-foreground">
              Save close friends here so you can invite them quickly across concerts, festivals and
              conferences.
            </p>
          )}
          {addingBuddy ? (
            <form
              className="space-y-2.5 border-t border-border pt-3"
              onSubmit={(e) => {
                e.preventDefault();
                if (buddyName.trim().length < 2) return;
                setBuddies(
                  addGlobalBuddy({
                    name: buddyName,
                    handle: buddyHandle,
                    lastEventName: data.event.name,
                  }),
                );
                setBuddyName("");
                setBuddyHandle("");
                setAddingBuddy(false);
                attendee.notify("Buddy saved to your global list");
              }}
            >
              <div className="grid grid-cols-2 gap-2">
                <input
                  aria-label="Buddy name"
                  className="ios-field"
                  maxLength={50}
                  placeholder="Friend’s name"
                  value={buddyName}
                  onChange={(e) => setBuddyName(e.target.value)}
                />
                <input
                  aria-label="Buddy handle (optional)"
                  className="ios-field"
                  maxLength={30}
                  placeholder="@handle (optional)"
                  value={buddyHandle}
                  onChange={(e) => setBuddyHandle(e.target.value)}
                />
              </div>
              <div className="flex gap-2">
                <PrimaryButton type="submit" disabled={buddyName.trim().length < 2}>
                  Save buddy
                </PrimaryButton>
                <button
                  type="button"
                  onClick={() => setAddingBuddy(false)}
                  className="min-h-11 px-3 text-[15px] font-medium text-muted-foreground"
                >
                  Cancel
                </button>
              </div>
            </form>
          ) : (
            <button
              type="button"
              onClick={() => setAddingBuddy(true)}
              className="inline-flex min-h-11 items-center gap-1.5 text-[15px] font-semibold text-primary"
            >
              <UserPlus size={17} aria-hidden /> Add a buddy
            </button>
          )}
        </div>
      </Section>

      <div className="mx-4 mt-5">
        <h2 className="ios-section-title">Find each other</h2>
        <div className="mt-3 flex flex-wrap gap-2">
          <Regroup />
          <FindMe />
        </div>
      </div>
      <FestivalBump />
      <CrewCoordination />
      <div className="ios-group ios-group-indent mx-4 mt-6">
        <button type="button" className="ios-row" onClick={() => openSheet({ kind: "passport" })}>
          <IconTile icon={Stamp} />
          <RowText
            title="Event Passport"
            subtitle="Collectible stage & venue stops under Activities"
          />
          <Chevron />
        </button>
        <button type="button" className="ios-row" onClick={() => openSheet({ kind: "play" })}>
          <IconTile icon={Dices} />
          <RowText title="Festival extras" subtitle="Stage picks, photo challenges and bingo" />
          <Chevron />
        </button>
        <button type="button" className="ios-row" onClick={() => openSheet({ kind: "pings" })}>
          <IconTile icon={MessageCircle} />
          <RowText title="Where are you?" subtitle="Share a quick message with your friend" />
          <Chevron />
        </button>
        <button type="button" className="ios-row" onClick={() => openSheet({ kind: "meeting" })}>
          <IconTile icon={MapPin} />
          <RowText
            title={place ? `Meet at ${place.name}` : "Choose a meetup spot"}
            subtitle={
              meeting
                ? `${eventTime(meeting.at)} CAT · ${attendee.auth.user ? "private account plan" : "saved on this phone"}`
                : undefined
            }
          />
          <Chevron />
        </button>
      </div>
      <p className="px-4 pt-4 text-[14px] text-muted-foreground">
        QR and link sharing work offline with saved plans. Connected crews share meetings, expiring
        landmark pins and optional active-session GPS when signed in.
      </p>
    </>
  );
}
