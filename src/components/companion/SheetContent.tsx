import {
  ArrowUpRight,
  Bell,
  CalendarDays,
  Check,
  Cross,
  Download,
  Heart,
  IdCard,
  LayoutDashboard,
  Map as MapIcon,
  MapPin,
  Music2,
  Search,
  Share2,
  ShieldCheck,
  Shuffle,
  User,
} from "lucide-react";
import { Link } from "@tanstack/react-router";
import { dateLabel } from "@/lib/attendee/event-clock";
import { eventTime } from "@/lib/attendee/schedule";
import { cn } from "@/lib/utils";
import { initials, useCompanion, type Sheet as SheetState } from "./context";
import { MeetingForm, ProfileForm } from "./forms";
import { ArtistAvatar } from "./ArtistAvatar";
import { PrivacyPanel } from "./PrivacyPanel";
import { TYPE_LABELS, placeIcon, placeTone } from "./places";
import { Avatar, Chevron, IconTile, Notice, PrimaryButton, RowText, SecondaryButton } from "./ui";

export function sheetTitle(sheet: NonNullable<SheetState>, ctx: ReturnType<typeof useCompanion>) {
  switch (sheet.kind) {
    case "places":
      return "Choose a place";
    case "artist":
      return sheet.artist.name;
    case "performance":
      return sheet.performance.artistName;
    case "roulette":
      return "Discover";
    case "member": {
      const index = ctx.data.crewMembers.findIndex((m) => m.userId === sheet.id);
      return index === 0
        ? ctx.attendee.preferences.profile.name
        : (ctx.data.crewMembers[index]?.displayName ?? "Crew member");
    }
    default:
      return {
        menu: "More",
        updates: "Event updates",
        meeting: "Meeting plan",
        privacy: "Location & privacy",
        install: "Add to Home Screen",
        event: ctx.data.event.name,
        profile: "My profile",
        events: "Coming up",
        rules: "Rules & entry",
        transport: "Getting there",
      }[sheet.kind];
  }
}

const Paragraph = ({ children, className }: { children: React.ReactNode; className?: string }) => (
  <p className={cn("text-[17px] leading-relaxed", className)}>{children}</p>
);

