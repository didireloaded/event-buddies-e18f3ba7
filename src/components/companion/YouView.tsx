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
import { getEventCategoryTerms } from "@/lib/intelligence/event-intelligence";

export function YouView() {
  const { data, attendee, avatar, openSheet, offlineStatus, allTicketsCount } = useCompanion();
  const { preferences } = attendee;
  const terms = getEventCategoryTerms(data.event.category);
  const eventYear = data.event.dateConfirmed === false ? null : data.event.startAt.getFullYear();
  const savedLabel =
    preferences.savedArtists.length === 1
      ? terms.personSingular.toLowerCase()
      : terms.peopleLabel.toLowerCase();
  const totalCheckpoints =
    preferences.stamps.length + preferences.customStamps.filter((s) => s.checked).length;
  return (
    <div className="px-4">
      <h1 className="ios-large-title pt-2">You</h1>
      <div className="ios-card mt-4 overflow-hidden">
        <button
          type="button"
          className="ios-row gap-4 py-4"
          onClick={() => openSheet({ kind: "profile" })}
        >
          <Avatar
            label={initials(preferences.profile.name)}
            src={avatar?.url}
            alt={
              preferences.hasName
                ? `${preferences.profile.name}’s profile photo`
                : "Your profile photo"
            }
            size="lg"
          />
          <span className="min-w-0 flex-1">
            <span className="block break-words text-[22px] font-bold tracking-tight">
              {preferences.hasName
                ? preferences.profile.name
                : terms.isConferenceLike
                  ? "Your event name"
                  : "Your festival name"}
            </span>
            <span className="mt-0.5 block text-[14px] text-muted-foreground">
              Edit name · {data.event.name}
              {eventYear ? ` · ${eventYear}` : " · Date TBC"}
            </span>
            {preferences.badges.length > 0 && (
              <span className="mt-1.5 block text-[13px] font-medium text-primary">
                {preferences.badges.join(" · ")}
              </span>
            )}
          </span>
          <Chevron />
        </button>
        <div
          className="grid grid-cols-3 divide-x divide-separator border-t border-separator bg-secondary/35 text-center"
          aria-label={`My year in events · ${eventYear}`}
        >
          <div className="px-2 py-3">
            <p className="text-[20px] font-bold tabular-nums leading-none">
              {preferences.savedArtists.length}
            </p>
            <p className="mt-1 truncate text-[12px] font-medium text-muted-foreground">
              Saved {savedLabel}
            </p>
          </div>
          <div className="px-2 py-3">
            <p className="text-[20px] font-bold tabular-nums leading-none">{totalCheckpoints}</p>
            <p className="mt-1 truncate text-[12px] font-medium text-muted-foreground">Passport</p>
          </div>
          <div className="px-2 py-3">
            <p className="text-[20px] font-bold tabular-nums leading-none">
              {preferences.sharedPlans.length}
            </p>
            <p className="mt-1 truncate text-[12px] font-medium text-muted-foreground">
              Crew plans
            </p>
          </div>
        </div>
        {(preferences.collections.length > 0 || preferences.followedOrganisers.length > 0) && (
          <div className="space-y-1 border-t border-separator px-4 py-2.5 text-[13px] text-muted-foreground">
            {preferences.collections.length > 0 && (
              <p>
                <strong className="text-foreground">Collections:</strong>{" "}
                {preferences.collections.join(", ")}
              </p>
            )}
            {preferences.followedOrganisers.length > 0 && (
              <p>
                <strong className="text-foreground">Following:</strong>{" "}
                {preferences.followedOrganisers.join(", ")}
              </p>
            )}
          </div>
        )}
      </div>
      <AccountPanel />
      <Section
        title={terms.isConferenceLike ? "Event focus" : "Festival mode"}
        id="you-preferences"
      >
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
              <option value="music">{terms.modeMusicLabel}</option>
              <option value="friends">{terms.modeFriendsLabel}</option>
              <option value="both">{terms.modeBothLabel}</option>
            </select>
          </label>
        </div>
      </Section>
      <Section title="Saved on this phone" id="you-saved">
        <div className="ios-group ios-group-indent">
          <button type="button" className="ios-row" onClick={() => openSheet({ kind: "ticket" })}>
            <IconTile icon={Ticket} />
            <RowText
              title={allTicketsCount > 0 ? `Your tickets · ${allTicketsCount}` : "Your tickets"}
              subtitle="Ticket vault & offline gate card"
            />
            <Chevron />
          </button>
          <button type="button" className="ios-row" onClick={() => openSheet({ kind: "memories" })}>
            <IconTile icon={Camera} />
            <RowText title="Photo diary" subtitle="Private memories" />
            <Chevron />
          </button>
          <button type="button" className="ios-row" onClick={() => openSheet({ kind: "passport" })}>
            <IconTile icon={Stamp} />
            <RowText
              title="Festival passport"
              subtitle={`${preferences.stamps.length} stops checked`}
            />
            <Chevron />
          </button>
        </div>
      </Section>
      <Section title="Privacy & app" id="you-app">
        <div className="ios-group ios-group-indent">
          <button type="button" className="ios-row" onClick={() => openSheet({ kind: "privacy" })}>
            <IconTile icon={ShieldCheck} />
            <RowText title="Location & saved data" subtitle="Pins, sharing & device storage" />
            <Chevron />
          </button>
          <button type="button" className="ios-row" onClick={() => openSheet({ kind: "offline" })}>
            <IconTile icon={Smartphone} />
            <RowText
              title="Offline & installation"
              subtitle={offlineStatus === "registered" ? "Saved offline" : "Check offline copy"}
            />
            <Chevron />
          </button>
        </div>
      </Section>
      <AfterEventData />
    </div>
  );
}
