import {
  Ticket,
  ShieldCheck,
  Smartphone,
  UserRound,
  CalendarDays,
  Camera,
  Stamp,
  Bell,
} from "lucide-react";
import { initials, useCompanion } from "./context";
import { AccountPanel } from "./AccountPanel";
import { AfterEventData } from "./AfterEventData";
import { Avatar, Chevron, IconTile, RowText, Section } from "./ui";
import { getEventCategoryTerms } from "@/lib/intelligence/event-intelligence";

export function YouView() {
  const { data, attendee, avatar, openSheet, offlineStatus, allTicketsCount } = useCompanion();
  const { preferences } = attendee;
  const terms = getEventCategoryTerms(data.event.category, data.event.templateConfig);
  const eventYear = data.event.dateConfirmed === false ? null : data.event.startAt.getFullYear();
  const savedLabel =
    preferences.savedArtists.length === 1
      ? terms.personSingular.toLowerCase()
      : terms.peopleLabel.toLowerCase();
  const totalCheckpoints =
    preferences.stamps.length + preferences.customStamps.filter((s) => s.checked).length;

  return (
    <div className="px-4 pb-6 pt-4">
      {/* Editorial Profile Header */}
      <button
        type="button"
        className="eb-press flex w-full items-center gap-4 border-b border-separator pb-5 text-left"
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
          <span className="eb-page-title block break-words text-[28px]">
            {preferences.hasName
              ? preferences.profile.name
              : terms.isConferenceLike
                ? "Your event name"
                : "Your festival name"}
          </span>
          <span className="mt-1 block text-[14px] text-muted-foreground">
            Edit name · {data.event.name}
            {eventYear ? ` · ${eventYear}` : " · Date TBC"}
          </span>
          {preferences.badges.length > 0 && (
            <span className="mt-1.5 block text-[13px] font-semibold text-primary">
              {preferences.badges.join(" · ")}
            </span>
          )}
        </span>
        <Chevron />
      </button>

      {/* Personal Event History Metrics — Clean Typographic Strip */}
      <div
        className="grid grid-cols-3 border-b border-separator py-4"
        aria-label={`My year in events · ${eventYear}`}
      >
        <div>
          <p className="eb-display text-[26px] tabular-nums">{preferences.savedArtists.length}</p>
          <p className="mt-0.5 truncate text-[13px] text-muted-foreground">Saved {savedLabel}</p>
        </div>
        <div className="border-l border-separator pl-4">
          <p className="eb-display text-[26px] tabular-nums">{totalCheckpoints}</p>
          <p className="mt-0.5 truncate text-[13px] text-muted-foreground">Passport</p>
        </div>
        <div className="border-l border-separator pl-4">
          <p className="eb-display text-[26px] tabular-nums">{preferences.sharedPlans.length}</p>
          <p className="mt-0.5 truncate text-[13px] text-muted-foreground">Crew plans</p>
        </div>
      </div>

      {(preferences.collections.length > 0 || preferences.followedOrganisers.length > 0) && (
        <div className="space-y-1 border-b border-separator py-3 text-[14px] text-muted-foreground">
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

      {/* Personal Collection: Tickets, Memories, Passport & Events */}
      <Section title="Your passes & memories" id="you-saved">
        <div className="eb-list">
          <button type="button" className="eb-row" onClick={() => openSheet({ kind: "ticket" })}>
            <IconTile icon={Ticket} />
            <RowText
              title={allTicketsCount > 0 ? `Your tickets · ${allTicketsCount}` : "Your tickets"}
              subtitle="Ticket vault & offline gate card"
            />
            <Chevron />
          </button>
          <button type="button" className="eb-row" onClick={() => openSheet({ kind: "memories" })}>
            <IconTile icon={Camera} />
            <RowText title="Photo diary" subtitle="Private memories & story cards" />
            <Chevron />
          </button>
          <button type="button" className="eb-row" onClick={() => openSheet({ kind: "passport" })}>
            <IconTile icon={Stamp} />
            <RowText
              title={terms.passportLabel}
              subtitle={`${preferences.stamps.length} stops checked`}
            />
            <Chevron />
          </button>
          <a href="#events" aria-label="Switch event" className="eb-row">
            <IconTile icon={CalendarDays} />
            <RowText title="Switch event" subtitle="Discover & My Events" />
            <Chevron />
          </a>
        </div>
      </Section>

      {/* Operational Settings — Clearly Separated from Memories & History */}
      <AccountPanel />

      <Section title="Preferences & settings" id="you-preferences">
        <div className="eb-list">
          <label className="eb-row">
            <IconTile icon={UserRound} />
            <span className="flex-1 text-[16px] font-medium">Here for</span>
            <select
              aria-label="Festival mode"
              className="min-h-11 max-w-[52%] bg-transparent text-right text-[15px] font-semibold text-primary"
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
          <button type="button" className="eb-row" onClick={() => openSheet({ kind: "updates" })}>
            <IconTile icon={Bell} />
            <RowText title="Event updates" subtitle="Official organiser announcements" />
            <Chevron />
          </button>
          <button type="button" className="eb-row" onClick={() => openSheet({ kind: "privacy" })}>
            <IconTile icon={ShieldCheck} />
            <RowText title="Location & saved data" subtitle="Pins, sharing & device storage" />
            <Chevron />
          </button>
          <button type="button" className="eb-row" onClick={() => openSheet({ kind: "offline" })}>
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
