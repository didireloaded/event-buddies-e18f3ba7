import { CalendarDays, Ellipsis, House, Map as MapIcon, Users, WifiOff, Check, Info, type LucideIcon } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { useEventClock, dateLabel } from "@/lib/attendee/event-clock";
import { buildPlaces, type MapFilter } from "@/lib/attendee/map";
import { useAttendee } from "@/lib/attendee/use-attendee";
import type { DemoData } from "@/lib/event/types";
import { registerServiceWorker } from "@/lib/pwa";
import { cn } from "@/lib/utils";
import { Companion, initials, type CompanionContext, type Sheet as SheetState, type View } from "./context";
import { CrewView } from "./CrewView";
import { HomeView } from "./HomeView";
import { LineupView } from "./LineupView";
import { MapView } from "./MapView";
import { Sheet } from "./Sheet";
import { SheetContent, sheetTitle } from "./SheetContent";

const NAV: { id: View; label: string; icon: LucideIcon }[] = [
  { id: "home", label: "Home", icon: House },
  { id: "lineup", label: "Lineup", icon: CalendarDays },
  { id: "map", label: "Map", icon: MapIcon },
  { id: "crew", label: "Crew", icon: Users },
];

// Tabs are hash routes (#home, #lineup, #map, #crew) so browser Back,
// refresh and deep links work, matching the original app's URLs.
const subscribeToHash = (callback: () => void) => {
  window.addEventListener("hashchange", callback);
  return () => window.removeEventListener("hashchange", callback);
};
const readHash = (): View => NAV.find((item) => `#${item.id}` === window.location.hash)?.id ?? "home";

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
  const now = useEventClock();
  const places = useMemo(() => buildPlaces(data), [data]);
  const [sheet, setSheet] = useState<SheetState>(null);
  const [filter, setFilter] = useState<MapFilter>("all");
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<string | null>(null);
  const [expanded, setExpanded] = useState(false);
  const searchRef = useRef<HTMLInputElement>(null);
  const mainRef = useRef<HTMLElement>(null);

  useEffect(() => {
    void registerServiceWorker();
  }, []);

  // Leaving the Map tab (including via browser Back) closes the full-screen map.
  useEffect(() => {
    if (view !== "map") setExpanded(false);
    window.scrollTo({ top: 0 });
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
      const pool = data.festival.artists.filter((a) => !attendee.preferences.savedArtists.includes(a.id));
      const pick = pool[crypto.getRandomValues(new Uint32Array(1))[0]! % Math.max(1, pool.length)];
      setSheet(pick ? { kind: "artist", artist: pick } : { kind: "roulette", performance: null });
    },
    focusLineupSearch: () => {
      navigate("lineup");
      window.setTimeout(() => searchRef.current?.focus(), 60);
    },
  };

  const savedCount = attendee.preferences.savedArtists.length + attendee.preferences.saved.length;
  const message = attendee.message;

  return (
    <Companion.Provider value={ctx}>
      <div className="min-h-dvh md:grid md:grid-cols-[15rem_minmax(0,1fr)]">
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

        {/* Larger screens: sidebar navigation instead of bottom tabs */}
        <aside className="sticky top-0 hidden h-dvh flex-col border-r bg-sidebar px-3 pt-[max(1.25rem,env(safe-area-inset-top))] md:flex">
          <p className="px-3 text-[13px] font-semibold uppercase tracking-wide text-muted-foreground">Event Buddies</p>
          <p className="px-3 text-[20px] font-bold">{data.event.name}</p>
          <nav aria-label="Main" className="mt-6 flex flex-col gap-1">
            {NAV.map(({ id, label, icon: Icon }) => (
              <a
                key={id}
                href={`#${id}`}
                aria-current={view === id ? "page" : undefined}
                className="flex min-h-11 items-center gap-3 rounded-lg px-3 text-[17px] font-medium aria-[current=page]:bg-primary aria-[current=page]:text-primary-foreground"
              >
                <Icon size={20} aria-hidden /> {label}
                {id === "lineup" && savedCount > 0 && <span className="ml-auto text-[13px]">{savedCount}</span>}
              </a>
            ))}
          </nav>
        </aside>

        <div className="min-w-0">
          <header className="ios-bar sticky top-0 z-20 pt-safe">
            <div className="mx-auto flex h-11 max-w-3xl items-center justify-between px-safe">
              <span className="text-[17px] font-semibold md:invisible">Event Buddies</span>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  aria-label="More: profile, updates, rules and settings"
                  onClick={() => setSheet({ kind: "menu" })}
                  className="grid size-11 place-items-center rounded-full text-primary"
                >
                  <Ellipsis size={24} />
                </button>
                <button
                  type="button"
                  aria-label="My profile"
                  onClick={() => setSheet({ kind: "profile" })}
                  className="grid size-11 place-items-center"
                >
                  <span className="grid size-8 place-items-center rounded-full bg-primary text-[13px] font-semibold text-primary-foreground">
                    {initials(attendee.preferences.profile.name)}
                  </span>
                </button>
              </div>
            </div>
            {!online && (
              <p role="status" className="flex items-center justify-center gap-2 bg-warning-soft px-4 py-1.5 text-[13px] font-medium">
                <WifiOff size={14} aria-hidden /> Offline · showing the saved event
              </p>
            )}
          </header>

          <main
            id="main-content"
            ref={mainRef}
            tabIndex={-1}
            className={cn(
              "mx-auto max-w-3xl pb-[calc(var(--tabbar-h)+env(safe-area-inset-bottom)+1.5rem)] pt-2 outline-none md:pb-10",
              view === "map" && "lg:max-w-6xl",
            )}
          >
            {view === "home" && <HomeView onShare={shareEvent} />}
            {view === "lineup" && <LineupView searchRef={searchRef} />}
            {view === "map" && <MapView />}
            {view === "crew" && <CrewView />}
          </main>
        </div>

        <nav aria-label="Main" className="ios-bar fixed inset-x-0 bottom-0 z-30 border-t border-separator pb-safe md:hidden">
          <ul className="mx-auto flex h-[var(--tabbar-h)] max-w-lg">
            {NAV.map(({ id, label, icon: Icon }) => (
              <li key={id} className="flex-1">
                <a
                  href={`#${id}`}
                  aria-current={view === id ? "page" : undefined}
                  className="relative flex h-full flex-col items-center justify-center gap-0.5 text-[11px] font-medium text-muted-foreground aria-[current=page]:text-primary"
                >
                  <Icon size={24} strokeWidth={view === id ? 2.3 : 1.8} aria-hidden />
                  {label}
                  {id === "lineup" && savedCount > 0 && (
                    <span className="absolute left-1/2 top-1 ml-2 min-w-[1.125rem] rounded-full bg-favorite px-1 text-center text-[11px] font-semibold leading-[1.125rem] text-primary-foreground">
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

        {message && (
          <div
            role={message.error ? "alert" : "status"}
            className="fixed inset-x-4 bottom-[calc(var(--tabbar-h)+env(safe-area-inset-bottom)+0.75rem)] z-40 mx-auto flex max-w-sm items-center gap-2 rounded-xl bg-foreground px-4 py-3 text-[15px] font-medium text-card shadow-float md:bottom-6"
          >
            {message.error ? <Info size={18} aria-hidden /> : <Check size={18} aria-hidden />}
            {message.text}
          </div>
        )}

        {sheet && (
          <Sheet title={sheetTitle(sheet, ctx)} onClose={() => setSheet(null)} key={sheet.kind + ("id" in sheet ? sheet.id : "") + ("artist" in sheet ? sheet.artist.id : "")}>
            <SheetContent sheet={sheet} onShare={shareEvent} />
          </Sheet>
        )}
      </div>
    </Companion.Provider>
  );
}
