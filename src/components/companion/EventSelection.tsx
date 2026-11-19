import { useEffect, useMemo, useState } from "react";
import { CalendarDays, MapPin, Clock, ArrowUpRight, Heart } from "lucide-react";
import { Calendar } from "@/components/ui/calendar";
import { useEvent } from "@/context/EventContext";
import { formatEventDate, formatEventHours } from "@/lib/attendee/event-clock";
import { downloadEventCalendar } from "@/lib/attendee/schedule";
import { getTicketProviderName } from "@/lib/attendee/tickets";
import {
  getEventCategoryTerms,
  selectFeaturedParticipants,
} from "@/lib/intelligence/event-intelligence";
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
import type { DemoData } from "@/lib/event/types";
import { useCompanion } from "./context";
import { Sheet } from "./Sheet";
import { PrimaryButton, Segmented, SearchField } from "./ui";

function toLocalNoonDate(d: Date, tz: string): Date {
  return new Date(
    new Intl.DateTimeFormat("en-CA", {
      timeZone: tz,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(d) + "T12:00:00",
  );
}

function eventSpansDate(demo: DemoData, target: Date | undefined): boolean {
  if (!target) return true;
  if (demo.event.dateConfirmed === false) return false;
  const start = toLocalNoonDate(demo.event.startAt, demo.event.timezone);
  const end = toLocalNoonDate(demo.event.endAt, demo.event.timezone);
  const t = new Date(
    `${target.getFullYear()}-${String(target.getMonth() + 1).padStart(2, "0")}-${String(target.getDate()).padStart(2, "0")}T12:00:00`,
  );
  return t >= start && t <= end;
}

export function EventSelection() {
  const { data, attendee, navigate, now } = useCompanion();
  const { availableEvents, selectEvent } = useEvent();
  const [preview, setPreview] = useState(false);
  const [mode, setMode] = useState<"browse" | "mine" | "calendar">("browse");
  const [query, setQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("All");
  const [extraEvents, setExtraEvents] = useState<PublishedOrganiserEvent[]>([]);

  useEffect(() => {
    let active = true;
    setExtraEvents(readLocalPublishedEvents());
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

  const allPublishedDemos = useMemo(() => {
    const map = new Map<string, DemoData>();
    for (const ev of availableEvents) map.set(ev.event.id, ev);
    for (const raw of extraEvents) {
      if (!map.has(raw.id)) map.set(raw.id, organiserEventToDemoData(raw));
    }
    return [...map.values()];
  }, [availableEvents, extraEvents]);

  const categories = useMemo(() => {
    const unique = new Set<string>(["All"]);
    for (const demo of allPublishedDemos) {
      if (demo.event.category) unique.add(demo.event.category);
    }
    return [...unique];
  }, [allPublishedDemos]);

  const eventDay = useMemo(
    () =>
      data.event.dateConfirmed === false
        ? new Date()
        : toLocalNoonDate(data.event.startAt, data.event.timezone),
    [data.event.dateConfirmed, data.event.startAt, data.event.timezone],
  );

  // Mark every confirmed published event's date(s) on the calendar (multi-event calendar support!)
  const allEventDays = useMemo(() => {
    const days: Date[] = [];
    for (const demo of allPublishedDemos) {
      if (demo.event.dateConfirmed === false) continue;
      const start = toLocalNoonDate(demo.event.startAt, demo.event.timezone);
      const end = toLocalNoonDate(demo.event.endAt, demo.event.timezone);
      for (let cur = new Date(start); cur <= end; cur = new Date(+cur + 86_400_000)) {
        days.push(new Date(cur));
      }
    }
    return days;
  }, [allPublishedDemos]);

  const [selected, setSelected] = useState<Date | undefined>(eventDay);
  const [month, setMonth] = useState(eventDay);
  const ended = data.event.dateConfirmed !== false && now !== null && now > +data.event.endAt;
  const matches = eventSpansDate(data, selected);
  const categoryMatchesPrimary = categoryFilter === "All" || data.event.category === categoryFilter;

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

  const date = formatEventDate(data.event, {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
  const hours = formatEventHours(data.event);

  const openPublishedEvent = (demo: DemoData) => {
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
  };

  const isDemoSavedLocally = (demo: DemoData): boolean => {
    if (typeof window === "undefined") return false;
    const key =
      storageKey(demo.event.id) +
      (attendee.auth.user?.id ? `:account:${attendee.auth.user.id}` : "");
    try {
      const raw = localStorage.getItem(key);
      if (!raw) return false;
      const parsed = parseStoredPreferences(JSON.parse(raw), demo);
      return Boolean(
        parsed.following ||
        parsed.collections.length > 0 ||
        parsed.selectedEventId === demo.event.id,
      );
    } catch {
      return false;
    }
  };

  const otherDemos = allPublishedDemos
    .filter((demo) => demo.event.id !== data.event.id)
    .filter((demo) => (mode === "mine" ? isDemoSavedLocally(demo) : true))
    .filter((demo) => categoryFilter === "All" || demo.event.category === categoryFilter)
    .filter((demo) => (mode === "calendar" ? eventSpansDate(demo, selected) : true))
    .filter((demo) =>
      `${demo.event.name} ${demo.event.venueName} ${demo.event.city} ${demo.event.category}`
        .toLowerCase()
        .includes(query.trim().toLowerCase()),
    );

  const isPrimarySaved =
    attendee.preferences.following ||
    attendee.preferences.collections.length > 0 ||
    attendee.preferences.selectedEventId === data.event.id;
  const primaryVisible =
    (mode === "browse" || (mode === "mine" ? isPrimarySaved : matches)) &&
    searchMatch &&
    categoryMatchesPrimary;
  const featuredPreview = selectFeaturedParticipants(data);
  const terms = getEventCategoryTerms(data.event.category);
  const ticketUrl = data.event.ticketUrl || data.festival.ticketUrl;
  const ticketProvider = getTicketProviderName(ticketUrl);
  const hasDistinctRelatedEvent =
    Boolean(data.festival.relatedEvent.name) &&
    data.festival.relatedEvent.name !== data.event.name &&
    data.festival.relatedEvent.url.startsWith("http");

  return (
    <div className="event-discovery px-4 pt-3">
      <div className="mb-5">
        <p className="mb-1.5 text-[15px] font-medium text-muted-foreground">Event Buddies</p>
        <h1 className="ios-large-title">Choose your event</h1>
      </div>

      <div className="mb-3">
        <SearchField
          id="event-search"
          label="Search events, artists or venues"
          placeholder="Event, artist, city or venue"
          value={query}
          onChange={setQuery}
        />
      </div>

      {/* Category filters working together with search & calendar */}
      {categories.length > 1 && (
        <div
          className="scrollbar-none mb-3 flex gap-2 overflow-x-auto py-1"
          role="group"
          aria-label="Filter events by category"
        >
          {categories.map((cat) => (
            <button
              key={cat}
              type="button"
              className="ios-chip"
              aria-pressed={categoryFilter === cat}
              onClick={() => setCategoryFilter(cat)}
            >
              {cat}
            </button>
          ))}
        </div>
      )}

      <Segmented
        label="Event discovery view"
        value={mode}
        options={[
          { value: "browse", label: "Explore" },
          { value: "mine", label: "My Events" },
          {
            value: "calendar",
            label: (
              <>
                <CalendarDays size={17} className="mr-1.5 inline" />
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
            modifiers={{ event: allEventDays }}
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
          {mode === "calendar"
            ? "On this date"
            : mode === "mine"
              ? "My saved events"
              : ended
                ? "Past events"
                : "Coming up"}
        </h2>
        {mode === "browse" && (
          <span className="text-[14px] text-muted-foreground">{data.event.city}</span>
        )}
      </div>

      {primaryVisible ? (
        <button
          type="button"
          className="discovery-event-card ios-press relative block w-full overflow-hidden rounded-[28px] bg-gradient-to-br from-[#16232b] via-[#133842] to-[#0d1419] text-left"
          onClick={() => setPreview(true)}
          aria-label={`Preview ${data.event.name}`}
        >
          {data.event.heroImageUrl && (
            <img
              src={data.event.heroImageUrl}
              alt={`${data.event.name} crowd`}
              width={1200}
              height={800}
              decoding="async"
              className="absolute inset-0 h-full w-full object-cover"
            />
          )}
          <span className="discovery-date absolute left-4 top-4 rounded-full px-4 py-2 text-[14px] font-semibold">
            {date}
          </span>
          <span className="discovery-card-glass absolute inset-x-3 bottom-3 rounded-[22px] p-5">
            <span className="mb-2 block text-[14px] font-medium">
              {data.event.category}
              {data.stages.length > 0
                ? ` · ${data.stages.length} ${data.stages.length === 1 ? terms.placeSingular.toLowerCase() : terms.placesLabel.toLowerCase()}`
                : ""}
            </span>
            <span className="block text-[30px] leading-9 font-bold">{data.event.name}</span>
            <span className="mt-3 flex items-start gap-2 text-[15px]">
              <MapPin size={17} className="mt-0.5 flex-none" />
              {data.event.venueName}
            </span>
            <span className="mt-2 flex items-center gap-2 text-[15px]">
              <Clock size={17} />
              {hours}
            </span>
            <span className="mt-5 flex min-h-11 items-center justify-between border-t border-white/25 pt-3 text-[17px] font-semibold">
              View event <ArrowUpRight size={21} />
            </span>
          </span>
        </button>
      ) : otherDemos.length === 0 ? (
        <div className="rounded-2xl bg-popover p-5">
          <p className="text-[17px] font-medium">
            {mode === "mine"
              ? "No saved events yet."
              : searchMatch && categoryMatchesPrimary
                ? "No published events on this date."
                : "No matching published events."}
          </p>
          <button
            type="button"
            className="mt-3 min-h-11 text-[17px] font-semibold text-favorite"
            onClick={() => {
              if (mode === "mine") setMode("browse");
              setMonth(eventDay);
              setSelected(eventDay);
              setQuery("");
              setCategoryFilter("All");
            }}
          >
            Show {data.event.name}
          </button>
        </div>
      ) : null}

      {preview && (
        <Sheet title={data.event.name} onClose={() => setPreview(false)}>
          <div className="event-preview-facts space-y-4">
            {data.event.heroImageUrl && (
              <div className="overflow-hidden rounded-2xl bg-foreground">
                <img
                  src={data.event.heroImageUrl}
                  alt={`${data.event.name}`}
                  width={800}
                  height={450}
                  decoding="async"
                  className="h-44 w-full object-cover"
                />
              </div>
            )}
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-[12px] font-semibold uppercase tracking-wide text-primary">
                  {data.event.category} · {data.festival.organiser}
                </p>
                <p className="mt-1 border-l-4 border-favorite pl-3 text-[20px] font-semibold">
                  {data.event.venueName}
                </p>
              </div>
              <button
                type="button"
                aria-label="Save event"
                aria-pressed={attendee.preferences.following}
                onClick={attendee.toggleFollow}
                className="ios-press grid size-11 flex-none place-items-center rounded-full bg-popover text-favorite ring-1 ring-border"
              >
                <Heart size={20} fill={attendee.preferences.following ? "currentColor" : "none"} />
              </button>
            </div>
            <p className="text-[15px] leading-relaxed text-muted-foreground">
              {data.event.description}
            </p>
            <p className="flex items-center gap-3 text-[17px]">
              <CalendarDays size={21} className="text-favorite" />
              {date}
            </p>
            <p className="flex items-center gap-3 text-[17px]">
              <Clock size={21} className="text-favorite" />
              {hours}
            </p>
            {featuredPreview.length > 0 && (
              <div className="rounded-xl bg-secondary/70 p-3 text-[14px]">
                <p className="font-semibold">Featured highlights</p>
                <p className="mt-0.5 text-muted-foreground">
                  {featuredPreview.map((p) => p.name).join(" · ")}
                </p>
              </div>
            )}
            <p className="text-[15px] text-muted-foreground">
              {data.festival.rules[0] ?? "Follow organiser entry rules at the gates."}
            </p>
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
            <div className="flex flex-wrap items-center gap-4">
              <button
                type="button"
                className="min-h-11 text-[16px] font-semibold underline"
                onClick={() => downloadEventCalendar(data)}
              >
                Add event to my calendar
              </button>
              {ticketUrl && (
                <a
                  href={ticketUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex min-h-11 items-center gap-1 text-[16px] font-semibold text-primary"
                >
                  Buy tickets on {ticketProvider} <ArrowUpRight size={16} aria-hidden />
                </a>
              )}
            </div>
            <PrimaryButton
              onClick={() => {
                if (
                  attendee.update({
                    selectedEventId: data.event.id,
                    following: true,
                    hasName: true,
                    onboardingDone: true,
                  })
                ) {
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

      {otherDemos.length > 0 && (
        <section className="mt-6 space-y-3" aria-label="Additional published events">
          <h2 className="text-[18px] font-semibold">Also published</h2>
          <div className="ios-group">
            {otherDemos.map((demo) => (
              <div
                key={demo.event.id}
                className="ios-row flex-wrap items-center justify-between gap-3 py-3"
              >
                <div>
                  <p className="text-[12px] font-semibold uppercase tracking-wide text-primary">
                    {demo.event.category}
                  </p>
                  <p className="text-[17px] font-semibold">{demo.event.name}</p>
                  <p className="text-[14px] text-muted-foreground">
                    {formatEventDate(demo.event, {
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
                  onClick={() => openPublishedEvent(demo)}
                >
                  I’m going
                </button>
              </div>
            ))}
          </div>
        </section>
      )}

      {hasDistinctRelatedEvent && (
        <section className="mt-6 space-y-3" aria-label="Organiser and related coastal event">
          <div className="flex items-center justify-between">
            <h2 className="text-[18px] font-semibold">From {data.festival.organiser}</h2>
            <button
              type="button"
              aria-pressed={attendee.preferences.followedOrganisers.includes(
                data.festival.organiser,
              )}
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
            <p className="text-[13px] font-semibold uppercase text-primary">Same organiser</p>
            <p className="mt-1 text-[17px] font-semibold">{data.festival.relatedEvent.name}</p>
            <p className="text-[14px] text-muted-foreground">
              {data.festival.relatedEvent.date} · {data.festival.relatedEvent.venue}
            </p>
            {data.festival.relatedEvent.url && (
              <a
                href={data.festival.relatedEvent.url}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-2 inline-flex min-h-11 items-center gap-1 text-[15px] font-semibold text-primary"
              >
                Official details <ArrowUpRight size={16} />
              </a>
            )}
          </div>
        </section>
      )}
    </div>
  );
}
