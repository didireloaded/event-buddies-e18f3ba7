import {
  ArrowUpRight,
  Beer,
  CalendarDays,
  Cross,
  Heart,
  IdCard,
  Map as MapIcon,
  MapPin,
  Share2,
  Ticket,
  Toilet,
  Users,
  Utensils,
  ArrowRightToLine,
  Building2,
} from "lucide-react";
import { dateLabel, eventPhase } from "@/lib/attendee/event-clock";
import { eventTime } from "@/lib/attendee/schedule";
import type { MapFilter } from "@/lib/attendee/map";
import { initials, useCompanion } from "./context";
import { ArtistRow } from "./LineupView";
import { Avatar, Chevron, IconTile, PrimaryButton, RowText, Section } from "./ui";
import { cn } from "@/lib/utils";

export function HomeView({ onShare }: { onShare: () => void }) {
  const { data, attendee, now, navigate, openSheet, showOnMap, places } = useCompanion();
  const { preferences, toggleFollow, toggleArtist, ready } = attendee;
  const phase = eventPhase(data, now);
  const tz = data.event.timezone;
  const longDate = dateLabel(data.event.startAt, tz, {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
  const count = (types: string[]) => places.filter((p) => types.includes(p.type)).length;
  const shortcuts: { filter: MapFilter; label: string; count: number; icon: typeof Toilet }[] = [
    { filter: "toilet", label: "Toilets", count: count(["toilet"]), icon: Toilet },
    { filter: "bar", label: "Bars", count: count(["bar"]), icon: Beer },
    {
      filter: "safety",
      label: "Medics",
      count: count(["first-aid", "security", "exit"]),
      icon: Cross,
    },
    { filter: "food", label: "Food", count: count(["food"]), icon: Utensils },
    { filter: "entrance", label: "Gates", count: count(["entrance"]), icon: ArrowRightToLine },
  ];
  const meeting = preferences.meeting;
  const meetingPlace = meeting ? places.find((p) => p.id === meeting.pointId) : undefined;

  return (
    <>
      <div className="px-4">
        <p className="eyebrow pt-2">{phase.label}</p>
        <h1 className="display-title mt-1 text-[44px]">
          {data.event.name} 2026
        </h1>
        <p className="mt-1 text-[17px] text-muted-foreground">
          {dateLabel(data.event.startAt, tz, { weekday: "short", day: "numeric", month: "short" })}{" "}
          · {data.event.venueName}, {data.event.city}
        </p>
      </div>

      <figure className="mt-4 px-4">
        <img
          src={data.event.heroImageUrl}
          alt="Crowd at a past Sound of Summer edition, from Namib Rage’s official gallery"
          width={1200}
          height={800}
          fetchPriority="high"
          className="aspect-[16/7] w-full rounded-xl bg-muted object-cover"
        />
        <figcaption className="ios-footnote px-1">Past edition · Namib Rage gallery</figcaption>
      </figure>

      <Section title="Find your way" id="home-venue" className="px-4">
        <PrimaryButton onClick={() => navigate("map")}>
          <MapIcon size={20} /> Open venue map
        </PrimaryButton>
        <ul className="mt-3 grid grid-cols-5 gap-2" aria-label="Jump to amenities">
          {shortcuts.map(({ filter, label, count: n, icon: Icon }) => (
            <li key={filter}>
              <button
                type="button"
                onClick={() => showOnMap(filter)}
                className="flex min-h-[4.5rem] w-full flex-col items-center justify-center gap-1 rounded-xl bg-popover px-1 text-[13px] font-semibold ring-1 ring-border active:bg-fill"
                aria-label={`${label}: ${n} on the venue plan`}
              >
                <Icon size={22} aria-hidden />
                <span>{label}</span>
              </button>
            </li>
          ))}
        </ul>
      </Section>

      <Section title="Event" id="home-event" className="px-4">
        <div className="ios-group ios-group-indent">
          <div className="ios-row">
            <IconTile icon={CalendarDays} tone="bg-destructive" />
            <RowText
              title={longDate}
              subtitle={`${eventTime(data.event.startAt)}–${eventTime(data.event.endAt)} CAT`}
            />
          </div>
          <button
            type="button"
            className="ios-row"
            onClick={() => openSheet({ kind: "transport" })}
          >
            <IconTile icon={MapPin} tone="bg-pin-entrance" />
            <RowText
              title={data.event.venueName}
              subtitle={`${data.event.city} · Parking & buses`}
            />
            <Chevron />
          </button>
          <button type="button" className="ios-row" onClick={() => openSheet({ kind: "rules" })}>
            <IconTile icon={IdCard} tone="bg-pin-amenity" />
            <RowText title="18+ with valid ID" subtitle="Rules & prohibited items" />
            <Chevron />
          </button>
          <a
            className="ios-row"
            href={data.event.ticketUrl ?? data.festival.ticketUrl}
            target="_blank"
            rel="noreferrer"
          >
            <IconTile icon={Ticket} />
            <RowText title="Tickets on Howler" subtitle="Official ticketing site" />
            <ArrowUpRight size={18} className="text-tertiary-foreground" aria-hidden />
            <span className="sr-only">(opens in a new tab)</span>
          </a>
          <button type="button" className="ios-row" onClick={() => openSheet({ kind: "event" })}>
            <IconTile icon={Building2} tone="bg-pin-other" />
            <RowText title="Event details" subtitle={`Organised by ${data.festival.organiser}`} />
            <Chevron />
          </button>
        </div>
        <div className="mt-3 grid grid-cols-2 gap-2">
          <button
            type="button"
            disabled={!ready}
            aria-pressed={preferences.following}
            onClick={toggleFollow}
            className={cn(
              "flex min-h-11 items-center justify-center gap-2 rounded-xl bg-popover ring-1 ring-border text-[15px] font-semibold",
              preferences.following ? "text-favorite" : "text-primary",
            )}
          >
            <Heart size={18} fill={preferences.following ? "currentColor" : "none"} aria-hidden />
            {preferences.following ? "Saved" : "Save event"}
          </button>
          <button
            type="button"
            onClick={onShare}
            className="flex min-h-11 items-center justify-center gap-2 rounded-xl bg-popover ring-1 ring-border text-[15px] font-semibold text-primary"
          >
            <Share2 size={18} aria-hidden /> Share
          </button>
        </div>
      </Section>

      <Section
        title="Lineup"
        id="home-lineup"
        className="px-4"
        action={
          <a href="#lineup" className="mb-1 min-h-11 content-center px-1 text-[15px] text-primary">
            See all
          </a>
        }
        footer="Set times haven’t been published yet."
      >
        <div className="ios-group ios-group-indent">
          {data.festival.artists.slice(0, 3).map((artist) => (
            <ArtistRow
              key={artist.id}
              artist={artist}
              saved={preferences.savedArtists.includes(artist.id)}
              disabled={!ready}
              onOpen={() => openSheet({ kind: "artist", artist })}
              onSave={() => toggleArtist(artist.id)}
            />
          ))}
        </div>
      </Section>

      <Section title="Your crew" id="home-crew" className="px-4">
        <div className="ios-group">
          <a href="#crew" className="ios-row py-3">
            <span className="flex -space-x-2">
              {data.crewMembers.slice(0, 3).map((member, index) => (
                <span key={member.userId} className="rounded-full ring-2 ring-card">
                  <Avatar
                    index={index}
                    label={initials(index === 0 ? preferences.profile.name : member.displayName)}
                  />
                </span>
              ))}
            </span>
            <RowText
              title={meetingPlace ? `Meet at ${meetingPlace.name}` : data.crew.name}
              subtitle={
                meeting
                  ? `${eventTime(meeting.at)} CAT · saved on this device`
                  : "Plan where to regroup"
              }
            />
            <Chevron />
          </a>
        </div>
      </Section>

      <Section title="Also from Namib Rage" id="home-related" className="px-4">
        <div className="ios-group">
          <a
            className="ios-row"
            href={data.festival.relatedEvent.url}
            target="_blank"
            rel="noreferrer"
          >
            <IconTile icon={Users} tone="bg-pin-amenity" />
            <RowText
              title={data.festival.relatedEvent.name}
              subtitle={`${data.festival.relatedEvent.date} · ${data.festival.relatedEvent.venue}`}
            />
            <ArrowUpRight size={18} className="text-tertiary-foreground" aria-hidden />
            <span className="sr-only">(opens in a new tab)</span>
          </a>
        </div>
      </Section>

      <p className="ios-footnote mt-6 px-8 pb-4 text-center">
        Demo companion. Your saved choices stay in this browser on this device. Information checked{" "}
        {data.festival.sourceCheckedAt}.
      </p>
    </>
  );
}
