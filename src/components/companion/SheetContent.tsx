import {
  ArrowUpRight,
  Bell,
  CalendarDays,
  Check,
  Cross,
  Download,
  Heart,
  IdCard,
  Map as MapIcon,
  MapPin,
  Music2,
  Search,
  Share2,
  ShieldCheck,
  Shuffle,
  User,
} from "lucide-react";
import { useEffect, useState } from "react";
import { dateLabel } from "@/lib/attendee/event-clock";
import { eventTime } from "@/lib/attendee/schedule";
import { getTicketProviderName } from "@/lib/attendee/tickets";
import { getEventCategoryTerms } from "@/lib/intelligence/event-intelligence";
import { listEventBroadcasts, type OrganiserBroadcast } from "@/lib/organiser/cloud-extensions";
import { cn } from "@/lib/utils";
import { initials, useCompanion, type Sheet as SheetState } from "./context";
import { MeetingForm, ProfileForm } from "./forms";
import { ArtistAvatar } from "./ArtistAvatar";
import { PrivacyPanel } from "./PrivacyPanel";
import { EventAssistant } from "./EventAssistant";
import { SafetyPanel } from "./SafetyAccess";
import { TicketVault } from "./TicketVault";
import { PlanBackup } from "./PlanBackup";
import { OfflineReadiness } from "./OfflineReadiness";
import { QuickPings } from "./QuickPings";
import { FestivalPassport } from "./FestivalPassport";
import { EventMemories } from "./EventMemories";
import { FestivalPlay } from "./FestivalPlay";
import { NearbyPlaces } from "./NearbyPlaces";
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
    default: {
      const terms = getEventCategoryTerms(ctx.data.event.category);
      return {
        menu: "More",
        updates: "Event updates",
        meeting: "Meeting plan",
        privacy: "Location & privacy",
        assistant: "Ask about this event",
        ticket: "My Tickets & Passes",
        "buy-tickets": `Tickets · ${getTicketProviderName(ctx.data.event.ticketUrl ?? ctx.data.festival.ticketUrl)}`,
        safety: "Safety & support",
        backup: "Your saved plan",
        offline: "Offline & installation",
        pings: "Quick message",
        passport: terms.isConferenceLike ? "Event passport" : "Festival passport",
        memories: "Your event memories",
        play: terms.isConferenceLike ? "Event extras" : "Festival extras",
        nearby: "Find nearby facilities",
        install: "Add to Home Screen",
        event: ctx.data.event.name,
        profile: "My profile",
        events: "Coming up",
        rules: "Rules & entry",
        transport: "Getting there",
      }[sheet.kind];
    }
  }
}

const Paragraph = ({ children, className }: { children: React.ReactNode; className?: string }) => (
  <p className={cn("text-[17px] leading-relaxed", className)}>{children}</p>
);