export function SheetContent({
  sheet,
  onShare,
}: {
  sheet: NonNullable<SheetState>;
  onShare: () => void;
}) {
  const ctx = useCompanion();
  const {
    data,
    places,
    attendee,
    openSheet,
    closeSheet,
    openPlace,
    navigate,
    showOnMap,
    spin,
    map,
  } = ctx;
  const { preferences, ready, toggleArtist, toggleSaved, notify, update } = attendee;
  const tz = data.event.timezone;
  const savedCount = preferences.savedArtists.length + preferences.saved.length;

  switch (sheet.kind) {
    case "places":
      return (
        <div className="ios-group ios-group-indent">
          {places
            .filter((p) => sheet.ids.includes(p.id))
            .map((p) => (
              <button key={p.id} type="button" className="ios-row" onClick={() => openPlace(p.id)}>
                <IconTile icon={placeIcon(p.type)} tone={placeTone(p.type)} />
                <RowText title={p.name} subtitle={TYPE_LABELS[p.type] ?? p.type} />
                <Chevron />
              </button>
            ))}
        </div>
      );

    case "artist": {
      const saved = preferences.savedArtists.includes(sheet.artist.id);
      return (
        <div className="space-y-4">
          <div className="flex items-center gap-4 pt-2">
            <ArtistAvatar artist={sheet.artist} large />
            <div>
              <p className="text-[15px] font-semibold text-primary">{sheet.artist.role}</p>
              <p className="text-[17px]">
                {sheet.artist.stageId
                  ? data.stages.find((stage) => stage.id === sheet.artist.stageId)?.name
                  : sheet.artist.role === "Coke Studio Stage"
                    ? "Coke Studio Stage · venue-plan correspondence pending"
                    : "Stage assignment awaiting publication"}
              </p>
              <p className="text-[15px] text-muted-foreground">Set time awaiting publication</p>
            </div>
          </div>
          <PrimaryButton
            disabled={!ready}
            aria-pressed={saved}
            onClick={() => toggleArtist(sheet.artist.id)}
            className={saved ? "bg-favorite" : ""}
          >
            {saved ? <Check size={19} /> : <Heart size={19} />}
            {saved ? "Saved to favourites" : "Save to favourites"}
          </PrimaryButton>
          {sheet.artist.stageId && (
            <SecondaryButton onClick={() => openPlace(sheet.artist.stageId!)}>
              <MapIcon size={18} /> Find the stage
            </SecondaryButton>
          )}
          <p className="text-[13px] text-muted-foreground">
            {sheet.artist.avatarUrl
              ? "Artist and stage billing from the supplied 2026 announcement posts."
              : "Announced on the organiser’s website and Howler."}{" "}
            Reminders need confirmed set times.
          </p>
        </div>
      );
    }

    case "performance": {
      const p = sheet.performance;
      const saved = preferences.saved.includes(p.id);
      return (
        <div className="space-y-4">
          <div className="ios-group ios-group-indent">
            <div className="ios-row">
              <IconTile icon={CalendarDays} tone="bg-destructive" />
              <RowText
                title={dateLabel(p.scheduledStart, tz)}
                subtitle={`${eventTime(p.scheduledStart)}–${eventTime(p.scheduledEnd)} CAT`}
              />
            </div>
            <div className="ios-row">
              <IconTile icon={Music2} />
              <RowText
                title={data.stages.find((s) => s.id === p.stageId)?.name ?? "Stage"}
                subtitle={p.genre ?? undefined}
              />
            </div>
          </div>
          {p.status === "cancelled" && (
            <Notice icon={Bell} tone="warning">
              This performance is cancelled.
            </Notice>
          )}
          <PrimaryButton
            disabled={!ready || p.status === "cancelled"}
            onClick={() => toggleSaved(p.id)}
          >
            {saved ? "Remove from my lineup" : "Add to my lineup"}
          </PrimaryButton>
          <SecondaryButton onClick={() => openPlace(p.stageId)}>
            <MapIcon size={18} /> Find the stage
          </SecondaryButton>
        </div>
      );
    }

    case "roulette":
      return (
        <div className="space-y-4 pt-2">
          {sheet.performance ? (
            <>
              <div className="ios-card p-4">
                <p className="text-[15px] text-muted-foreground">{sheet.performance.genre}</p>
                <p className="text-[22px] font-bold">{sheet.performance.artistName}</p>
                <p className="text-[15px] text-muted-foreground">
                  {eventTime(sheet.performance.scheduledStart)} CAT
                </p>
              </div>
              <PrimaryButton
                disabled={!ready}
                onClick={() => toggleSaved(sheet.performance!.id) && closeSheet()}
              >
                Add to my lineup
              </PrimaryButton>
            </>
          ) : (
            <Notice icon={Heart}>
              <strong className="font-semibold">All announced artists saved.</strong> New
              announcements will appear in the lineup.
            </Notice>
          )}
          <SecondaryButton onClick={spin}>
            <Shuffle size={18} /> Try again
          </SecondaryButton>
        </div>
      );

    case "profile":
      return (
        <ProfileForm
          initial={preferences.profile}
          disabled={!ready}
          savedCount={savedCount}
          onSave={(profile) => {
            if (update({ profile, hasName: true })) {
              notify("Profile saved on this device");
              closeSheet();
            }
          }}
        />
      );

    case "rules":
      return (
        <div className="space-y-4">
          <p className="text-[15px] text-muted-foreground">
            Published by the organiser and ticketing provider.
          </p>
          <ul className="ios-group">
            {data.festival.rules.map((rule) => (
              <li key={rule} className="ios-row items-start py-3 text-[17px] leading-snug">
                {rule}
              </li>
            ))}
          </ul>
          <a
            className="flex min-h-11 items-center gap-1 text-[17px] font-semibold text-primary"
            href={data.festival.officialUrl}
            target="_blank"
            rel="noreferrer"
          >
            Official event information <ArrowUpRight size={17} />
          </a>
        </div>
      );

    case "transport":
      return (
        <div className="space-y-4">
          <div className="ios-card p-4">
            <p className="text-[17px] font-semibold">{data.event.venueName}</p>
            <p className="text-[15px] text-muted-foreground">
              {data.event.city}, {data.event.country}
            </p>
          </div>
          <Paragraph>{data.festival.transport}</Paragraph>
          <a
            className="flex min-h-[3.125rem] w-full items-center justify-center gap-2 rounded-xl bg-primary text-[17px] font-semibold text-primary-foreground"
            href="https://www.google.com/maps/search/?api=1&query=Tidal+Pools+Jetty+Beach+Langstrand+Namibia"
            target="_blank"
            rel="noreferrer"
          >
            Open venue in Maps <ArrowUpRight size={18} />
          </a>
          <p className="text-[13px] text-muted-foreground">
            Opens your maps app with a place search. In-venue walking routes aren’t available yet.
            Plan a designated driver or shared transport home.
          </p>
        </div>
      );

    case "events":
      return (
        <div className="ios-group ios-group-indent">
          <button type="button" className="ios-row" onClick={() => openSheet({ kind: "event" })}>
            <RowText
              title={`${data.event.name} 2026`}
              subtitle={`${dateLabel(data.event.startAt, tz, { day: "numeric", month: "short", year: "numeric" })} · ${data.event.city}`}
            />
            <Chevron />
          </button>
          <a
            className="ios-row"
            href={data.festival.relatedEvent.url}
            target="_blank"
            rel="noreferrer"
          >
            <RowText
              title={data.festival.relatedEvent.name}
              subtitle={`${data.festival.relatedEvent.date} · ${data.festival.relatedEvent.venue}`}
            />
            <ArrowUpRight size={18} className="text-tertiary-foreground" />
          </a>
        </div>
      );

    case "updates":
      return data.announcements.length ? (
        <div className="space-y-3">
          {data.announcements.map((a) => (
            <article key={a.id} className="ios-card p-4">
              <p className="text-[13px] text-muted-foreground">
                {eventTime(a.publishAt)} · {a.category}
              </p>
              <h3 className="text-[17px] font-semibold">{a.title}</h3>
              <p className="text-[15px]">{a.body}</p>
            </article>
          ))}
        </div>
      ) : (
        <Notice icon={Bell}>
          <strong className="font-semibold">No updates yet.</strong> Organiser announcements will
          appear here once live delivery is connected. Check the official event page for the latest
          news.
        </Notice>
      );

    case "menu":
      return (
        <div className="space-y-6">
          <div className="ios-group ios-group-indent">
            <button
              type="button"
              className="ios-row"
              onClick={() => openSheet({ kind: "profile" })}
            >
              <IconTile icon={User} /> <RowText title="My profile" /> <Chevron />
            </button>
            <button
              type="button"
              className="ios-row"
              onClick={() => openSheet({ kind: "updates" })}
            >
              <IconTile icon={Bell} tone="bg-destructive" /> <RowText title="Event updates" />{" "}
              <Chevron />
            </button>
            <button type="button" className="ios-row" onClick={() => openSheet({ kind: "event" })}>
              <IconTile icon={CalendarDays} tone="bg-pin-amenity" />{" "}
              <RowText title="Event details" /> <Chevron />
            </button>
            <button type="button" className="ios-row" onClick={() => openSheet({ kind: "rules" })}>
              <IconTile icon={IdCard} tone="bg-pin-amenity" /> <RowText title="Rules & entry" />{" "}
              <Chevron />
            </button>
            <button
              type="button"
              className="ios-row"
              onClick={() => openSheet({ kind: "transport" })}
            >
              <IconTile icon={MapPin} tone="bg-pin-entrance" />{" "}
              <RowText title="Transport & parking" /> <Chevron />
            </button>
          </div>
          <div className="ios-group ios-group-indent">
            <button
              type="button"
              className="ios-row"
              onClick={() => {
                closeSheet();
                ctx.focusLineupSearch();
              }}
            >
              <IconTile icon={Search} tone="bg-pin-other" /> <RowText title="Find an artist" />{" "}
              <Chevron />
            </button>
            <button type="button" className="ios-row" onClick={() => showOnMap("safety")}>
              <IconTile icon={Cross} tone="bg-pin-safety" /> <RowText title="Medic points" />{" "}
              <Chevron />
            </button>
            <button
              type="button"
              className="ios-row"
              onClick={() => openSheet({ kind: "privacy" })}
            >
              <IconTile icon={ShieldCheck} tone="bg-pin-entrance" />{" "}
              <RowText title="Location & privacy" /> <Chevron />
            </button>
            <button
              type="button"
              className="ios-row"
              onClick={() => openSheet({ kind: "install" })}
            >
              <IconTile icon={Download} tone="bg-pin-other" />{" "}
              <RowText title="Add to Home Screen" /> <Chevron />
            </button>
          </div>
          <div className="ios-group">
            <Link to="/organiser" className="ios-row" onClick={closeSheet}>
              <IconTile icon={LayoutDashboard} tone="bg-pin-other" />
              <RowText title="Organiser workspace" subtitle="Demo preview · read-only data" />
              <Chevron />
            </Link>
          </div>
        </div>
      );

    case "event":
      return (
        <div className="space-y-4">
          <Paragraph className="text-muted-foreground">{data.event.description}</Paragraph>
          <div className="ios-group ios-group-indent">
            <div className="ios-row">
              <IconTile icon={MapPin} tone="bg-pin-entrance" />
              <RowText
                title={data.event.venueName}
                subtitle={`${data.event.city}, ${data.event.country}`}
              />
            </div>
            <div className="ios-row">
              <IconTile icon={CalendarDays} tone="bg-destructive" />
              <RowText
                title={dateLabel(data.event.startAt, tz, {
                  weekday: "long",
                  day: "numeric",
                  month: "long",
                  year: "numeric",
                })}
                subtitle={`${eventTime(data.event.startAt)}–${eventTime(data.event.endAt)} CAT · 18+ with ID`}
              />
            </div>
            <div className="ios-row">
              <IconTile icon={Music2} />
              <RowText
                title={`${data.stages.length} stages · ${data.festival.artists.length} announced artists`}
                subtitle={`Organised by ${data.festival.organiser}`}
              />
            </div>
          </div>
          <a
            className="flex min-h-[3.125rem] w-full items-center justify-center gap-2 rounded-xl bg-primary text-[17px] font-semibold text-primary-foreground"
            href={data.event.ticketUrl ?? data.festival.ticketUrl}
            target="_blank"
            rel="noreferrer"
          >
            Tickets on Howler <ArrowUpRight size={18} />
          </a>
          <div className="grid grid-cols-2 gap-2">
            <SecondaryButton
              onClick={() => {
                closeSheet();
                navigate("lineup");
              }}
            >
              <Music2 size={18} /> Lineup
            </SecondaryButton>
            <SecondaryButton onClick={onShare}>
              <Share2 size={18} /> Share
            </SecondaryButton>
          </div>
          <p className="text-[15px] leading-relaxed text-muted-foreground">
            {data.festival.timingNotice}
          </p>
          <p className="text-[15px] leading-relaxed text-muted-foreground">
            {data.festival.mapNotice}
          </p>
          <p className="text-[13px] text-muted-foreground">
            Ticket purchases happen on Howler, not in this app. Past-edition photo from Namib Rage’s
            official gallery. Information checked {data.festival.sourceCheckedAt}.
          </p>
          <a
            className="flex min-h-11 items-center gap-1 text-[17px] font-semibold text-primary"
            href={data.festival.officialUrl}
            target="_blank"
            rel="noreferrer"
          >
            Official event page <ArrowUpRight size={17} />
          </a>
        </div>
      );

    case "privacy":
      return <PrivacyPanel />;

    case "install":
      return (
        <div className="space-y-4 pt-1">
          <ol className="ios-group ios-group-indent list-none">
            <li className="ios-row">
              <IconTile icon={Search} tone="bg-pin-other" />
              <RowText title="Open this app in Safari on iPhone" />
            </li>
            <li className="ios-row">
              <IconTile icon={Share2} />
              <RowText title="Tap the Share button" />
            </li>
            <li className="ios-row">
              <IconTile icon={Download} tone="bg-pin-entrance" />
              <RowText title="Choose Add to Home Screen, then Add" />
            </li>
          </ol>
          <p className="text-[15px] leading-relaxed text-muted-foreground">
            On Android, use your browser’s Install app option. After one connected visit to the
            published app, the event info, lineup and venue plan open without signal. Offline mode
            isn’t active in the editor preview.
          </p>
        </div>
      );

    case "meeting":
      return (
        <MeetingForm
          eventStart={data.event.startAt}
          eventEnd={data.event.endAt}
          timezone={tz}
          places={places}
          initial={preferences.meeting}
          selectedId={map.selected}
          disabled={!ready}
          onSave={(next) => {
            if (update({ meeting: next })) {
              notify(next ? "Meeting plan saved on this device" : "Meeting plan removed");
              closeSheet();
              if (next) navigate("crew");
            }
          }}
        />
      );

    case "member": {
      const index = data.crewMembers.findIndex((m) => m.userId === sheet.id);
      const member = data.crewMembers[index];
      if (!member) return null;
      const isMe = index === 0;
      return (
        <div className="space-y-4 pt-1">
          <div className="flex items-center gap-3">
            <Avatar
              size="lg"
              index={index}
              label={initials(isMe ? preferences.profile.name : member.displayName)}
            />
            <p className="text-[15px] text-muted-foreground">
              {isMe
                ? "Your status · saved on this device"
                : "Demo crew profile. Location sharing is off."}
            </p>
          </div>
          {isMe ? (
            <div role="group" aria-label="Your status" className="ios-group">
              {[
                "Enjoying the music",
                "At the bar",
                "Getting food",
                "Taking a breather",
                "Ready to go",
              ].map((status) => (
                <button
                  key={status}
                  type="button"
                  className="ios-row"
                  aria-pressed={preferences.status === status}
                  disabled={!ready}
                  onClick={() => update({ status }) && notify("Status saved on this device")}
                >
                  <RowText title={status} />
                  {preferences.status === status && (
                    <Check size={20} className="text-primary" aria-hidden />
                  )}
                </button>
              ))}
            </div>
          ) : (
            <Notice icon={ShieldCheck}>
              {member.displayName}’s live location isn’t available. Cross-device sharing needs
              accounts and consent, which aren’t connected yet.
            </Notice>
          )}
          {isMe && (
            <SecondaryButton onClick={() => openSheet({ kind: "profile" })}>
              <User size={18} /> Edit profile
            </SecondaryButton>
          )}
        </div>
      );
    }
  }
}
