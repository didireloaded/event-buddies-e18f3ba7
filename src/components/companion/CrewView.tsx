import { useEffect, useState } from "react";
import { MessageCircle, MapPin, Dices, UserPlus, Trash2, Stamp, ChevronRight } from "lucide-react";
import { eventTime } from "@/lib/attendee/schedule";
import {
  addGlobalBuddy,
  readGlobalBuddies,
  removeGlobalBuddy,
  type GlobalBuddy,
} from "@/lib/crew/buddies";
import { getEventCategoryTerms } from "@/lib/intelligence/event-intelligence";
import { isModuleEnabled, resolveEventTemplate } from "@/lib/templates/event-templates";
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

  const { config: templateConfig } = resolveEventTemplate({
    category: data.event.category,
    templateConfig: data.event.templateConfig,
  });
  const terms = getEventCategoryTerms(data.event.category, templateConfig);
  const passportEnabled = isModuleEnabled(templateConfig, "passport");
  const activitiesEnabled = isModuleEnabled(templateConfig, "activities");

  useEffect(() => {
    setBuddies(readGlobalBuddies());
  }, []);

  return (
    <div className="pb-6">
      <div className="px-4 pt-4">
        <p className="eb-kicker text-primary">{data.event.name}</p>
        <h1 className="eb-page-title mt-1">{terms.crewLabel}</h1>
      </div>

      <ConnectedCrew />
      <CrewPeople />

      {/* Global Buddies — personal friend connections across events */}
      <Section title="Your Buddies" id="global-buddies" className="px-4">
        <div className="space-y-3">
          {buddies.length > 0 ? (
            <ul className="eb-list">
              {buddies.map((b, idx) => (
                <li key={b.id} className="eb-row py-2.5">
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
            <div className="flex flex-wrap items-center justify-between gap-3 border-y border-separator py-3.5">
              <div className="min-w-0">
                <p className="text-[15px] font-semibold">Friends across all events</p>
                <p className="text-[13px] text-muted-foreground">
                  Quick-invite across festivals, parties &amp; conferences
                </p>
              </div>
              <button
                type="button"
                onClick={() => setAddingBuddy(true)}
                className="eb-press inline-flex min-h-11 flex-none items-center gap-1.5 rounded-full bg-favorite-soft px-4 text-[14px] font-semibold text-primary"
              >
                <UserPlus size={16} aria-hidden /> Add a buddy
              </button>
            </div>
          ) : null}
          {addingBuddy ? (
            <form
              className="eb-panel space-y-2.5 p-4"
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
                  className="eb-field"
                  maxLength={50}
                  placeholder="Friend’s name"
                  value={buddyName}
                  onChange={(e) => setBuddyName(e.target.value)}
                />
                <input
                  aria-label="Buddy handle (optional)"
                  className="eb-field"
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

      <div className="mx-4 mt-7">
        <h2 className="eb-section-heading mb-3">Find each other</h2>
        <div className="flex flex-wrap gap-2.5">
          <Regroup />
          <FindMe />
        </div>
      </div>

      <FestivalBump />
      <CrewCoordination />

      {/* Clean Editorial Hairline List — Zero 2-Column Utility Card Grid */}
      <section className="mx-4 mt-7" aria-label="Activities and meetup">
        <h2 className="eb-section-heading mb-3">Activities &amp; meetup</h2>
        <div className="eb-list">
          <button
            type="button"
            onClick={() => openSheet({ kind: "meeting" })}
            className="eb-row py-3.5"
          >
            <span className="grid size-10 flex-none place-items-center rounded-lg bg-favorite-soft text-primary">
              <MapPin size={19} aria-hidden />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-[16px] font-semibold leading-snug">
                {place ? `Meet at ${place.name}` : "Choose a meetup spot"}
              </span>
              <span
                aria-hidden={!meeting || undefined}
                className="block text-[14px] text-muted-foreground"
              >
                {meeting ? `${eventTime(meeting.at)} CAT` : "Set place & time"}
              </span>
            </span>
            <ChevronRight size={17} className="text-tertiary-foreground" aria-hidden />
          </button>

          <button
            type="button"
            onClick={() => openSheet({ kind: "pings" })}
            className="eb-row py-3.5"
          >
            <span className="grid size-10 flex-none place-items-center rounded-lg bg-secondary text-foreground">
              <MessageCircle size={19} aria-hidden />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-[16px] font-semibold leading-snug">Where are you?</span>
              <span className="block text-[14px] text-muted-foreground">Quick status message</span>
            </span>
            <ChevronRight size={17} className="text-tertiary-foreground" aria-hidden />
          </button>

          {passportEnabled && (
            <button
              type="button"
              onClick={() => openSheet({ kind: "passport" })}
              className="eb-row py-3.5"
            >
              <span className="grid size-10 flex-none place-items-center rounded-lg bg-favorite-soft text-primary">
                <Stamp size={19} aria-hidden />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-[16px] font-semibold leading-snug">Event Passport</span>
                <span className="block text-[14px] text-muted-foreground">
                  Collect {terms.passportStampNoun}
                </span>
              </span>
              <ChevronRight size={17} className="text-tertiary-foreground" aria-hidden />
            </button>
          )}

          {activitiesEnabled && (
            <button
              type="button"
              onClick={() => openSheet({ kind: "play" })}
              className="eb-row py-3.5"
            >
              <span className="grid size-10 flex-none place-items-center rounded-lg bg-favorite-soft text-primary">
                <Dices size={19} aria-hidden />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-[16px] font-semibold leading-snug">
                  {terms.activitiesLabel}
                </span>
                <span className="block text-[14px] text-muted-foreground">
                  Picks, trivia &amp; bingo
                </span>
              </span>
              <ChevronRight size={17} className="text-tertiary-foreground" aria-hidden />
            </button>
          )}
        </div>
      </section>

      <p className="px-4 pt-5 text-[13px] text-muted-foreground">
        QR &amp; links work offline · Connected crews sync when signed in.
      </p>
    </div>
  );
}
