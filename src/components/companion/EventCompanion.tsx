import {
  UserRound,
  Ellipsis,
  ChevronLeft,
  House,
  Compass,
  Users,
  Music2,
  WifiOff,
  Check,
  Info,
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
import { useCrew } from "@/lib/crew/use-crew";
import { captureCrewInviteFromUrl } from "@/lib/crew/invite-link";
import { useAttendee } from "@/lib/attendee/use-attendee";
import { useAttendeeAvatar } from "@/lib/attendee/avatar";
import type { DemoData } from "@/lib/event/types";
import { registerServiceWorker, type OfflineStatus } from "@/lib/pwa";
import { cn } from "@/lib/utils";
import { KonstaProvider } from "konsta/react";
import { EventProvider, useEvent } from "@/context/EventContext";
import { Companion, type CompanionContext, type Sheet as SheetState, type View } from "./context";
const CrewView = lazy(() => import("./CrewView").then((module) => ({ default: module.CrewView })));
import { HomeView } from "./HomeView";
import { EventSelection } from "./EventSelection";
import { SafetyAccess } from "./SafetyAccess";
import { Onboarding } from "./Onboarding";
const YouView = lazy(() => import("./YouView").then((module) => ({ default: module.YouView })));
const InfoView = lazy(() => import("./InfoView").then((module) => ({ default: module.InfoView })));
import { PinPrivacy } from "./PinPrivacy";
import { LineupView } from "./LineupView";
const MapView = lazy(() => import("./MapView").then((module) => ({ default: module.MapView })));
import { Sheet } from "./Sheet";
import { SheetContent, sheetTitle } from "./SheetContent";

const NAV: { id: View; label: string; icon: LucideIcon }[] = [
  { id: "home", label: "Events", icon: House },
  { id: "lineup", label: "Lineup", icon: Music2 },
  { id: "map", label: "Map", icon: Compass },
  { id: "crew", label: "Crew", icon: Users },
];

// Tabs are hash routes (#home, #lineup, #map, #crew) so browser Back,
// refresh and deep links work, matching the original app's URLs.
const subscribeToHash = (callback: () => void) => {
  window.addEventListener("hashchange", callback);
  return () => window.removeEventListener("hashchange", callback);
};
const readHash = (): View =>
  (["home", "lineup", "map", "crew", "you", "info", "events"] as View[]).find(
    (id) => `#${id}` === window.location.hash.split("?")[0],
  ) ?? "home";

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

export function EventCompanion({ data: initialData }: { data: DemoData }) {
  return (
    <EventProvider initialData={initialData}>
      <EventCompanionInner />
    </EventProvider>
  );
}

function EventCompanionInner() {
  const { data } = useEvent();
  const view = useSyncExternalStore(subscribeToHash, readHash, () => "home" as View);
  const online = useConnectivity();
  const attendee = useAttendee(data);
  const avatar = useAttendeeAvatar(data.event.id);
  const crew = useCrew(
    data.event.id,
    attendee.auth.user?.id ?? null,
    attendee.scope,
    attendee.ready,
  );
  const now = useEventClock(attendee.preferences.batterySaver ? 60000 : 10000);
  const places = useMemo(() => buildPlaces(data), [data]);
  const [sheet, setSheet] = useState<SheetState>(null);
  const [offlineStatus, setOfflineStatus] = useState<OfflineStatus>("checking");
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

  // Leaving the Map tab (including via browser Back) closes the full-screen map.
  useEffect(() => {
    if (view !== "map") setExpanded(false);
    window.scrollTo({ top: 0 });
    shellRef.current?.scrollTo({ top: 0 });
    setScrolled(false);
  }, [view]);

  const navigate = useCallback((target: View) => {
    if (readHash() !== target || !window.location.hash) window.location.hash = target;
  }, []);

  const shareEvent = async () => {
    const payload = {
      title: `${data.event.name} 2026`,
      text: `${data.event.name} · ${dateLabel(data.event.startAt, data.event.timezone, { day: "numeric", month: "long" })} · ${data.event.city}`,
      url: window.location.origin,
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
    offlineStatus,
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
  const onboarding = attendee.ready && view !== "crew" && !attendee.preferences.hasName;
  const selecting =
    attendee.ready &&
    !onboarding &&
    (view === "events" || (!attendee.preferences.selectedEventId && view !== "crew"));
  const eventContent = attendee.ready && !onboarding && !selecting;
  const showNavigation =
    eventContent && attendee.preferences.hasName && Boolean(attendee.preferences.selectedEventId);
  const activeTab = view === "you" || view === "info" ? "home" : view;
  const message = attendee.message;

  return (
    <KonstaProvider theme="ios" dark materialTouchRipple={false} iosHoverHighlight={false}>
      <Companion.Provider value={ctx}>
        <div ref={shellRef} className="companion-shell min-h-dvh">
          <a
            href="#main-content"
            onClick={(event) => {
              event.preventDefault();
              mainRef.current?.focus();
            }}
            className="sr-only z-50 rounded-lg bg-card px-4 py-3 focus:not-sr-only focus:fixed focus:left-3 focus:top-3"
          >
            Skip to content
          </a>

          <div className="min-w-0">
            <header
              ref={headerRef}
              hidden={onboarding}
              className="ios-bar sticky top-0 z-20 pt-safe"
            >
              <div className="mx-auto flex h-11 max-w-3xl items-center gap-1 px-safe">
                <a
                  href="#home"
                  className="mr-auto flex min-h-11 items-center gap-1 text-[17px] font-semibold tracking-tight"
                  aria-label="eventbuddies home"
                >
                  {view === "lineup" || view === "info" || view === "you" ? (
                    <>
                      <ChevronLeft size={24} strokeWidth={2} />
                      <span>Events</span>
                    </>
                  ) : scrolled ? (
                    { home: "Events", map: "Map", crew: "Crew", you: "You", events: "Events" }[view]
                  ) : (
                    <>
                      <span className="text-favorite">Events</span>
                    </>
                  )}
                </a>
                <SafetyAccess />
                <button
                  type="button"
                  aria-label="Open your profile"
                  onClick={() => navigate("you")}
                  className="ios-press grid size-11 place-items-center rounded-full text-foreground"
                >
                  <UserRound size={22} />
                </button>
                <button
                  type="button"
                  aria-label="Menu: profile, updates, rules and settings"
                  onClick={() => setSheet({ kind: "menu" })}
                  className="ios-press grid size-11 place-items-center rounded-full text-foreground"
                >
                  <Ellipsis size={23} />
                </button>
              </div>
              <PinPrivacy />
              {!online && (
                <p
                  role="status"
                  className="flex items-center justify-center gap-2 bg-warning-soft px-4 py-1.5 text-[13px] font-medium"
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
                "mx-auto max-w-3xl pb-[calc(var(--tabbar-h)+env(safe-area-inset-bottom)+1.5rem)] pt-1 outline-none",
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
                    className="mx-4 mb-4 block min-h-11 rounded-xl bg-warning-soft p-3 text-left text-[15px]"
                    onClick={() => ctx.openPlace(attendee.preferences.ride!.pointId)}
                  >
                    Heading home soon? Your {attendee.preferences.ride.kind} is bookmarked at{" "}
                    {places.find((p) => p.id === attendee.preferences.ride?.pointId)?.name}. Show
                    gate ↗
                  </button>
                )}
              <Suspense
                fallback={
                  <p role="status" className="px-4 py-8 text-[17px] text-muted-foreground">
                    Opening your event view…
                  </p>
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
              <ul className="companion-tabs mx-auto flex min-h-[calc(3.5rem+env(safe-area-inset-bottom))] max-w-full bg-nav px-2 pb-[env(safe-area-inset-bottom)]">
                {NAV.map(({ id, label, icon: Icon }) => (
                  <li key={id} className="flex-1">
                    <a
                      href={`#${id}`}
                      aria-current={activeTab === id ? "page" : undefined}
                      className="relative flex min-h-14 h-full flex-col items-center justify-center gap-0.5 text-[13px] font-medium text-nav-foreground aria-[current=page]:text-favorite"
                    >
                      <Icon size={22} strokeWidth={activeTab === id ? 2.4 : 1.9} aria-hidden />
                      {label}
                      {id === "home" && savedCount > 0 && (
                        <span className="absolute left-1/2 top-1.5 ml-2 min-w-[1.125rem] rounded-full bg-favorite px-1 text-center text-[11px] font-semibold leading-[1.125rem] text-primary-foreground">
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
              className="companion-toast fixed inset-x-4 bottom-[calc(var(--tabbar-h)+env(safe-area-inset-bottom)+0.75rem)] z-40 mx-auto flex max-w-sm items-center gap-2 rounded-xl bg-foreground px-4 py-3 text-[15px] font-medium text-card shadow-float"
            >
              {message.error ? <Info size={18} aria-hidden /> : <Check size={18} aria-hidden />}
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
        </div>
      </Companion.Provider>
    </KonstaProvider>
  );
}
