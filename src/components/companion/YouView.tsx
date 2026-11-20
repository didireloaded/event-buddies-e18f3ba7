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

  return (
    <div className="ios-profile px-4 pb-6 pt-4">
      <h1 className="mb-5 text-[28px] font-bold leading-tight">Profile</h1>
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
          <span className="block break-words text-[20px] font-semibold leading-snug">
            {preferences.hasName
              ? preferences.profile.name
              : terms.isConferenceLike
                ? "Add your name"
                : "Add your name"}
          </span>
          <span className="mt-1 block text-[14px] text-muted-foreground">
            {data.event.name}
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
      <Section title="Saved" id="you-saved">
        <div className="eb-list">
          <button type="button" className="eb-row" onClick={() => openSheet({ kind: "ticket" })}>
            <IconTile icon={Ticket} />
            <RowText
              title={allTicketsCount > 0 ? `Your tickets · ${allTicketsCount}` : "Your tickets"}
            />
            <Chevron />
          </button>
          <button type="button" className="eb-row" onClick={() => openSheet({ kind: "memories" })}>
            <IconTile icon={Camera} />
            <RowText title="Photo diary" />
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
            <RowText title="Browse events" />
            <Chevron />
          </a>
        </div>
      </Section>

      {/* Operational Settings — Clearly Separated from Memories & History */}
      <AccountPanel />

      <Section title="Settings" id="you-preferences">
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
            <RowText title="Event updates" />
            <Chevron />
          </button>
          <button type="button" className="eb-row" onClick={() => openSheet({ kind: "privacy" })}>
            <IconTile icon={ShieldCheck} />
            <RowText title="Privacy & storage" />
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
