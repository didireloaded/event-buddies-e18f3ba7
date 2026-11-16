import { Heart, Share2, Users, Music2 } from "lucide-react";
import { dateLabel, eventPhase } from "@/lib/attendee/event-clock";
import { eventTime } from "@/lib/attendee/schedule";
import { eventLifecycle } from "@/lib/attendee/lifecycle";
import { useCompanion } from "./context";
import { CrewPeople } from "./CrewPeople";
import { Chevron, PrimaryButton } from "./ui";

import { PostEventState } from "./PostEventState";

export function HomeView({ onShare }: { onShare: () => void }) {
  const { data, attendee, now, navigate, openSheet, places } = useCompanion();
  const { preferences, toggleFollow, ready } = attendee;
  const phase = eventPhase(data, now);
  const life = eventLifecycle(data, now);
  const meeting = preferences.meeting;
  const meetingPlace = places.find((place) => place.id === meeting?.pointId);
  if (life.phase !== "upcoming" && life.phase !== "live") return <PostEventState />;

  return (
    <>
      <div className="px-4 pb-3 pt-2">
        <h1 className="ios-large-title">Events</h1>
        <p className="mt-1 text-[15px] text-muted-foreground">Your Sound of Summer companion</p>
      </div>
      <section
        className="event-pass mx-4 overflow-hidden rounded-[20px] bg-popover"
        aria-label={data.event.name}
      >
        <button
          type="button"
          onClick={() => openSheet({ kind: "event" })}
          className="relative block w-full text-left"
          aria-label="About Sound of Summer"
        >
          <img
            src={data.event.heroImageUrl}
            alt="Crowd at a past Sound of Summer edition, from Namib Rage’s official gallery"
            width={1200}
            height={800}
            fetchPriority="high"
            className="aspect-[1.8] w-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-foreground/90 via-foreground/10 to-transparent" />
          <div className="absolute inset-x-0 bottom-0 p-4 text-primary-foreground">
            <p className="mb-1 text-[13px] font-semibold">
              {dateLabel(data.event.startAt, data.event.timezone, {
                weekday: "short",
                day: "numeric",
                month: "short",
                year: "numeric",
              })}
            </p>
            <h2 className="display-title text-[42px]">
              Sound of <span className="text-favorite">Summer</span>
            </h2>
          </div>
        </button>
        <div className="flex items-center gap-3 px-4 pb-3 pt-4">
          <div className="min-w-0 flex-1">
            <p className="text-[17px] font-semibold leading-snug">{data.event.venueName}</p>
            <p className="mt-1 text-[15px] text-muted-foreground">
              {data.event.city} · {eventTime(data.event.startAt)}–{eventTime(data.event.endAt)} CAT
            </p>
          </div>
          <button
            type="button"
            disabled={!ready}
            aria-label="Save event"
            aria-pressed={preferences.following}
            onClick={toggleFollow}
            className="ios-press grid size-11 flex-none place-items-center rounded-full bg-secondary text-favorite"
          >
            <Heart size={22} fill={preferences.following ? "currentColor" : "none"} />
          </button>
        </div>
        <div className="flex items-center justify-between border-t border-border px-4 py-2">
          <p className="text-[13px] font-semibold text-muted-foreground">{phase.label}</p>
          <button
            type="button"
            onClick={onShare}
            aria-label="Share event"
            className="grid size-11 place-items-center text-favorite"
          >
            <Share2 size={21} strokeWidth={1.75} />
          </button>
        </div>
      </section>
      <div className="px-4 pt-4">
        <PrimaryButton onClick={() => navigate("crew")}>
          <Users size={20} />
          {meetingPlace ? `Meet at ${meetingPlace.name}` : "Find your crew"}
          <Chevron />
        </PrimaryButton>
      </div>
      <div className="grid grid-cols-2 gap-3 px-4 pt-4">
        <a href="#lineup" className="ios-press rounded-2xl bg-popover p-4">
          <Music2 size={23} className="mb-3 text-favorite" />
          <span className="block text-[14px] text-muted-foreground">Your night</span>
          <span className="block text-[19px] font-bold">Your lineup</span>
        </a>
        <a href="#crew" className="ios-press rounded-2xl bg-popover p-4">
          <Users size={23} className="mb-3 text-favorite" />
          <span className="block text-[14px] text-muted-foreground">Better together</span>
          <span className="block text-[19px] font-bold">Find your people</span>
        </a>
      </div>
      <CrewPeople />
      <a
        href="#info"
        className="mx-4 mt-5 flex min-h-11 items-center justify-between text-[17px] font-medium"
      >
        Festival essentials <Chevron />
      </a>
    </>
  );
}
