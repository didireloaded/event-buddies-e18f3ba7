import {
  UserRound,
  Ellipsis,
  ChevronLeft,
  House,
  Compass,
  Users,
  Music2,
  CalendarRange,
  Trophy,
  Store,
  Sparkles,
  WifiOff,
  Check,
  Info,
  Ticket,
  type LucideIcon,
} from "lucide-react";
import {
  lazy,
  Suspense,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import { useEventClock, dateLabel } from "@/lib/attendee/event-clock";
import { buildPlaces, type MapFilter } from "@/lib/attendee/map";
import {
  ensurePrimaryBlobIndexed,
  pullTicketsFromCloud,
  readAllSavedTickets,
  subscribeTicketChanges,
  type SavedTicketMeta,
} from "@/lib/attendee/tickets";
import { useCrew } from "@/lib/crew/use-crew";
import { captureCrewInviteFromUrl } from "@/lib/crew/invite-link";
import { useAttendee } from "@/lib/attendee/use-attendee";
import { entryState, usePlatformPreferences } from "@/lib/account/platform-navigation";
import { useAttendeeAvatar } from "@/lib/attendee/avatar";
import type { DemoData } from "@/lib/event/types";
import { registerServiceWorker, type OfflineStatus } from "@/lib/pwa";
import {
  buildTemplateCssVars,
  resolveEventTemplate,
  type LayoutFamily,
} from "@/lib/templates/event-templates";
import { cn } from "@/lib/utils";
import { EventProvider, useEvent } from "@/context/EventContext";
import { Companion, type CompanionContext, type Sheet as SheetState, type View } from "./context";
const CrewView = lazy(() => import("./CrewView").then((module) => ({ default: module.CrewView })));
import { HomeView } from "./HomeView";
import { EventSelection } from "./EventSelection";
import { GateCardModal } from "./GateCardModal";
import { Onboarding } from "./Onboarding";
const YouView = lazy(() => import("./YouView").then((module) => ({ default: module.YouView })));
const InfoView = lazy(() => import("./InfoView").then((module) => ({ default: module.InfoView })));
import { PinPrivacy } from "./PinPrivacy";
import { LineupView } from "./LineupView";
const MapView = lazy(() => import("./MapView").then((module) => ({ default: module.MapView })));
import { Sheet } from "./Sheet";
import { SheetContent, sheetTitle } from "./SheetContent";

function programIconForFamily(family: LayoutFamily): LucideIcon {
  switch (family) {
    case "professional":
      return CalendarRange;
    case "competition":
      return Trophy;
    case "discovery":
      return Store;
    case "social":
      return Sparkles;
    default:
      return Music2;
  }
}

// Tabs are hash routes (#home, #lineup, #map, #crew) so browser Back,
// refresh and deep links work cleanly across every event template.
const subscribeToHash = (callback: () => void) => {
  window.addEventListener("hashchange", callback);
  return () => window.removeEventListener("hashchange", callback);
};
const readHash = (): View =>
  (["home", "lineup", "map", "crew", "you", "info", "events"] as View[]).find(
    (id) => `#${id}` === window.location.hash.split("?")[0],
  ) ?? "home";
const readHasHash = () => Boolean(window.location.hash);

function useConnectivity() {
  const [online, setOnline] = useState(true);
  useEffect(() => {
    let active = true;
    const check = async () => {
      if (!navigator.onLine) return active && setOnline(false);
      try {
        const response = await fetch("/manifest.webmanifest", {
          method: "HEAD",
          cache: "no-store",
          signal: AbortSignal.timeout(5000),
        });
        if (active) setOnline(response.ok);
      } catch {
        if (active) setOnline(false);
      }
    };
    const offline = () => setOnline(false);
    void check();
    window.addEventListener("online", check);
    window.addEventListener("offline", offline);
    return () => {
      active = false;
      window.removeEventListener("online", check);
      window.removeEventListener("offline", offline);
    };
  }, []);
  return online;
}

export function EventCompanion({
  data: initialData,
  initialEventSlug,
}: {
  data: DemoData;
  initialEventSlug?: string | undefined;
}) {
  return (
    <EventProvider initialData={initialData} initialEventSlug={initialEventSlug}>
      <EventCompanionInner initialEventSlug={initialEventSlug} />
    </EventProvider>
  );
}

function EventCompanionInner({ initialEventSlug }: { initialEventSlug?: string | undefined }) {
  const { data } = useEvent();
  const view = useSyncExternalStore(subscribeToHash, readHash, () => "home" as View);
  const hasHash = useSyncExternalStore(subscribeToHash, readHasHash, () => false);
  const online = useConnectivity();
  const attendee = useAttendee(data);
  const platform = usePlatformPreferences();
  const avatar = useAttendeeAvatar(data.event.id, attendee.auth.user?.id ?? null);
  const crew = useCrew(
    data.event.id,
    attendee.auth.user?.id ?? null,
    attendee.scope,
    attendee.ready,
  );
  const now = useEventClock(attendee.preferences.batterySaver ? 60000 : 10000);
  const places = useMemo(() => buildPlaces(data), [data]);
  const [sheet, setSheet] = useState<SheetState>(null);
  const [allTickets, setAllTickets] = useState<SavedTicketMeta[]>([]);
  const [gateCard, setGateCard] = useState<{
    open: boolean;
    index: number;
    overrideTickets: SavedTicketMeta[] | null;
  }>({
    open: false,
    index: 0,
    overrideTickets: null,
  });
  const [offlineStatus, setOfflineStatus] = useState<OfflineStatus>("checking");

  const resolvedTemplate = useMemo(
    () =>
      resolveEventTemplate({
        category: data.event.category,
        templateConfig: data.event.templateConfig,
      }),
    [data.event.category, data.event.templateConfig],
  );
  const { config: templateConfig, definition: templateDef } = resolvedTemplate;

  useEffect(() => {
    let active = true;
    setAllTickets(readAllSavedTickets());
    if (!attendee.ready) {
      const unsubEarly = subscribeTicketChanges(() => {
        if (active) setAllTickets(readAllSavedTickets());
      });
      return () => {
        active = false;
        unsubEarly();
      };
    }
    void ensurePrimaryBlobIndexed(
      data,
      attendee.preferences.profile.name,
      attendee.preferences.ticketTier,
    )
      .then(() => {
        if (active) setAllTickets(readAllSavedTickets());
      })
      .catch(() => {
        /* IndexedDB may be restricted in private browsing. */
      });
    if (attendee.auth.user?.id) {
      void pullTicketsFromCloud(attendee.auth.user.id, (evId) => ({
        name: evId === data.event.id ? data.event.name : "Saved event",
        dateIso: data.event.startAt.toISOString(),
      })).then((merged) => {
        if (active) setAllTickets(merged);
      });
    }
    const unsub = subscribeTicketChanges(() => {
      if (active) setAllTickets(readAllSavedTickets());
    });
    return () => {
      active = false;
      unsub();
    };
  }, [
    data,
    attendee.ready,
    attendee.preferences.profile.name,
    attendee.preferences.ticketTier,
    attendee.auth.user?.id,
  ]);

  const eventTickets = useMemo(
    () => allTickets.filter((t) => t.eventId === data.event.id),
    [allTickets, data.event.id],
  );

  const openGateCard = useCallback(
    (initialIndex = 0, ticketsOverride?: SavedTicketMeta[]) => {
      if (ticketsOverride && ticketsOverride.length > 0) {
        setSheet(null);
        setGateCard({ open: true, index: initialIndex, overrideTickets: ticketsOverride });
        return;
      }
      const latest = readAllSavedTickets().filter((t) => t.eventId === data.event.id);
      setAllTickets(readAllSavedTickets());
      if (latest.length > 0) {
        setSheet(null);
        setGateCard({ open: true, index: initialIndex, overrideTickets: null });
      } else {
        setSheet({ kind: "ticket" });
      }
    },
    [data.event.id],
  );
  const [filter, setFilter] = useState<MapFilter>("all");
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<string | null>(null);
  const [expanded, setExpanded] = useState(false);
  const searchRef = useRef<HTMLInputElement>(null);
  const mainRef = useRef<HTMLElement>(null);
  const shellRef = useRef<HTMLDivElement>(null);
  const headerRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const header = headerRef.current;
    if (!header) return;
    const measure = () =>
      shellRef.current?.style.setProperty("--companion-header-height", `${header.offsetHeight}px`);
    measure();
    if (typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(measure);
    observer.observe(header);
    return () => observer.disconnect();
  }, []);

  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const update = () =>
      setScrolled(Math.max(window.scrollY, shellRef.current?.scrollTop ?? 0) > 80);
    window.addEventListener("scroll", update, { passive: true });
    const shell = shellRef.current;
    shell?.addEventListener("scroll", update, { passive: true });
    return () => {
      window.removeEventListener("scroll", update);
      shell?.removeEventListener("scroll", update);
    };
  }, []);

  useEffect(() => {
    captureCrewInviteFromUrl();
    let active = true;
    void registerServiceWorker().then((status) => {
      if (active) setOfflineStatus(status);
    });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (view !== "map") setExpanded(false);
    if (typeof window.scrollTo === "function") window.scrollTo({ top: 0 });
    if (typeof shellRef.current?.scrollTo === "function") shellRef.current.scrollTo({ top: 0 });
    setScrolled(false);
  }, [view]);

  const navigate = useCallback((target: View) => {
    if (readHash() !== target || !window.location.hash) window.location.hash = target;
  }, []);

  const shareEvent = async () => {
    const payload = {
      title: data.event.name,
      text: `${data.event.name} · ${dateLabel(data.event.startAt, data.event.timezone, { day: "numeric", month: "long" })} · ${data.event.city}`,
      url: `${window.location.origin}/events/${data.event.slug}`,
    };
    try {
      if (navigator.share) await navigator.share(payload);
      else {
        await navigator.clipboard.writeText(payload.url);
        attendee.notify("Event link copied");
      }
    } catch (error) {
      if (!(error instanceof DOMException && error.name === "AbortError"))
        attendee.notify("Couldn’t share this event", true);
    }
  };

  const ctx: CompanionContext = {
    data,
    places,
    attendee,
    avatar,
    crew,
    now,
    online,
    offlineStatus,
    eventTickets,
    allTicketsCount: allTickets.length,
    openGateCard,
    view,
    navigate,
    openSheet: setSheet,
    closeSheet: () => setSheet(null),
    map: { filter, setFilter, query, setQuery, selected, setSelected, expanded, setExpanded },
    openPlace: (id) => {
      setExpanded(false);
      setQuery("");
      setFilter("all");
      setSelected(id);
      setSheet(null);
      navigate("map");
    },
    showOnMap: (next) => {
      setExpanded(false);
      setQuery("");
      setSelected(null);
      setFilter(next);
      setSheet(null);
      navigate("map");
    },
    spin: () => {
      const pool = data.festival.artists.filter(
        (a) => !attendee.preferences.savedArtists.includes(a.id),
      );
      const pick = pool[crypto.getRandomValues(new Uint32Array(1))[0]! % Math.max(1, pool.length)];
      setSheet(pick ? { kind: "artist", artist: pick } : { kind: "roulette", performance: null });
    },
    focusLineupSearch: () => {
      navigate("lineup");
      window.setTimeout(() => searchRef.current?.focus(), 60);
    },
  };

  const savedCount = attendee.preferences.savedArtists.length + attendee.preferences.saved.length;
  const directEventRoute = Boolean(
    initialEventSlug &&
    (data.event.slug.toLowerCase() === initialEventSlug.trim().toLowerCase() ||
      data.event.id === initialEventSlug),
  );
  const entry = entryState({
    direct: directEventRoute,
    view,
    signedIn: Boolean(attendee.auth.user),
    completed: platform.completed,
    legacyCompleted: attendee.preferences.onboardingDone || attendee.preferences.hasName,
    selected: Boolean(attendee.preferences.selectedEventId),
  });
  const onboarding = attendee.ready && entry.onboarding;
  // A bare platform launch never auto-enters a previously selected demo event.
  const platformLaunch = !initialEventSlug && !hasHash;
  const selecting = attendee.ready && !onboarding && (entry.discovering || platformLaunch);
  useEffect(() => {
    if (attendee.ready && !onboarding && platformLaunch) navigate("events");
  }, [attendee.ready, onboarding, platformLaunch, navigate]);
  const eventContent = attendee.ready && !onboarding && !selecting;
  const showNavigation =
    eventContent &&
    (directEventRoute ||
      Boolean(attendee.preferences.selectedEventId) ||
      ["crew", "lineup", "map"].includes(view));
  const activeTab = view === "you" || view === "info" ? "home" : view;
  const message = attendee.message;

  // Global screens use scoped consumer tokens; event templates retain their own identity.
  // hosted event screens adopt the event's template layout family, surface mode, palette and font preset.
  const applyEventTheme = eventContent && view !== "you";
  const shellThemeStyle = useMemo(
    () =>
      applyEventTheme ? (buildTemplateCssVars(templateConfig) as React.CSSProperties) : undefined,
    [applyEventTheme, templateConfig],
  );

  const navItems: { id: View; label: string; icon: LucideIcon }[] = useMemo(
    () => [
      { id: "home", label: "Events", icon: House },
      {
        id: "lineup",
        label: templateDef.terms.programLabel,
        icon: programIconForFamily(templateConfig.layoutFamily),
      },
      { id: "map", label: "Map", icon: Compass },
      { id: "crew", label: templateDef.terms.crewLabel, icon: Users },
    ],
    [templateConfig.layoutFamily, templateDef.terms.crewLabel, templateDef.terms.programLabel],
  );

  return (
    <Companion.Provider value={ctx}>
      <div
        ref={shellRef}
        data-app-scope={applyEventTheme ? "event" : "global"}
        data-layout-family={applyEventTheme ? templateConfig.layoutFamily : "global"}
        data-event-template={applyEventTheme ? templateConfig.templateId : "global"}
        data-surface-mode={applyEventTheme ? templateConfig.surfaceMode : "dark"}
        style={shellThemeStyle}
        className="companion-shell min-h-dvh bg-background text-foreground"
      >
        <a
          href="#main-content"
          onClick={(event) => {
            event.preventDefault();
            mainRef.current?.focus();
          }}
          className="sr-only z-50 rounded-lg bg-card px-4 py-3 text-foreground focus:not-sr-only focus:fixed focus:left-3 focus:top-3"
        >
          Skip to content
        </a>

        <div className="min-w-0">
          <header
            ref={headerRef}
            hidden={onboarding}
            className="eb-header sticky top-0 z-20 pt-safe"
          >
            <div className="mx-auto flex h-13 max-w-4xl items-center gap-1 px-safe">
              {selecting ? (
                <a
                  href="#events"
                  className="mr-auto flex min-h-11 items-center gap-2"
                  aria-label="eventbuddies home"
                >
                  <span
                    aria-hidden
                    className="grid size-7 place-items-center rounded-md bg-featured text-[13px] font-extrabold text-photo-shade"
                  >
                    EB
                  </span>
                  <span className="eb-display text-[17px] text-foreground">
                    Event Buddies
                  </span>
                </a>
              ) : (
                <a
                  href={view === "home" ? "#events" : "#home"}
                  className="mr-auto flex min-h-11 min-w-0 items-center gap-1 text-[15px] font-semibold tracking-tight text-foreground"
                  aria-label="eventbuddies home"
                >
                  {view === "lineup" || view === "info" || view === "you" ? (
                    <>
                      <ChevronLeft size={21} strokeWidth={2} className="flex-none" />
                      <span className="truncate">{data.event.name}</span>
                    </>
                  ) : scrolled ? (
                    <span className="truncate eb-display text-[16px]">
                      {
                        {
                          home: data.event.name,
                          map: "Venue Map",
                          crew: templateDef.terms.crewLabel,
                          you: "Profile",
                          events: "Event Buddies",
                        }[view]
                      }
                    </span>
                  ) : (
                    <>
                      <ChevronLeft
                        size={18}
                        strokeWidth={2}
                        className="flex-none text-muted-foreground"
                      />
                      <span className="truncate text-[14px] font-semibold text-muted-foreground">
                        Discover
                      </span>
                    </>
                  )}
                </a>
              )}

              {!selecting && (
                <button
                  type="button"
                  aria-label="My Tickets & Passes"
                  onClick={() =>
                    eventTickets.length > 0 ? openGateCard(0) : setSheet({ kind: "ticket" })
                  }
                  className="eb-press relative grid size-11 place-items-center rounded-full text-foreground hover:bg-secondary/70"
                >
                  <Ticket size={20} aria-hidden />
                  {eventTickets.length > 0 && (
                    <span
                      aria-hidden
                      className="absolute right-2 top-2 size-2 rounded-full bg-primary"
                    />
                  )}
                </button>
              )}
              {selecting && <Button variant="ghost" size="icon" aria-label="Event updates" className="size-11 rounded-full" onClick={() => setSheet({ kind: "updates" })}><Bell size={20} aria-hidden /></Button>}
              <button
                type="button"
                aria-label="Open your profile"
                onClick={() => navigate("you")}
                className="eb-press grid size-11 place-items-center rounded-full text-foreground hover:bg-secondary/70"
              >
                {avatar?.url ? (
                  <img
                    src={avatar.url}
                    alt=""
                    width={28}
                    height={28}
                    className="size-7 rounded-full object-cover ring-1 ring-border"
                  />
                ) : (
                  <UserRound size={20} />
                )}
              </button>
              {!selecting && (
                <button
                  type="button"
                  aria-label="Menu: profile, updates, rules and settings"
                  onClick={() => setSheet({ kind: "menu" })}
                  className="eb-press grid size-11 place-items-center rounded-full text-foreground hover:bg-secondary/70"
                >
                  <Ellipsis size={21} />
                </button>
              )}
            </div>
            <PinPrivacy />
            {!online && (
              <p
                role="status"
                className="flex items-center justify-center gap-2 bg-warning-soft px-4 py-1.5 text-[13px] font-medium text-foreground"
              >
                <WifiOff size={14} aria-hidden /> Offline · showing the saved event
              </p>
            )}
          </header>

          <main
            id="main-content"
            ref={mainRef}
            tabIndex={-1}
            className={cn(
              "mx-auto max-w-4xl pb-[calc(var(--tabbar-h)+env(safe-area-inset-bottom)+1.5rem)] outline-none",
              view === "map" && "lg:max-w-6xl",
            )}
          >
            {onboarding && <Onboarding />}
            {selecting && <EventSelection />}
            {attendee.preferences.ride &&
              now !== null &&
              now >= +data.event.endAt - 30 * 60000 &&
              now <= +data.event.endAt && (
                <button
                  type="button"
                  className="mx-4 mb-4 mt-3 block min-h-11 rounded-xl border border-warning/35 bg-warning-soft p-3 text-left text-[15px] text-foreground"
                  onClick={() => ctx.openPlace(attendee.preferences.ride!.pointId)}
                >
                  Heading home soon? Your {attendee.preferences.ride.kind} is bookmarked at{" "}
                  {places.find((p) => p.id === attendee.preferences.ride?.pointId)?.name}. Show gate
                  ↗
                </button>
              )}
            <Suspense
              fallback={
                <div role="status" className="space-y-3 px-4 py-8">
                  <div className="h-44 w-full animate-pulse rounded-2xl bg-secondary/70" />
                  <div className="h-12 w-2/3 animate-pulse rounded-xl bg-secondary/70" />
                  <p className="sr-only">Opening your event view…</p>
                </div>
              }
            >
              {eventContent && view === "home" && <HomeView onShare={shareEvent} />}
              {eventContent && view === "lineup" && <LineupView searchRef={searchRef} />}
              {eventContent && view === "map" && <MapView />}
              {eventContent && view === "crew" && <CrewView />}
              {eventContent && view === "you" && <YouView />}
              {eventContent && view === "info" && <InfoView />}
            </Suspense>
          </main>
        </div>

        {showNavigation && (
          <nav aria-label="Main" className="companion-navigation fixed inset-x-0 bottom-0 z-30">
            <ul className="companion-tabs mx-auto flex min-h-[calc(3.5rem+env(safe-area-inset-bottom))] max-w-full px-2 pb-[env(safe-area-inset-bottom)]">
              {navItems.map(({ id, label, icon: Icon }) => (
                <li key={id} className="flex-1">
                  <a
                    href={`#${id}`}
                    aria-current={activeTab === id ? "page" : undefined}
                    className="relative flex h-full min-h-14 flex-col items-center justify-center gap-0.5 text-[12px] font-semibold text-nav-foreground transition-colors aria-[current=page]:text-primary"
                  >
                    <Icon size={21} strokeWidth={activeTab === id ? 2.3 : 1.8} aria-hidden />
                    <span className="max-w-full truncate px-1">{label}</span>
                    {id === "home" && savedCount > 0 && (
                      <span className="absolute left-1/2 top-1.5 ml-2 min-w-[1.125rem] rounded-full bg-primary px-1 text-center text-[11px] font-bold leading-[1.125rem] text-primary-foreground">
                        <span className="sr-only">, </span>
                        {savedCount}
                        <span className="sr-only"> saved</span>
                      </span>
                    )}
                  </a>
                </li>
              ))}
            </ul>
          </nav>
        )}

        {message && (
          <div
            role={message.error ? "alert" : "status"}
            className="companion-toast fixed inset-x-4 bottom-[calc(var(--tabbar-h)+env(safe-area-inset-bottom)+0.75rem)] z-40 mx-auto flex max-w-sm items-center gap-2 rounded-full border border-border bg-foreground px-4 py-3 text-[14px] font-semibold text-background shadow-float"
          >
            {message.error ? <Info size={17} aria-hidden /> : <Check size={17} aria-hidden />}
            {message.text}
          </div>
        )}

        {sheet && (
          <Sheet
            title={sheetTitle(sheet, ctx)}
            onClose={() => setSheet(null)}
            key={
              sheet.kind +
              ("id" in sheet ? sheet.id : "") +
              ("artist" in sheet ? sheet.artist.id : "")
            }
          >
            <SheetContent sheet={sheet} onShare={shareEvent} />
          </Sheet>
        )}
        <GateCardModal
          open={gateCard.open}
          onClose={() => setGateCard({ open: false, index: 0, overrideTickets: null })}
          tickets={gateCard.overrideTickets ?? eventTickets}
          initialIndex={gateCard.index}
          data={data}
          online={online}
        />
      </div>
    </Companion.Provider>
  );
}
