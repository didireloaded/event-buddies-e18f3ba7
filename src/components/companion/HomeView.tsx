import {
  ArrowUpRight,
  CalendarDays,
  Heart,
  IdCard,
  Map as MapIcon,
  MapPin,
  Share2,
  Ticket,
  Users,
  Building2,
} from "lucide-react";
import { dateLabel, eventPhase } from "@/lib/attendee/event-clock";
import { eventTime } from "@/lib/attendee/schedule";
import { useCompanion } from "./context";
import { ArtistRow } from "./LineupView";
import { Chevron, IconTile, PrimaryButton, RowText, Section } from "./ui";
import { cn } from "@/lib/utils";
import { RideBookmark } from "./RideBookmark";

export function HomeView({ onShare }: { onShare: () => void }) {
  const { data, attendee, now, navigate, openSheet, places } = useCompanion();
  const { preferences, toggleFollow, toggleArtist, ready } = attendee;
  const phase = eventPhase(data, now);
  const tz = data.event.timezone;
  const longDate = dateLabel(data.event.startAt, tz, {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
  const meeting = preferences.meeting;
  const meetingPlace = meeting ? places.find((p) => p.id === meeting.pointId) : undefined;

  return (
    <>
      <div className="px-4">
        <div className="flex items-center justify-between gap-3 pt-3 text-[11px] font-bold uppercase tracking-wide">
          <span className="flex items-center gap-1">
            <MapPin size={13} aria-hidden />
            {data.event.city}, {data.event.country}
          </span>
          <time>
            {dateLabel(data.event.startAt, tz, {
              day: "2-digit",
              month: "2-digit",
              year: "2-digit",
            })}
          </time>
        </div>
        <h1 className="display-title mt-6 text-[clamp(3.5rem,20vw,6rem)] leading-[1.03] uppercase">
          Sound of
          <br />
          <span className="text-favorite">Summer</span>
        </h1>
      </div>

      {ready && !preferences.festivalMode && (
        <section
          aria-labelledby="first-visit-title"
          className="mx-4 mt-5 border-y border-border py-4"
        >
          <h2 id="first-visit-title" className="text-[20px] font-bold">
            How are you spending the festival?
          </h2>
          <p className="mb-3 mt-1 text-[15px] text-muted-foreground">
            Save your artists, choose a meeting point and share the plan with your friends.
          </p>
          <div className="grid grid-cols-2 gap-2">
            <PrimaryButton
              onClick={() => {
                if (attendee.update({ festivalMode: "music" })) navigate("lineup");
              }}
            >
              Here for music
            </PrimaryButton>
            <PrimaryButton
              onClick={() => {
                if (attendee.update({ festivalMode: "friends" })) navigate("crew");
              }}
            >
              Plan with friends
            </PrimaryButton>
          </div>
          <a href="#map" className="mt-2 flex min-h-11 items-center font-semibold">
            Explore the grounds ↗
          </a>
        </section>
      )}
      <figure className="relative mx-4 mt-4 overflow-hidden">
        <img
          src={data.event.heroImageUrl}
          alt="Crowd at a past Sound of Summer edition, from Namib Rage’s official gallery"
          width={1200}
          height={800}
          fetchPriority="high"
          className="aspect-[1.4] w-full bg-muted object-cover grayscale"
        />
        <figcaption className="absolute inset-x-0 bottom-0 flex items-end justify-between bg-gradient-to-t from-foreground/80 to-transparent p-4 text-primary-foreground">
          <span className="text-[20px] font-extrabold uppercase leading-none">
            One coast.
            <br />
            Three stages.
          </span>
          <button
            type="button"
            onClick={() => openSheet({ kind: "event" })}
            aria-label="About Sound of Summer"
            className="grid size-11 place-items-center rounded-full bg-background text-foreground"
          >
            <ArrowUpRight size={24} />
          </button>
        </figcaption>
        <span className="absolute right-4 top-4 grid size-16 rotate-12 place-content-center rounded-full bg-success text-center text-primary-foreground">
          <strong className="text-[30px] leading-none">28</strong>
          <span className="text-[11px] font-bold tracking-widest">DEC</span>
        </span>
      </figure>

      <div className="px-4 pt-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-[15px] font-bold">{data.event.venueName}</p>
            <p className="mt-1 text-[13px] text-muted-foreground">
              Monday 28 December · From {eventTime(data.event.startAt)}
            </p>
          </div>
          <button
            type="button"
            disabled={!ready}
            aria-label="Save event"
            aria-pressed={preferences.following}
            onClick={toggleFollow}
            className="grid size-11 place-items-center rounded-full bg-muted"
          >
            <Heart size={21} fill={preferences.following ? "currentColor" : "none"} />
          </button>
        </div>
        <p className="my-4 border-t border-border pt-3 text-[12px] font-semibold text-favorite">
          {phase.label}
        </p>
        <PrimaryButton onClick={() => navigate("map")}>
          <MapIcon size={20} /> Open event <ArrowUpRight size={20} className="ml-auto" />
        </PrimaryButton>
        <div className="mt-5 grid grid-cols-2 gap-3">
          <a
            href="#lineup"
            className="flex min-h-44 flex-col justify-between rounded-2xl bg-favorite p-4 text-primary-foreground"
          >
            <CalendarDays size={24} />
            <span className="display-title text-[27px] uppercase leading-tight">
              Your night.
              <br />
              Your lineup.
            </span>
            <span className="text-[13px]">
              {preferences.savedArtists.length} saved · Explore lineup ↗
            </span>
          </a>
          <a
            href="#crew"
            className="flex min-h-44 flex-col justify-between rounded-2xl bg-primary p-4 text-primary-foreground"
          >
            <Users size={24} />
            <span className="display-title text-[27px] uppercase leading-tight">
              Better
              <br />
              together.
            </span>
            <span className="text-[13px]">
              {meeting ? "Your meeting plan" : "Plan with friends"} ↗
            </span>
          </a>
        </div>
      </div>

      <RideBookmark />
      <div className="mx-4 my-4 border-b border-border pb-4">
        <h2 className="text-[20px] font-bold">Coast watch</h2>
        <p className="mt-1 text-[15px] text-muted-foreground">
          Sunset, weather and tide information pending.
        </p>
        <p className="mt-2 text-[15px]">
          Bring warm layers for the evening. Check beach conditions with the on-site team.
        </p>
      </div>
      <Section title="Event" id="home-event" className="px-4">
        <div className="ios-group ios-group-indent">
          <div className="ios-row">
            <IconTile icon={CalendarDays} />
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
            <IconTile icon={Users} />
            <RowText
              title={
                meetingPlace ? `Meet at ${meetingPlace.name}` : "Make a plan with your friends"
              }
              subtitle={
                meeting
                  ? `${eventTime(meeting.at)} CAT · saved on this device`
                  : "Choose a meeting point, then share it by QR"
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
        Event information checked {data.festival.sourceCheckedAt}.
      </p>
    </>
  );
}
