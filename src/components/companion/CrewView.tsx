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
import { Avatar, PrimaryButton, Section } from "./ui";

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
      <Section title="Your Buddies" id="global-buddies" className="px-4">
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
                    className="grid size-11 flex-none place-items-center text-destructive"
                  >
                    <Trash2 size={17} aria-hidden />
                  </button>
                </li>
              ))}
            </ul>
          ) : !addingBuddy ? (
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="text-[15px] font-semibold">Friends across all events</p>
                <p className="text-[13px] text-muted-foreground">
                  Quick-invite across festivals &amp; shows
                </p>
              </div>
              <button
                type="button"
                onClick={() => setAddingBuddy(true)}
                className="ios-press inline-flex min-h-11 flex-none items-center gap-1.5 rounded-full bg-favorite-soft px-3.5 text-[14px] font-semibold text-primary"
              >
                <UserPlus size={16} aria-hidden /> Add a buddy
              </button>
            </div>
          ) : null}
          {addingBuddy ? (
            <form
              className="space-y-2.5 border-t border-border pt-3 first:border-t-0 first:pt-0"
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
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
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
          ) : buddies.length > 0 ? (
            <button
              type="button"
              onClick={() => setAddingBuddy(true)}
              className="inline-flex min-h-11 items-center gap-1.5 text-[15px] font-semibold text-primary"
            >
              <UserPlus size={17} aria-hidden /> Add a buddy
            </button>
          ) : null}
        </div>
      </Section>

      <div className="mx-4 mt-5">
        <h2 className="ios-section-title">Find each other</h2>
        <div className="mt-1 flex flex-wrap gap-2">
          <Regroup />
          <FindMe />
        </div>
      </div>
      <FestivalBump />
      <CrewCoordination />
      <section className="mx-4 mt-5" aria-label="Activities and meetup">
        <h2 className="ios-section-title">Activities &amp; meetup</h2>
        <div className="grid grid-cols-2 gap-2.5">
          <button
            type="button"
            onClick={() => openSheet({ kind: "passport" })}
            className="ios-card ios-press flex flex-col items-start p-4 text-left"
          >
            <span className="grid size-10 place-items-center rounded-xl bg-favorite-soft text-primary">
              <Stamp size={20} aria-hidden />
            </span>
            <span className="mt-3 text-[16px] font-semibold leading-snug">Event Passport</span>
            <span className="mt-0.5 text-[13px] text-muted-foreground">Venue stamps</span>
          </button>
          <button
            type="button"
            onClick={() => openSheet({ kind: "play" })}
            className="ios-card ios-press flex flex-col items-start p-4 text-left"
          >
            <span className="grid size-10 place-items-center rounded-xl bg-favorite-soft text-primary">
              <Dices size={20} aria-hidden />
            </span>
            <span className="mt-3 text-[16px] font-semibold leading-snug">Festival extras</span>
            <span className="mt-0.5 text-[13px] text-muted-foreground">Picks &amp; bingo</span>
          </button>
          <button
            type="button"
            onClick={() => openSheet({ kind: "pings" })}
            className="ios-card ios-press flex flex-col items-start p-4 text-left"
          >
            <span className="grid size-10 place-items-center rounded-xl bg-secondary text-foreground">
              <MessageCircle size={20} aria-hidden />
            </span>
            <span className="mt-3 text-[16px] font-semibold leading-snug">Where are you?</span>
            <span className="mt-0.5 text-[13px] text-muted-foreground">Quick message</span>
          </button>
          <button
            type="button"
            onClick={() => openSheet({ kind: "meeting" })}
            className="ios-card ios-press flex flex-col items-start p-4 text-left"
          >
            <span className="grid size-10 place-items-center rounded-xl bg-secondary text-foreground">
              <MapPin size={20} aria-hidden />
            </span>
            <span className="mt-3 text-[16px] font-semibold leading-snug">
              {place ? `Meet at ${place.name}` : "Choose a meetup spot"}
            </span>
            <span
              aria-hidden={!meeting || undefined}
              className="mt-0.5 text-[13px] text-muted-foreground"
            >
              {meeting ? `${eventTime(meeting.at)} CAT` : "Set place & time"}
            </span>
          </button>
        </div>
      </section>
      <p className="px-5 pt-4 text-[12px] text-muted-foreground">
        QR &amp; links work offline · Connected crews sync when signed in.
      </p>
    </>
  );
}