function EventUpdatesSheet({ eventId }: { eventId: string }) {
  const { data } = useCompanion();
  const [broadcasts, setBroadcasts] = useState<OrganiserBroadcast[]>([]);
  useEffect(() => {
    let active = true;
    void listEventBroadcasts(eventId).then((items) => {
      if (active) setBroadcasts(items);
    });
    return () => {
      active = false;
    };
  }, [eventId]);

  if (!data.announcements.length && !broadcasts.length) {
    return (
      <Notice icon={Bell}>
        <strong className="font-semibold">No updates yet.</strong> Organiser announcements appear
        here when published. Check the official event page for the latest news.
      </Notice>
    );
  }

  return (
    <div className="space-y-3">
      {broadcasts.map((b) => (
        <article key={b.id} className="ios-card p-4">
          <p className="text-[13px] font-semibold uppercase text-primary">
            {b.kind === "emergency" ? "Emergency alert" : "Organiser update"} ·{" "}
            {eventTime(new Date(b.createdAt))}
          </p>
          <p className="mt-1 text-[16px]">{b.message}</p>
        </article>
      ))}
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
  );
}

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
  const terms = getEventCategoryTerms(data.event.category);
  const savedCount = preferences.savedArtists.length + preferences.saved.length;

  switch (sheet.kind) {
    case "pings":
      return <QuickPings />;
    case "passport":
      return <FestivalPassport />;
    case "memories":
      return <EventMemories />;
    case "play":
      return <FestivalPlay />;
    case "nearby":
      return <NearbyPlaces />;
    case "assistant":
      return <EventAssistant />;
    case "ticket":
      return <TicketVault />;
    case "safety":
      return <SafetyPanel onDone={closeSheet} />;
    case "buy-tickets": {
      const ticketUrl = data.event.ticketUrl || data.festival.ticketUrl;
      const provider = getTicketProviderName(ticketUrl);
      return (
        <div className="space-y-4">
          <div className="ios-card space-y-2 p-4">
            <p className="text-[17px] font-semibold">{data.event.name}</p>
            <p className="text-[15px] text-muted-foreground">
              Official tickets are sold externally by <strong>{provider}</strong>. Event Buddies
              does not run checkout or verify admission — once you buy, save your ticket copy here
              for offline gate access and map tier unlock.
            </p>
            {data.event.ticketSalesClose && (
              <p className="text-[14px] font-medium text-foreground">
                Sales close{" "}
                {dateLabel(new Date(data.event.ticketSalesClose), data.event.timezone, {
                  day: "numeric",
                  month: "short",
                  year: "numeric",
                })}
              </p>
            )}
          </div>
          {ticketUrl ? (
            <a
              href={ticketUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex min-h-[3.125rem] w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 text-[17px] font-semibold text-primary-foreground"
            >
              Buy from {provider} <ArrowUpRight size={18} aria-hidden />
              <span className="sr-only"> Opens {provider} externally</span>
            </a>
          ) : (
            <p className="text-[15px] text-muted-foreground">
              No external ticket link has been published by the organiser for this event yet.
            </p>
          )}
          <SecondaryButton onClick={() => openSheet({ kind: "ticket" })}>
            I already have a ticket — add it offline
          </SecondaryButton>
        </div>
      );
    }
    case "backup":
      return <PlanBackup />;
    case "offline":
      return <OfflineReadiness />;
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
      const reminded = preferences.reminders.includes(sheet.artist.id);
      const perf = data.performances.find((p) => p.artistId === sheet.artist.id);
      const q = encodeURIComponent(sheet.artist.name);
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
                    : `${terms.placeSingular} assignment awaiting publication`}
              </p>
              <p className="text-[15px] text-muted-foreground">
                {perf
                  ? `${eventTime(perf.scheduledStart)}–${eventTime(perf.scheduledEnd)} CAT`
                  : data.festival.timetablePublished
                    ? "Time to be confirmed"
                    : `${terms.isConferenceLike ? "Session" : "Set"} time awaiting publication`}
              </p>
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
          <SecondaryButton
            disabled={!ready}
            onClick={() => {
              const nextReminders = reminded
                ? preferences.reminders.filter((id) => id !== sheet.artist.id)
                : [...preferences.reminders, sheet.artist.id];
              if (update({ reminders: nextReminders })) {
                if (
                  !reminded &&
                  typeof Notification !== "undefined" &&
                  Notification.permission === "default"
                ) {
                  void Notification.requestPermission();
                }
                notify(
                  reminded
                    ? "In-app reminder turned off"
                    : `In-app reminder saved for when ${terms.isConferenceLike ? "session" : "set"} times are published`,
                );
              }
            }}
          >
            <Bell size={18} />
            {reminded
              ? "Reminder saved on this phone"
              : `Remind me when ${terms.isConferenceLike ? "session" : "set"} time publishes`}
          </SecondaryButton>
          {sheet.artist.stageId && (
            <SecondaryButton onClick={() => openPlace(sheet.artist.stageId!)}>
              <MapIcon size={18} /> Find the {terms.placeSingular.toLowerCase()}
            </SecondaryButton>
          )}
          {!terms.isConferenceLike && (
            <div className="ios-group">
              <a
                href={`https://open.spotify.com/search/${q}`}
                target="_blank"
                rel="noopener noreferrer"
                className="ios-row font-semibold"
              >
                Listen on Spotify <ArrowUpRight size={18} className="ml-auto" />
                <span className="sr-only"> Opens in a new tab</span>
              </a>
              <a
                href={`https://music.apple.com/search?term=${q}`}
                target="_blank"
                rel="noopener noreferrer"
                className="ios-row font-semibold"
              >
                Apple Music search <ArrowUpRight size={18} className="ml-auto" />
                <span className="sr-only"> Opens in a new tab</span>
              </a>
              <a
                href={`https://music.youtube.com/search?q=${q}`}
                target="_blank"
                rel="noopener noreferrer"
                className="ios-row font-semibold"
              >
                YouTube Music search <ArrowUpRight size={18} className="ml-auto" />
                <span className="sr-only"> Opens in a new tab</span>
              </a>
              <a
                href={`https://soundcloud.com/search?q=${q}`}
                target="_blank"
                rel="noopener noreferrer"
                className="ios-row font-semibold"
              >
                SoundCloud sets <ArrowUpRight size={18} className="ml-auto" />
                <span className="sr-only"> Opens in a new tab</span>
              </a>
            </div>
          )}
          <p className="text-[13px] text-muted-foreground">
            {sheet.artist.avatarUrl
              ? `${terms.personSingular} and ${terms.placeSingular.toLowerCase()} details from ${data.festival.organiser}.`
              : `Listed by ${data.festival.organiser}.`}{" "}
            {!terms.isConferenceLike && "External music links open the artist search. "}
            Reminders need confirmed {terms.isConferenceLike ? "session" : "set"} times.
          </p>
        </div>
      );
    }

    case "performance": {
      const p = sheet.performance;
      const saved = preferences.saved.includes(p.id);
      const reminded = preferences.reminders.includes(p.id);
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
          <SecondaryButton
            disabled={!ready || p.status === "cancelled"}
            onClick={() => {
              const nextReminders = reminded
                ? preferences.reminders.filter((id) => id !== p.id)
                : [...preferences.reminders, p.id];
              if (update({ reminders: nextReminders })) {
                if (
                  !reminded &&
                  typeof Notification !== "undefined" &&
                  Notification.permission === "default"
                ) {
                  void Notification.requestPermission();
                }
                notify(
                  reminded ? "Set reminder turned off" : "Set reminder saved (15m before start)",
                );
              }
            }}
          >
            <Bell size={18} />
            {reminded ? "15m reminder saved" : "Remind me 15m before set"}
          </SecondaryButton>
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
          initialBadges={preferences.badges}
          disabled={!ready}
          savedCount={savedCount}
          onSave={(profile, badges) => {
            if (update({ profile, badges: badges ?? preferences.badges, hasName: true })) {
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
          {data.festival.officialUrl && (
            <a
              className="flex min-h-11 items-center gap-1 text-[17px] font-semibold text-primary"
              href={data.festival.officialUrl}
              target="_blank"
              rel="noopener noreferrer"
            >
              Official event information <ArrowUpRight size={17} />
            </a>
          )}
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
            href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${data.event.venueName} ${data.event.city} ${data.event.country}`)}`}
            target="_blank"
            rel="noopener noreferrer"
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
              title={`${data.event.name} · ${data.event.startAt.getFullYear()}`}
              subtitle={`${dateLabel(data.event.startAt, tz, { day: "numeric", month: "short", year: "numeric" })} · ${data.event.city}`}
            />
            <Chevron />
          </button>
          {data.festival.relatedEvent.name && data.festival.relatedEvent.url && (
            <a
              className="ios-row"
              href={data.festival.relatedEvent.url}
              target="_blank"
              rel="noopener noreferrer"
            >
              <RowText
                title={data.festival.relatedEvent.name}
                subtitle={`${data.festival.relatedEvent.date} · ${data.festival.relatedEvent.venue}`}
              />
              <ArrowUpRight size={18} className="text-tertiary-foreground" />
            </a>
          )}
        </div>
      );

    case "updates":
      return <EventUpdatesSheet eventId={data.event.id} />;

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
              <IconTile icon={Search} tone="bg-pin-other" />{" "}
              <RowText
                title={`Find ${/^[aeiou]/i.test(terms.personSingular) ? "an" : "a"} ${terms.personSingular.toLowerCase()}`}
              />{" "}
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
        </div>
      );

    case "event": {
      const eventTicketUrl = data.event.ticketUrl || data.festival.ticketUrl;
      const ticketProvider = getTicketProviderName(eventTicketUrl);
      const hasAge18Rule = data.festival.rules.some((rule) => /\b18\+/i.test(rule));
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
                subtitle={`${eventTime(data.event.startAt)}–${eventTime(data.event.endAt)} CAT${hasAge18Rule ? " · 18+ with ID" : ""}`}
              />
            </div>
            <div className="ios-row">
              <IconTile icon={Music2} />
              <RowText
                title={`${data.stages.length} ${data.stages.length === 1 ? terms.placeSingular.toLowerCase() : terms.placesLabel.toLowerCase()} · ${data.festival.artists.length} announced ${data.festival.artists.length === 1 ? terms.personSingular.toLowerCase() : terms.peopleLabel.toLowerCase()}`}
                subtitle={`Organised by ${data.festival.organiser}`}
              />
            </div>
          </div>
          {eventTicketUrl && (
            <a
              className="flex min-h-[3.125rem] w-full items-center justify-center gap-2 rounded-xl bg-primary text-[17px] font-semibold text-primary-foreground"
              href={eventTicketUrl}
              target="_blank"
              rel="noopener noreferrer"
            >
              Tickets on {ticketProvider} <ArrowUpRight size={18} />
            </a>
          )}
          <div className="grid grid-cols-2 gap-2">
            <SecondaryButton
              onClick={() => {
                closeSheet();
                navigate("lineup");
              }}
            >
              <Music2 size={18} /> {terms.programLabel}
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
            {eventTicketUrl
              ? `Ticket purchases happen on ${ticketProvider}, not in this app.`
              : "Ticket purchases happen directly with the organiser, not in this app."}{" "}
            {data.event.id === "sound-of-summer-2026"
              ? "Past-edition photo from Namib Rage’s official gallery. "
              : ""}
            Information checked {data.festival.sourceCheckedAt}.
          </p>
          {data.festival.officialUrl && (
            <a
              className="flex min-h-11 items-center gap-1 text-[17px] font-semibold text-primary"
              href={data.festival.officialUrl}
              target="_blank"
              rel="noopener noreferrer"
            >
              Official event page <ArrowUpRight size={17} />
            </a>
          )}
        </div>
      );
    }

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
          <p className="text-[15px] leading-relaxed text-muted-foreground">
            On iPhone, web notifications require iOS 16.4 or later and an installed Home Screen app.
            Crew alerts and push delivery aren’t enabled yet. Check your plans directly in the app.
          </p>
        </div>
      );

    case "meeting":
      return (
        <MeetingForm
          account={Boolean(attendee.auth.user)}
          eventStart={data.event.startAt}
          eventEnd={data.event.endAt}
          timezone={tz}
          places={places}
          initial={
            preferences.meeting
              ? { ...preferences.meeting, pointId: sheet.pointId ?? preferences.meeting.pointId }
              : null
          }
          selectedId={sheet.pointId ?? map.selected}
          disabled={!ready}
          onSave={(next) => {
            if (update({ meeting: next })) {
              notify(
                next
                  ? attendee.auth.user
                    ? "Meeting plan queued for account sync"
                    : "Meeting plan saved on this device"
                  : "Meeting plan removed",
              );
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
              {member.displayName}’s continuous GPS location isn’t tracked. Sign in to share
              expiring landmark pins with a connected crew.
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
