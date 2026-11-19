import { useEffect, useState } from "react";
import { CalendarDays, MapPin, Clock, ArrowUpRight } from "lucide-react";
import { Calendar } from "@/components/ui/calendar";
import { useEvent } from "@/context/EventContext";
import { dateLabel } from "@/lib/attendee/event-clock";
import { eventTime, downloadEventCalendar } from "@/lib/attendee/schedule";
import {
  defaultPreferences,
  EVENT_COLLECTIONS,
  parseStoredPreferences,
  storageKey,
} from "@/lib/attendee/use-attendee";
import {
  listPublishedOrganiserEvents,
  type PublishedOrganiserEvent,
} from "@/lib/organiser/cloud-extensions";
import { organiserEventToDemoData, readLocalPublishedEvents } from "@/lib/organiser/event-adapter";
import { useCompanion } from "./context";
import { Sheet } from "./Sheet";
import { PrimaryButton, Segmented, SearchField } from "./ui";

export function EventSelection() {
  const { data, attendee, navigate, now } = useCompanion();
  const { availableEvents, selectEvent } = useEvent();
  const [preview, setPreview] = useState(false);
  const [mode, setMode] = useState<"browse" | "calendar">("browse");
  const [query, setQuery] = useState("");
  const [extraEvents, setExtraEvents] = useState<PublishedOrganiserEvent[]>(() =>
    readLocalPublishedEvents(),
  );

  useEffect(() => {
    let active = true;
    void listPublishedOrganiserEvents().then((items) => {
      if (!active) return;
      const locals = readLocalPublishedEvents();
      const seen = new Set<string>();
      const combined: PublishedOrganiserEvent[] = [];
      for (const item of [...items, ...locals]) {
        if (!seen.has(item.id)) {
          seen.add(item.id);
          combined.push(item);
        }
      }
      setExtraEvents(combined);
    });
    return () => {
      active = false;
    };
  }, [data.event.id, data.event.name]);
  const eventDay = new Date(
    new Intl.DateTimeFormat("en-CA", {
      timeZone: data.event.timezone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(data.event.startAt) + "T12:00:00",
  );
  const [selected, setSelected] = useState<Date | undefined>(eventDay);
  const [month, setMonth] = useState(eventDay);
  const ended = now !== null && now > +data.event.endAt;
  const matches = selected?.toDateString() === eventDay.toDateString();
  const searchMatch = [
    data.event.name,
    data.event.venueName,
    data.event.city,
    data.event.category,
    data.festival.organiser,
    ...data.festival.artists.map((artist) => artist.name),
    ...data.points.map((point) => point.name),
  ]
    .join(" ")
    .toLocaleLowerCase()
    .includes(query.trim().toLocaleLowerCase());
  const date = dateLabel(data.event.startAt, data.event.timezone, {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
  return (
    <div className="event-discovery px-4 pt-3">
      <div className="mb-6">
        <p className="mb-2 text-[15px] font-medium text-muted-foreground">Event Buddies</p>
        <h1 className="ios-large-title">Choose your event</h1>
      </div>
      <div className="mb-4">
        <SearchField
          id="event-search"
          label="Search events, artists or venues"
          placeholder="Event, artist or venue"
          value={query}
          onChange={setQuery}
        />
      </div>
      <Segmented
        label="Event discovery view"
        value={mode}
        options={[
          { value: "browse", label: "Explore" },
          {
            value: "calendar",
            label: (
              <>
                <CalendarDays size={17} className="mr-2 inline" />
                Calendar
              </>
            ),
          },
        ]}
        onChange={setMode}
      />
      {mode === "calendar" && (
        <section
          className="event-calendar mt-5 rounded-[20px] bg-popover p-2"
          aria-label="Upcoming events calendar"
        >
          <Calendar
            mode="single"
            weekStartsOn={1}
            selected={selected}
            onSelect={setSelected}
            month={month}
            onMonthChange={setMonth}
            modifiers={{ event: eventDay }}
            modifiersClassNames={{ event: "calendar-event-day" }}
            classNames={{
              day: "group/day relative h-11 min-w-0 flex-1 select-none p-0 text-center",
            }}
            className="w-full bg-transparent p-1 [--cell-size:2.75rem]"
          />
        </section>
      )}
      <div className="mb-3 mt-6 flex items-center justify-between">
        <h2 className="text-[20px] font-semibold">
          {mode === "calendar" ? "On this date" : ended ? "Past events" : "Coming up"}
        </h2>
        {mode === "browse" && (
          <span className="text-[14px] text-muted-foreground">{data.event.city}</span>
        )}
      </div>
      {(mode === "browse" || matches) && searchMatch ? (
        <button
          type="button"
          className="discovery-event-card ios-press relative block w-full overflow-hidden rounded-[28px] text-left"
          onClick={() => setPreview(true)}
          aria-label={`Preview ${data.event.name}`}
        >
          <img
            src={data.event.heroImageUrl}
            alt={`${data.event.name} crowd`}
            width={1200}
            height={800}
            className="absolute inset-0 h-full w-full object-cover"
          />
          <span className="discovery-date absolute left-4 top-4 rounded-full px-4 py-2 text-[14px] font-semibold">
            {date}
          </span>
          <span className="discovery-card-glass absolute inset-x-3 bottom-3 rounded-[22px] p-5">
            <span className="mb-2 block text-[14px] font-medium">
              {data.event.category} · {data.stages.length} stages
            </span>
            <span className="block text-[30px] leading-9 font-bold">{data.event.name}</span>
            <span className="mt-3 flex items-start gap-2 text-[15px]">
              <MapPin size={17} className="mt-0.5 flex-none" />
              {data.event.venueName}
            </span>
            <span className="mt-2 flex items-center gap-2 text-[15px]">
              <Clock size={17} />
              {eventTime(data.event.startAt)}–{eventTime(data.event.endAt)} CAT
            </span>
            <span className="mt-5 flex min-h-11 items-center justify-between border-t border-white/25 pt-3 text-[17px] font-semibold">
              View event <ArrowUpRight size={21} />
            </span>
          </span>
        </button>
      ) : (
        <div className="rounded-2xl bg-popover p-5">
          <p className="text-[17px] font-medium">
            {searchMatch ? "No published events on this date." : "No matching published events."}
          </p>
          <button
            type="button"
            className="mt-3 min-h-11 text-[17px] font-semibold text-favorite"
            onClick={() => {
              setMonth(eventDay);
              setSelected(eventDay);
              setQuery("");
            }}
          >
            Show {data.event.name}
          </button>
        </div>
      )}
      {preview && (
        <Sheet title={data.event.name} onClose={() => setPreview(false)}>
          <div className="event-preview-facts space-y-4">
            <p className="border-l-4 border-favorite pl-3 text-[20px] font-semibold">
              {data.event.venueName}
            </p>
            <p className="flex items-center gap-3 text-[17px]">
              <CalendarDays size={21} className="text-favorite" />
              {date}
            </p>
            <p className="flex items-center gap-3 text-[17px]">
              <Clock size={21} className="text-favorite" />
              {eventTime(data.event.startAt)}–{eventTime(data.event.endAt)} CAT
            </p>
            <p className="text-[15px] text-muted-foreground">18+ · Physical ID required</p>
            <div>
              <p className="mb-1.5 text-[14px] font-semibold">Save to collection</p>
              <div className="flex flex-wrap gap-2" role="group" aria-label="Event collections">
                {EVENT_COLLECTIONS.map((col) => {
                  const active = attendee.preferences.collections.includes(col);
                  return (
                    <button
                      key={col}
                      type="button"
                      className="ios-chip"
                      aria-pressed={active}
                      onClick={() => {
                        const next = active
                          ? attendee.preferences.collections.filter((c) => c !== col)
                          : [...attendee.preferences.collections, col];
                        attendee.update({ collections: next });
                      }}
                    >
                      {col}
                    </button>
                  );
                })}
              </div>
            </div>
            <button
              type="button"
              className="min-h-11 text-[17px] font-semibold underline"
              onClick={() => downloadEventCalendar(data)}
            >
              Add event to my calendar
            </button>
            <PrimaryButton
              onClick={() => {
                if (attendee.update({ selectedEventId: data.event.id })) {
                  setPreview(false);
                  navigate("home");
                }
              }}
            >
              {ended ? "View recap" : "I’m going"}
            </PrimaryButton>
          </div>
        </Sheet>
      )}
      <section className="mt-6 space-y-3" aria-label="Organiser and related coastal event">
        <div className="flex items-center justify-between">
          <h2 className="text-[18px] font-semibold">From {data.festival.organiser}</h2>
          <button
            type="button"
            aria-pressed={attendee.preferences.followedOrganisers.includes(data.festival.organiser)}
            onClick={() => {
              const followed = attendee.preferences.followedOrganisers.includes(
                data.festival.organiser,
              );
              const next = followed
                ? attendee.preferences.followedOrganisers.filter(
                    (o) => o !== data.festival.organiser,
                  )
                : [...attendee.preferences.followedOrganisers, data.festival.organiser];
              if (attendee.update({ followedOrganisers: next })) {
                attendee.notify(
                  followed
                    ? `Unfollowed ${data.festival.organiser}`
                    : `Following ${data.festival.organiser} on this device`,
                );
              }
            }}
            className="ios-chip text-[14px]"
          >
            {attendee.preferences.followedOrganisers.includes(data.festival.organiser)
              ? "Following organiser"
              : "Follow organiser"}
          </button>
        </div>
        <div className="ios-card p-4">
          <p className="text-[13px] font-semibold uppercase text-primary">
            Same organiser · Coastal weekend
          </p>
          <p className="mt-1 text-[17px] font-semibold">{data.festival.relatedEvent.name}</p>
          <p className="text-[14px] text-muted-foreground">
            {data.festival.relatedEvent.date} · {data.festival.relatedEvent.venue}
          </p>
          <a
            href={data.festival.relatedEvent.url}
            target="_blank"
            rel="noreferrer"
            className="mt-2 inline-flex min-h-11 items-center gap-1 text-[15px] font-semibold text-primary"
          >
            Official details on Howler <ArrowUpRight size={16} />
          </a>
        </div>
      </section>
      {(() => {
        const otherDemos = [
          ...availableEvents.filter((item) => item.event.id !== data.event.id),
          ...extraEvents
            .filter(
              (ev) =>
                ev.id !== data.event.id && !availableEvents.some((item) => item.event.id === ev.id),
            )
            .map(organiserEventToDemoData),
        ].filter((demo) =>
          `${demo.event.name} ${demo.event.venueName} ${demo.event.city}`
            .toLowerCase()
            .includes(query.trim().toLowerCase()),
        );
        if (otherDemos.length === 0) return null;
        return (
          <section className="mt-6 space-y-3" aria-label="Additional published events">
            <h2 className="text-[18px] font-semibold">Also published</h2>
            <div className="ios-group">
              {otherDemos.map((demo) => (
                <div
                  key={demo.event.id}
                  className="ios-row flex-wrap items-center justify-between gap-3 py-3"
                >
                  <div>
                    <p className="text-[17px] font-semibold">{demo.event.name}</p>
                    <p className="text-[14px] text-muted-foreground">
                      {dateLabel(demo.event.startAt, demo.event.timezone, {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                      })}{" "}
                      · {demo.event.venueName}
                    </p>
                  </div>
                  <button
                    type="button"
                    className="min-h-11 rounded-full bg-primary px-4 text-[14px] font-semibold text-primary-foreground"
                    onClick={() => {
                      const targetKey =
                        storageKey(demo.event.id) +
                        (attendee.auth.user?.id ? `:account:${attendee.auth.user.id}` : "");
                      try {
                        const existingRaw = localStorage.getItem(targetKey);
                        const existing = existingRaw
                          ? parseStoredPreferences(JSON.parse(existingRaw), demo)
                          : defaultPreferences(demo);
                        localStorage.setItem(
                          targetKey,
                          JSON.stringify({
                            ...existing,
                            selectedEventId: demo.event.id,
                            hasName: true,
                            onboardingDone: true,
                            profile: attendee.preferences.profile,
                          }),
                        );
                      } catch {
                        /* Ignore storage failures. */
                      }
                      selectEvent(demo.event.id);
                      navigate("home");
                    }}
                  >
                    I’m going
                  </button>
                </div>
              ))}
            </div>
          </section>
        );
      })()}
    </div>
  );
}
