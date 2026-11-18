import { Heart, Share2, Users, Music2, MapPin, Info, CalendarDays, Ticket, MessageCircleQuestion, LocateFixed } from "lucide-react";
import { List, ListItem } from "konsta/react";
import { dateLabel, eventPhase } from "@/lib/attendee/event-clock";
import { eventTime } from "@/lib/attendee/schedule";
import { eventLifecycle } from "@/lib/attendee/lifecycle";
import { useCompanion } from "./context";
import { CrewPeople } from "./CrewPeople";
import { IconTile, PrimaryButton } from "./ui";
import { PostEventState } from "./PostEventState";
import { InstallReminder } from "./OfflineReadiness";

export function HomeView({ onShare }: { onShare: () => void }) {
  const { data, attendee, now, navigate, openSheet } = useCompanion();
  const { preferences, toggleFollow, ready } = attendee;
  const phase = eventPhase(data, now);
  const life = eventLifecycle(data, now);
  if (life.phase !== "upcoming" && life.phase !== "live") return <PostEventState />;

  return (
    <>
      <div className="px-4 pb-4 pt-2">
        <h1 className="ios-large-title">Sound of Summer</h1>
        <p className="mt-1 text-[15px] text-muted-foreground">
          {dateLabel(data.event.startAt, data.event.timezone, {
            weekday: "short",
            day: "numeric",
            month: "long",
          })}
        </p>
      </div>
      <section className="mx-4 overflow-hidden rounded-2xl bg-popover" aria-label={data.event.name}>
        <button
          type="button"
          onClick={() => openSheet({ kind: "event" })}
          className="ios-press flex w-full items-center gap-4 p-3 text-left"
          aria-label="About Sound of Summer"
        >
          <img
            src={data.event.heroImageUrl}
            alt="Crowd at a past Sound of Summer edition, from Namib Rage’s official gallery"
            width={1200}
            height={800}
            fetchPriority="high"
            className="size-24 flex-none rounded-xl object-cover"
          />
          <span className="min-w-0">
            <span className="block text-[17px] font-semibold leading-snug">
              {data.event.venueName}
            </span>
            <span className="mt-1 block text-[15px] text-muted-foreground">{data.event.city}</span>
            <span className="mt-1 block text-[15px] text-muted-foreground">
              {eventTime(data.event.startAt)}–{eventTime(data.event.endAt)} CAT
            </span>
          </span>
        </button>
        <div className="flex min-h-12 items-center gap-2 border-t border-border px-4">
          <span className="mr-auto text-[15px] font-medium">{phase.label}</span>
          <button
            type="button"
            disabled={!ready}
            aria-label="Save event"
            aria-pressed={preferences.following}
            onClick={toggleFollow}
            className="ios-press grid size-11 place-items-center text-favorite"
          >
            <Heart size={22} fill={preferences.following ? "currentColor" : "none"} />
          </button>
          <button
            type="button"
            onClick={onShare}
            aria-label="Share event"
            className="ios-press grid size-11 place-items-center text-favorite"
          >
            <Share2 size={21} strokeWidth={1.75} />
          </button>
        </div>
      </section>
      <div className="px-4 pt-4">
        <PrimaryButton onClick={() => navigate("crew")}>
          <Users size={20} />
          Find your crew
        </PrimaryButton>
      </div>
      <div className="px-4">
        <List
          strong
          className="mt-5 mb-0 overflow-hidden rounded-xl"
          colors={{ strongBgIos: "bg-popover" }}
        >
          <ListItem
            title="Your lineup"
            after={
              preferences.savedArtists.length
                ? `${preferences.savedArtists.length} saved`
                : `${data.festival.artists.length} artists`
            }
            media={<IconTile icon={Music2} />}
            href="#lineup"
          />
          <ListItem
            title="Venue map"
            after={`${data.points.length + data.stages.length} places`}
            media={<IconTile icon={MapPin} />}
            href="#map"
          />
          <ListItem title="Festival essentials" media={<IconTile icon={Info} />} href="#info" />
          <ListItem
            title="Ticket & pass"
            after="On this device"
            media={<IconTile icon={Ticket} />}
            link
            onClick={() => openSheet({ kind: "ticket" })}
          />
          <ListItem
            title="Nearest facilities"
            after="Plan-based"
            media={<IconTile icon={LocateFixed} />}
            link
            onClick={() => openSheet({ kind: "nearby" })}
          />
          <ListItem
            title="Ask about rules & transport"
            media={<IconTile icon={MessageCircleQuestion} />}
            link
            onClick={() => openSheet({ kind: "assistant" })}
          />
          <ListItem
            title="Upcoming events"
            media={<IconTile icon={CalendarDays} />}
            href="#events"
          />
        </List>
      </div>
      <CrewPeople />
      <InstallReminder />
    </>
  );
}
