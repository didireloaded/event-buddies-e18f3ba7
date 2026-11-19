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
  const totalCheckpoints =
    preferences.stamps.length + preferences.customStamps.filter((s) => s.checked).length;
  return (
    <div className="px-4">
      <h1 className="ios-large-title pt-2">You</h1>
      <AccountPanel />
      <button
        type="button"
        className="ios-row mt-4 gap-4 rounded-2xl bg-popover py-5"
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
            {preferences.hasName ? preferences.profile.name : "Your festival name"}
          </span>
          <span className="mt-1 block text-[15px] text-muted-foreground">
            Edit name · {preferences.savedArtists.length} saved artists
          </span>
          {preferences.badges.length > 0 && (
            <span className="mt-1.5 block text-[13px] font-medium text-primary">
              {preferences.badges.join(" · ")}
            </span>
          )}
        </span>
        <Chevron />
      </button>
      <Section title="My year in events · 2026" id="you-year-summary">
        <div className="ios-card space-y-2 p-4 text-[14px]">
          <p className="text-[16px] font-semibold">{data.event.name}</p>
          <p className="text-muted-foreground">
            {preferences.savedArtists.length} saved artists · {totalCheckpoints} passport stops
            checked · {preferences.sharedPlans.length} friend plans imported
          </p>
          {preferences.collections.length > 0 && (
            <p>
              <strong>Collections:</strong> {preferences.collections.join(", ")}
            </p>
          )}
          {preferences.followedOrganisers.length > 0 && (
            <p>
              <strong>Followed organisers:</strong> {preferences.followedOrganisers.join(", ")}
            </p>
          )}
        </div>
      </Section>
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
              subtitle="My Tickets & Passes · Ticket vault offline copy"
            />
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
