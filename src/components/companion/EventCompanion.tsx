import {
  UserRound,
  Menu,
  House,
  Compass,
  Users,
  WifiOff,
  Check,
  Info,
  type LucideIcon,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { useEventClock, dateLabel } from "@/lib/attendee/event-clock";
import { buildPlaces, type MapFilter } from "@/lib/attendee/map";
import { useAttendee } from "@/lib/attendee/use-attendee";
import type { DemoData } from "@/lib/event/types";
import { registerServiceWorker, type OfflineStatus } from "@/lib/pwa";
import { cn } from "@/lib/utils";
import {
  Companion,
  initials,
  type CompanionContext,
  type Sheet as SheetState,
  type View,
} from "./context";
import { CrewView } from "./CrewView";
import { HomeView } from "./HomeView";
import { SafetyAccess } from "./SafetyAccess";
import { Onboarding } from "./Onboarding";
import { YouView } from "./YouView";
import { InfoView } from "./InfoView";
import { EventSections } from "./EventSections";
import { PinPrivacy } from "./PinPrivacy";
import { LineupView } from "./LineupView";
import { MapView } from "./MapView";
import { Sheet } from "./Sheet";
import { SheetContent, sheetTitle } from "./SheetContent";

const NAV: { id: View; label: string; icon: LucideIcon }[] = [
  { id: "home", label: "Events", icon: House },
  { id: "map", label: "Map", icon: Compass },
  { id: "crew", label: "Crew", icon: Users },
  { id: "you", label: "You", icon: UserRound },
];

// Tabs are hash routes (#home, #lineup, #map, #crew) so browser Back,
// refresh and deep links work, matching the original app's URLs.
const subscribeToHash = (callback: () => void) => {
  window.addEventListener("hashchange", callback);
  return () => window.removeEventListener("hashchange", callback);
};
const readHash = (): View =>
  (["home", "lineup", "map", "crew", "you", "info"] as View[]).find(
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

export function EventCompanion({ data }: { data: DemoData }) {
  const view = useSyncExternalStore(subscribeToHash, readHash, () => "home" as View);
  const online = useConnectivity();
  const attendee = useAttendee(data);
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
  const onboarding = attendee.ready && view === "home" && !attendee.preferences.hasName;
  const activeTab = view === "lineup" || view === "info" ? "home" : view;
  const message = attendee.message;

  return (
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
          <header className="ios-bar sticky top-0 z-20 pt-safe">
            <div className="mx-auto grid h-16 max-w-3xl grid-cols-[2.75rem_minmax(0,1fr)_2.75rem_2.75rem] items-center gap-1 px-safe">
              <button
                type="button"
                aria-label="Menu: profile, updates, rules and settings"
                onClick={() => setSheet({ kind: "menu" })}
                className="grid size-11 place-items-center rounded-full bg-primary text-primary-foreground"
              >
                <Menu size={20} />
              </button>
              <a
                href="#home"
                className="justify-self-center text-[20px] font-bold lowercase tracking-tight"
                aria-label="eventbuddies home"
              >
                {scrolled ? (
                  {
                    home: "Events",
                    lineup: "Lineup",
                    map: "The Grounds",
                    crew: "Crew",
                    you: "You",
                    info: "Essentials",
                  }[view]
                ) : (
                  <>
                    eventbuddies<span className="text-favorite">.</span>
                  </>
                )}
              </a>
              <SafetyAccess />
              <button
                type="button"
                aria-label="My profile"
                onClick={() => navigate("you")}
                className="grid size-11 place-items-center rounded-full bg-primary text-[14px] font-semibold text-primary-foreground"
              >
                {initials(attendee.preferences.profile.name)}
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
            {!onboarding &&
              (view === "home" || view === "lineup" || view === "map" || view === "info") && (
                <EventSections />
              )}
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
                  {places.find((p) => p.id === attendee.preferences.ride?.pointId)?.name}. Show gate
                  ↗
                </button>
              )}
            {view === "home" && !onboarding && <HomeView onShare={shareEvent} />}
            {view === "lineup" && <LineupView searchRef={searchRef} />}
            {view === "map" && <MapView />}
            {view === "crew" && <CrewView />}
            {view === "you" && <YouView />}
            {view === "info" && <InfoView />}
          </main>
        </div>

        {!onboarding && (
          <nav
            aria-label="Main"
            className="companion-navigation fixed inset-x-0 bottom-[max(0.75rem,env(safe-area-inset-bottom))] z-30 px-4"
          >
            <ul className="companion-tabs mx-auto flex h-16 max-w-md rounded-full bg-nav px-2 shadow-float">
              {NAV.map(({ id, label, icon: Icon }) => (
                <li key={id} className="flex-1">
                  <a
                    href={`#${id}`}
                    aria-current={activeTab === id ? "page" : undefined}
                    className="relative flex h-full flex-col items-center justify-center gap-0.5 rounded-full text-[12px] font-semibold text-nav-foreground aria-[current=page]:text-favorite"
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
  );
}
