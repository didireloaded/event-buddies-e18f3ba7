import { useEffect, useMemo, useState } from "react";
import {
  CalendarDays,
  MapPin,
  Clock,
  ArrowUpRight,
  Heart,
  Users,
  UserPlus,
  Trash2,
  Ticket,
  Lock,
} from "lucide-react";
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
  addGlobalBuddy,
  readGlobalBuddies,
  removeGlobalBuddy,
  type GlobalBuddy,
} from "@/lib/crew/buddies";
import {
  listPublishedOrganiserEvents,
  type PublishedOrganiserEvent,
} from "@/lib/organiser/cloud-extensions";
import { organiserEventToDemoData, readLocalPublishedEvents } from "@/lib/organiser/event-adapter";
import { resolveEventTemplate } from "@/lib/templates/event-templates";
import type { DemoData } from "@/lib/event/types";
import {
  globalCategory,
  INTERESTS,
  usePlatformPreferences,
} from "@/lib/account/platform-navigation";
import { initials, useCompanion } from "./context";
import { Sheet } from "./Sheet";
import { Button } from "@/components/ui/button";
import { isPrivateEvent, matchesEventSearch, prioritiseInterests } from "@/lib/account/discovery";
import { Avatar, EmptyState, PrimaryButton, Segmented, SearchField } from "./ui";

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
  const platform = usePlatformPreferences();
  const { data, attendee, navigate, now, allTicketsCount, openSheet } = useCompanion();
  const { availableEvents, selectEvent } = useEvent();
  const [previewEvent, setPreviewEvent] = useState<DemoData | null>(null);
  const [mode, setMode] = useState<"browse" | "mine" | "buddies" | "calendar">("browse");
  const [query, setQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("All");
  const [extraEvents, setExtraEvents] = useState<PublishedOrganiserEvent[]>([]);
  const [buddies, setBuddies] = useState<GlobalBuddy[]>([]);
  const [addingBuddy, setAddingBuddy] = useState(false);
  const [buddyName, setBuddyName] = useState("");
  const [buddyHandle, setBuddyHandle] = useState("");

  useEffect(() => {
    setBuddies(readGlobalBuddies());
  }, []);

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

  // Public discovery strictly excludes private invite-only events (Private Celebration, Wedding, etc.)
  const publicDemos = useMemo(
    () => allPublishedDemos.filter((demo) => !isPrivateEvent(demo)),
    [allPublishedDemos],
  );

  const categories = useMemo(() => {
    return ["All", ...INTERESTS];
  }, []);

  const eventDay = useMemo(
    () =>
      data.event.dateConfirmed === false
        ? new Date()
        : toLocalNoonDate(data.event.startAt, data.event.timezone),
    [data.event.dateConfirmed, data.event.startAt, data.event.timezone],
  );

  const allEventDays = useMemo(() => {
    const days: Date[] = [];
    for (const demo of publicDemos) {
      if (demo.event.dateConfirmed === false) continue;
      const start = toLocalNoonDate(demo.event.startAt, demo.event.timezone);
      const end = toLocalNoonDate(demo.event.endAt, demo.event.timezone);
      for (let cur = new Date(start); cur <= end; cur = new Date(+cur + 86_400_000)) {
        days.push(new Date(cur));
      }
    }
    return days;
  }, [publicDemos]);

  const [selected, setSelected] = useState<Date | undefined>(eventDay);
  const [month, setMonth] = useState(eventDay);
  const ended = data.event.dateConfirmed !== false && now !== null && now > +data.event.endAt;
  const matches = eventSpansDate(data, selected);
  const categoryMatchesPrimary =
    categoryFilter === "All" || globalCategory(data.event.category) === categoryFilter;

  const searchMatch = matchesEventSearch(data, query);

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

  const primaryPreferred =
    platform.interests.length === 0 ||
    platform.interests.some((i) => i === globalCategory(data.event.category));
  const anotherPreferred = publicDemos.some(
    (demo) =>
      demo.event.id !== data.event.id &&
      platform.interests.some((i) => i === globalCategory(demo.event.category)),
  );
  const promotePrimary = mode !== "browse" || primaryPreferred || !anotherPreferred;
  const otherDemos = prioritiseInterests(
    (mode === "mine" ? allPublishedDemos : publicDemos)
      .filter((demo) => !promotePrimary || demo.event.id !== data.event.id)
      .filter((demo) => (mode === "mine" ? isDemoSavedLocally(demo) : true))
      .filter(
        (demo) =>
          categoryFilter === "All" || globalCategory(demo.event.category) === categoryFilter,
      )
      .filter((demo) => (mode === "calendar" ? eventSpansDate(demo, selected) : true))
      .filter((demo) => matchesEventSearch(demo, query)),
    platform.interests,
  );

  const isPrimarySaved =
    attendee.preferences.following ||
    attendee.preferences.collections.length > 0 ||
    attendee.preferences.selectedEventId === data.event.id;
  const primaryPublic = !isPrivateEvent(data);
  const primaryVisible =
    promotePrimary &&
    (mode === "mine" ? isPrimarySaved : primaryPublic && (mode === "browse" || matches)) &&
    searchMatch &&
    categoryMatchesPrimary;

  const terms = getEventCategoryTerms(data.event.category, data.event.templateConfig);
  const hasDistinctRelatedEvent =
    Boolean(data.festival.relatedEvent.name) &&
    data.festival.relatedEvent.name !== data.event.name &&
    data.festival.relatedEvent.url.startsWith("http");

  const activePreview = previewEvent;
  const previewFeatured = activePreview ? selectFeaturedParticipants(activePreview) : [];
  const previewTicketUrl = activePreview
    ? activePreview.event.ticketUrl || activePreview.festival.ticketUrl
    : "";
  const previewTicketProvider = getTicketProviderName(previewTicketUrl);
  const previewDate = activePreview
    ? formatEventDate(activePreview.event, {
        day: "numeric",
        month: "long",
        year: "numeric",
      })
    : "";
  const previewHours = activePreview ? formatEventHours(activePreview.event) : "";

  return (
    <div className="event-discovery px-4 pt-4">
      {/* Global discovery; event-specific template styling begins only after entry. */}
      <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="eb-kicker text-primary">Your next experience</p>
          <h1 className="eb-page-title mt-1">
            {mode === "mine"
              ? "My Events"
              : mode === "buddies"
                ? "Buddies"
                : mode === "calendar"
                  ? "Calendar"
                  : attendee.preferences.hasName
                    ? `Hey ${attendee.preferences.profile.name.split(" ")[0]}`
                    : "Discover events"}
          </h1>
        </div>
        {allTicketsCount > 0 && (
          <button
            type="button"
            onClick={() => openSheet({ kind: "ticket" })}
            className="eb-chip text-[14px]"
          >
            <Ticket size={15} aria-hidden /> {allTicketsCount}{" "}
            {allTicketsCount === 1 ? "pass" : "passes"}
          </button>
        )}
      </div>

      {!attendee.auth.user && (
        <a
          href="/login?mode=up&next=%2F%23events"
          className="inline-flex min-h-11 items-center text-[15px] font-semibold text-primary"
        >
          Create Account / Sign In
        </a>
      )}
      {/* Global Platform 4-Section Switcher (Discover · My Events · Buddies · Calendar) */}
      <Segmented
        label="Event discovery view"
        value={mode}
        options={[
          { value: "browse", label: "Explore" },
          { value: "mine", label: "My Events" },
          { value: "buddies", label: "Buddies" },
          {
            value: "calendar",
            label: (
              <>
                <CalendarDays size={15} className="mr-1 inline" />
                Calendar
              </>
            ),
          },
        ]}
        onChange={setMode}
      />

      {mode === "buddies" ? (
        <section className="mt-6 space-y-5" aria-label="Your global buddies">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="eb-section-heading">Your Event Buddies</h2>
              <p className="mt-0.5 text-[14px] text-muted-foreground">
                Friends you attend events with. Invite them into any event crew in one tap.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setAddingBuddy((prev) => !prev)}
              className="eb-press inline-flex min-h-11 items-center gap-1.5 rounded-full bg-primary px-4 text-[14px] font-semibold text-primary-foreground"
            >
              <UserPlus size={16} aria-hidden /> Add buddy
            </button>
          </div>

          {addingBuddy && (
            <form
              className="eb-panel space-y-3 p-4"
              onSubmit={(e) => {
                e.preventDefault();
                if (buddyName.trim().length < 2) return;
                setBuddies(
                  addGlobalBuddy({
                    name: buddyName,
                    handle: buddyHandle,
                    lastEventName: data.event.name,
                  }),
                );
                setBuddyName("");
                setBuddyHandle("");
                setAddingBuddy(false);
                attendee.notify("Buddy saved to your global list");
              }}
            >
              <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
                <input
                  aria-label="Buddy name"
                  className="eb-field"
                  maxLength={50}
                  placeholder="Friend’s name"
                  value={buddyName}
                  onChange={(e) => setBuddyName(e.target.value)}
                />
                <input
                  aria-label="Buddy handle (optional)"
                  className="eb-field"
                  maxLength={30}
                  placeholder="@handle (optional)"
                  value={buddyHandle}
                  onChange={(e) => setBuddyHandle(e.target.value)}
                />
              </div>
              <div className="flex gap-2">
                <PrimaryButton type="submit" disabled={buddyName.trim().length < 2}>
                  Save buddy
                </PrimaryButton>
                <button
                  type="button"
                  onClick={() => setAddingBuddy(false)}
                  className="min-h-11 px-4 text-[15px] font-medium text-muted-foreground"
                >
                  Cancel
                </button>
              </div>
            </form>
          )}

          {buddies.length > 0 ? (
            <ul className="eb-list">
              {buddies.map((b, idx) => (
                <li key={b.id} className="eb-row justify-between py-3">
                  <div className="flex min-w-0 items-center gap-3">
                    <Avatar label={initials(b.name)} index={idx + 1} />
                    <div className="min-w-0">
                      <p className="truncate text-[16px] font-semibold">{b.name}</p>
                      <p className="truncate text-[14px] text-muted-foreground">
                        @{b.handle}
                        {b.lastEventName ? ` · ${b.lastEventName}` : ""}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => navigate("crew")}
                      className="min-h-11 rounded-full border border-border px-3 text-[13px] font-semibold text-foreground"
                    >
                      Crew
                    </button>
                    <button
                      type="button"
                      aria-label={`Remove ${b.name} from buddies`}
                      onClick={() => setBuddies(removeGlobalBuddy(b.id))}
                      className="grid size-11 place-items-center text-destructive"
                    >
                      <Trash2 size={16} aria-hidden />
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <EmptyState
              icon={Users}
              title="No buddies saved yet"
              detail="Add the friends you usually go to concerts, festivals or summits with so crew invites take one tap."
              action={
                <button
                  type="button"
                  onClick={() => setAddingBuddy(true)}
                  className="inline-flex min-h-11 items-center gap-2 rounded-full bg-primary px-5 text-[14px] font-semibold text-primary-foreground"
                >
                  <UserPlus size={16} aria-hidden /> Add your first buddy
                </button>
              }
            />
          )}
        </section>
      ) : (
        <>
          <div className="mt-4 space-y-3">
            <SearchField
              id="event-search"
              label="Search events, artists or venues"
              placeholder="Search events, speakers, artists or venues"
              value={query}
              onChange={setQuery}
            />

            {categories.length > 1 && (
              <div
                className="scrollbar-none flex gap-2 overflow-x-auto py-0.5"
                role="group"
                aria-label="Filter events by category"
              >
                {categories.map((cat) => (
                  <Button
                    key={cat}
                    type="button"
                    variant="ghost"
                    className="eb-chip"
                    aria-pressed={categoryFilter === cat}
                    onClick={() => setCategoryFilter(cat)}
                  >
                    {cat}
                  </Button>
                ))}
              </div>
            )}
          </div>

          {mode === "calendar" && (
            <section
              className="event-calendar eb-panel mt-5 p-2"
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

          <div className="mb-3 mt-6 flex items-baseline justify-between gap-2">
            <h2 className="eb-section-heading">
              {mode === "calendar"
                ? "On this date"
                : mode === "mine"
                  ? "My saved events"
                  : ended
                    ? "Past events"
                    : "Featured event"}
            </h2>
            {mode === "browse" && (
              <span className="text-[14px] text-muted-foreground">
                {publicDemos.length} published {publicDemos.length === 1 ? "event" : "events"}
              </span>
            )}
          </div>

          {primaryVisible ? (
            <article className="relative overflow-hidden rounded-lg border border-border bg-card text-photo-foreground">
              <div className="discovery-cover relative w-full overflow-hidden bg-secondary">
                {data.event.heroImageUrl && (
                  <img
                    src={data.event.heroImageUrl}
                    alt={`${data.event.name} past edition`}
                    width={1200}
                    height={800}
                    decoding="async"
                    className="h-full w-full object-cover"
                  />
                )}
                <div className="absolute left-4 top-4 z-10 flex flex-wrap items-center gap-2">
                  <span className="rounded-full bg-photo-shade/80 px-3 py-1 text-[13px] font-semibold text-photo-foreground">
                    {date}
                  </span>
                  <span className="rounded-full bg-featured px-3 py-1 text-[13px] font-semibold text-photo-shade">
                    {data.event.category}
                  </span>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  aria-label="Save event"
                  aria-pressed={attendee.preferences.following}
                  onClick={attendee.toggleFollow}
                  className="absolute right-3 top-3 z-10 size-11 rounded-full bg-photo-shade/80 text-photo-foreground"
                >
                  <Heart
                    size={20}
                    fill={attendee.preferences.following ? "currentColor" : "none"}
                  />
                </Button>
                <div className="absolute inset-x-0 bottom-0 z-10 p-5 sm:p-6">
                  <p className="text-[13px] font-semibold text-photo-muted">
                    {data.festival.organiser}
                    {data.stages.length > 0
                      ? ` · ${data.stages.length} ${data.stages.length === 1 ? terms.placeSingular.toLowerCase() : terms.placesLabel.toLowerCase()}`
                      : ""}
                  </p>
                  <h3 className="eb-display mt-1 text-[30px] leading-[1.08] text-photo-foreground sm:text-[38px]">
                    {data.event.name}
                  </h3>
                  <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-[14px] text-photo-muted">
                    <span className="inline-flex items-center gap-1.5">
                      <MapPin size={15} aria-hidden />
                      {data.event.venueName}
                    </span>
                    <span className="inline-flex items-center gap-1.5">
                      <Clock size={15} aria-hidden />
                      {hours}
                    </span>
                  </div>
                  <Button
                    className="mt-4 min-h-11 rounded-full"
                    onClick={() => setPreviewEvent(data)}
                    aria-label={`Preview ${data.event.name}`}
                  >
                    View Event <ArrowUpRight size={18} aria-hidden />
                  </Button>
                </div>
              </div>
            </article>
          ) : otherDemos.length === 0 ? (
            <EmptyState
              icon={CalendarDays}
              title={
                mode === "mine"
                  ? "No saved events yet."
                  : searchMatch && categoryMatchesPrimary
                    ? "No published events on this date."
                    : "No matching published events."
              }
              detail={
                mode === "mine"
                  ? "Explore published festivals, conferences and live events to save them to your collection."
                  : "Try clearing your filters or jump back to the next confirmed date."
              }
              action={
                <button
                  type="button"
                  className="min-h-11 rounded-full bg-primary px-5 text-[15px] font-semibold text-primary-foreground"
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
              }
            />
          ) : null}

          {/* Hairline Upcoming / Additional Published Events (Distinct from Featured cover!) */}
          {otherDemos.length > 0 && (
            <section className="mt-7 space-y-2" aria-label="Additional published events">
              <h2 className="eb-section-heading">
                {mode === "mine" ? "Saved & invited" : "More upcoming events"}
              </h2>
              <div className={mode === "browse" ? "discovery-strip pb-3" : "eb-list"}>
                {otherDemos.map((demo) => {
                  const resolved = resolveEventTemplate({
                    category: demo.event.category,
                    templateConfig: demo.event.templateConfig,
                  });
                  const isPrivate = isPrivateEvent(demo);
                  return (
                    <div
                      key={demo.event.id}
                      className={
                        mode === "browse"
                          ? "flex flex-col overflow-hidden rounded-lg border border-border bg-card p-4"
                          : "eb-row flex-wrap items-center justify-between gap-3 py-3.5"
                      }
                    >
                      <button
                        type="button"
                        onClick={() => setPreviewEvent(demo)}
                        className="flex min-w-0 flex-1 items-center gap-3.5 text-left"
                      >
                        <div className="grid size-14 flex-none place-items-center overflow-hidden rounded-xl border border-border bg-secondary text-[13px] font-bold text-foreground">
                          {demo.event.heroImageUrl ? (
                            <img
                              src={demo.event.heroImageUrl}
                              alt=""
                              width={56}
                              height={56}
                              className="h-full w-full object-cover"
                            />
                          ) : (
                            <span className="eb-display text-[17px]">
                              {initials(demo.event.name)}
                            </span>
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-1.5 text-[12px] font-semibold uppercase tracking-wide text-primary">
                            <span>{demo.event.category}</span>
                            {isPrivate && (
                              <span className="inline-flex items-center gap-0.5 text-muted-foreground">
                                · <Lock size={11} aria-hidden /> Invite only
                              </span>
                            )}
                          </div>
                          <p className="truncate text-[17px] font-bold text-foreground">
                            {demo.event.name}
                          </p>
                          <p className="truncate text-[14px] text-muted-foreground">
                            {formatEventDate(demo.event, {
                              day: "numeric",
                              month: "short",
                              year: "numeric",
                            })}{" "}
                            · {demo.event.venueName}
                          </p>
                        </div>
                      </button>
                      <button
                        type="button"
                        className="eb-press min-h-11 rounded-full bg-primary px-4 text-[14px] font-semibold text-primary-foreground"
                        onClick={() => openPublishedEvent(demo)}
                      >
                        {resolved.definition.terms.isPrivateLike ? "Open invite" : "I’m going"}
                      </button>
                    </div>
                  );
                })}
              </div>
            </section>
          )}

          {hasDistinctRelatedEvent && mode === "browse" && (
            <section className="mt-7 space-y-2.5" aria-label="Organiser and related coastal event">
              <div className="flex items-center justify-between gap-2">
                <h2 className="eb-section-heading">From {data.festival.organiser}</h2>
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
                  className="eb-chip text-[13px]"
                >
                  {attendee.preferences.followedOrganisers.includes(data.festival.organiser)
                    ? "Following"
                    : "Follow organiser"}
                </button>
              </div>
              <div className="eb-list">
                <div className="eb-row justify-between py-3">
                  <div className="min-w-0">
                    <p className="text-[16px] font-semibold">{data.festival.relatedEvent.name}</p>
                    <p className="text-[14px] text-muted-foreground">
                      {data.festival.relatedEvent.date} · {data.festival.relatedEvent.venue}
                    </p>
                  </div>
                  {data.festival.relatedEvent.url && (
                    <a
                      href={data.festival.relatedEvent.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex min-h-11 flex-none items-center gap-1 text-[14px] font-semibold text-primary"
                    >
                      Details <ArrowUpRight size={15} />
                    </a>
                  )}
                </div>
              </div>
            </section>
          )}
        </>
      )}

      {/* Complete Event Detail Preview Sheet */}
      {activePreview && (
        <Sheet title={activePreview.event.name} onClose={() => setPreviewEvent(null)}>
          <div className="event-preview-facts space-y-5">
            {activePreview.event.heroImageUrl && (
              <div className="overflow-hidden rounded-xl bg-foreground">
                <img
                  src={activePreview.event.heroImageUrl}
                  alt={activePreview.event.name}
                  width={800}
                  height={450}
                  decoding="async"
                  className="h-48 w-full object-cover"
                />
              </div>
            )}
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="eb-kicker text-primary">
                  {activePreview.event.category} · {activePreview.festival.organiser}
                </p>
                <p className="mt-1 text-[20px] font-bold leading-snug">
                  {activePreview.event.venueName}
                </p>
              </div>
              {activePreview.event.id === data.event.id && (
                <button
                  type="button"
                  aria-label="Save event"
                  aria-pressed={attendee.preferences.following}
                  onClick={attendee.toggleFollow}
                  className="eb-press grid size-11 flex-none place-items-center rounded-full border border-border bg-card text-primary"
                >
                  <Heart
                    size={20}
                    fill={attendee.preferences.following ? "currentColor" : "none"}
                  />
                </button>
              )}
            </div>

            <p className="text-[15px] leading-relaxed text-muted-foreground">
              {activePreview.event.description}
            </p>

            <div className="eb-list">
              <p className="eb-row py-2.5 text-[15px]">
                <CalendarDays size={18} className="text-primary" aria-hidden />
                <span>{previewDate}</span>
              </p>
              <p className="eb-row py-2.5 text-[15px]">
                <Clock size={18} className="text-primary" aria-hidden />
                <span>{previewHours}</span>
              </p>
            </div>

            {previewFeatured.length > 0 && (
              <div className="border-l-2 border-primary pl-3.5 text-[14px]">
                <p className="font-semibold text-foreground">Featured highlights</p>
                <p className="mt-0.5 text-muted-foreground">
                  {previewFeatured.map((p) => p.name).join(" · ")}
                </p>
              </div>
            )}

            <p className="text-[14px] text-muted-foreground">
              {activePreview.festival.rules[0] ?? "Follow organiser entry rules at the gates."}
            </p>

            {activePreview.event.id === data.event.id && (
              <div>
                <p className="mb-2 text-[14px] font-semibold">Save to collection</p>
                <div className="flex flex-wrap gap-2" role="group" aria-label="Event collections">
                  {EVENT_COLLECTIONS.map((col) => {
                    const active = attendee.preferences.collections.includes(col);
                    return (
                      <button
                        key={col}
                        type="button"
                        className="eb-chip"
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
            )}

            <div className="flex flex-wrap items-center gap-4">
              <button
                type="button"
                className="min-h-11 text-[15px] font-semibold text-foreground underline underline-offset-4"
                onClick={() => downloadEventCalendar(activePreview)}
              >
                Add event to my calendar
              </button>
              {previewTicketUrl && (
                <a
                  href={previewTicketUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex min-h-11 items-center gap-1 text-[15px] font-semibold text-primary"
                >
                  Buy tickets on {previewTicketProvider} <ArrowUpRight size={16} aria-hidden />
                </a>
              )}
            </div>

            <PrimaryButton
              onClick={() => {
                if (activePreview.event.id === data.event.id) {
                  if (
                    attendee.update({
                      selectedEventId: data.event.id,
                      following: true,
                      hasName: true,
                      onboardingDone: true,
                    })
                  ) {
                    setPreviewEvent(null);
                    navigate("home");
                  }
                } else {
                  setPreviewEvent(null);
                  openPublishedEvent(activePreview);
                }
              }}
            >
              {activePreview.event.id === data.event.id && ended ? "View recap" : "Enter Event"}
            </PrimaryButton>
          </div>
        </Sheet>
      )}
    </div>
  );
}
