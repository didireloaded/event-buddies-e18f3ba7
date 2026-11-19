import {
  ArrowUpRight,
  Compass,
  Crosshair,
  EyeOff,
  Lock,
  Map as MapIcon,
  Maximize2,
  Minus,
  Plus,
  RefreshCw,
  Shield,
  Ticket,
  Users,
  WifiOff,
  X,
} from "lucide-react";
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { clusterMapPlaces, matchesFilter, matchesMapSearch, visiblePins } from "@/lib/attendee/map";
import {
  computeCanvasMaxZoom,
  computeChromePadding,
  computeFittedImageRect,
} from "@/lib/attendee/map-fit";
import { DRINK_CATEGORIES, getMenuForBar, type DrinkCategory } from "@/lib/attendee/bar-menu";
import {
  formatTicketTier,
  getEventOpensTime,
  isZoneLockedForTier,
  requiredTierForPlace,
} from "@/lib/attendee/tickets";
import { cn } from "@/lib/utils";
import { activeLandmarkPin } from "@/lib/attendee/lifecycle";
import { initials, useCompanion } from "./context";
import { Sheet } from "./Sheet";
import { useMapGestures } from "./use-map-gestures";
import { MAP_FILTERS, TYPE_LABELS, placeIcon, placeTone } from "./places";
import { Chevron, IconTile, PrimaryButton, RowText, SearchField, SecondaryButton } from "./ui";

const MIN_ZOOM = 1;

function MapCanvas({ expanded }: { expanded: boolean }) {
  const { data, places, map, openSheet, attendee, avatar, now, crew, online, eventTickets } =
    useCompanion();
  const hereId = activeLandmarkPin(data, attendee.preferences.here, now)?.pointId ?? null;
  const userTier = eventTickets[0]?.tier ?? attendee.preferences.ticketTier ?? "general";

  const [zoom, setZoomState] = useState(expanded ? 2.2 : MIN_ZOOM);
  const [bearing, setBearing] = useState(0);
  const [viewportSize, setViewportSize] = useState({ width: 0, height: 0 });
  const [naturalSize, setNaturalSize] = useState({ width: 1238, height: 1238 });
  const [zoomLayerReady, setZoomLayerReady] = useState(false);
  const [imageState, setImageState] = useState<"empty" | "loading" | "loaded" | "error">(() =>
    data.event.mapImageUrl ? "loading" : "empty",
  );
  const [retryKey, setRetryKey] = useState(0);

  const viewport = useRef<HTMLDivElement>(null);
  const anchor = useRef<{ x: number; y: number; screenX: number; screenY: number } | null>(null);

  useEffect(() => {
    setImageState(data.event.mapImageUrl ? "loading" : "empty");
    setZoomLayerReady(false);
    setZoomState(expanded ? 2.2 : MIN_ZOOM);
    setBearing(0);
  }, [data.event.id, data.event.mapImageUrl, expanded]);

  // Progressive display -> high-res zoom upgrade when pinching past 2x (Map Fit Prompt 5 #6)
  useEffect(() => {
    if (zoom < 2 || zoomLayerReady || !data.event.mapZoomImageUrl || imageState !== "loaded") {
      return;
    }
    let active = true;
    const preloader = new Image();
    preloader.onload = () => {
      if (active) setZoomLayerReady(true);
    };
    preloader.src = data.event.mapZoomImageUrl;
    return () => {
      active = false;
    };
  }, [zoom, zoomLayerReady, data.event.mapZoomImageUrl, imageState]);

  useLayoutEffect(() => {
    const element = viewport.current;
    if (!element) return;
    const measure = () =>
      setViewportSize({
        width: element.clientWidth,
        height: element.clientHeight,
      });
    measure();
    if (typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(measure);
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  const padding = useMemo(
    () =>
      computeChromePadding({
        topChrome: expanded ? 48 : map.filter !== "all" ? 28 : 8,
        bottomChrome: expanded ? 56 : 36,
        side: 12,
      }),
    [expanded, map.filter],
  );

  const fitted = useMemo(() => {
    if (!viewportSize.width || !viewportSize.height) {
      return { width: 0, height: 0, offsetX: 0, offsetY: 0, aspectRatio: 1 };
    }
    return computeFittedImageRect(
      viewportSize.width,
      viewportSize.height,
      naturalSize.width,
      naturalSize.height,
      padding,
    );
  }, [viewportSize.width, viewportSize.height, naturalSize.width, naturalSize.height, padding]);

  const maxZoom = useMemo(
    () => computeCanvasMaxZoom(naturalSize.width, naturalSize.height, viewportSize.width || 390),
    [naturalSize.width, naturalSize.height, viewportSize.width],
  );

  // On rotation or resize, re-clamp zoom so it never exceeds native image resolution
  useEffect(() => {
    setZoomState((prev) => Math.min(maxZoom, Math.max(MIN_ZOOM, prev)));
  }, [maxZoom]);

  // Keep the centre of the view stationary while zooming and clamp strictly within [MIN_ZOOM, maxZoom].
  const setZoom = (next: number, screenX?: number, screenY?: number) => {
    const el = viewport.current;
    if (el) {
      anchor.current = {
        x: (el.scrollLeft + (screenX ?? el.clientWidth / 2)) / Math.max(1, el.scrollWidth),
        y: (el.scrollTop + (screenY ?? el.clientHeight / 2)) / Math.max(1, el.scrollHeight),
        screenX: screenX ?? el.clientWidth / 2,
        screenY: screenY ?? el.clientHeight / 2,
      };
    }
    setZoomState(Math.min(maxZoom, Math.max(MIN_ZOOM, next)));
  };

  const recenter = () => {
    anchor.current = null;
    setZoomState(MIN_ZOOM);
    setBearing(0);
    const el = viewport.current;
    if (el) {
      requestAnimationFrame(() => {
        el.scrollTo({
          left: Math.max(0, (el.scrollWidth - el.clientWidth) / 2),
          top: Math.max(0, (el.scrollHeight - el.clientHeight) / 2),
          behavior: "smooth",
        });
      });
    }
  };

  const gestures = useMapGestures(viewport, zoom, setZoom, bearing, setBearing);

  useLayoutEffect(() => {
    const el = viewport.current;
    const a = anchor.current;
    if (!el || !a) return;
    el.scrollTo({
      left: a.x * el.scrollWidth - a.screenX,
      top: a.y * el.scrollHeight - a.screenY,
    });
    anchor.current = null;
  }, [zoom]);

  const target = places.find((p) => p.id === map.selected) ?? (expanded ? places[0] : undefined);
  useEffect(() => {
    const el = viewport.current;
    if (!el || !target) return;
    const frame = requestAnimationFrame(() =>
      el.scrollTo({
        left: (el.scrollWidth * target.x) / 100 - el.clientWidth / 2,
        top: (el.scrollHeight * target.y) / 100 - el.clientHeight / 2,
      }),
    );
    return () => cancelAnimationFrame(frame);
  }, [target, fitted.width, fitted.height]);

  useLayoutEffect(() => {
    const el = viewport.current;
    if (el && !target && zoom === MIN_ZOOM) {
      el.scrollLeft = Math.max(0, (el.scrollWidth - el.clientWidth) / 2);
      el.scrollTop = Math.max(0, (el.scrollHeight - el.clientHeight) / 2);
    }
  }, [fitted.width, fitted.height, target, zoom]);

  const pins = visiblePins(places, map.filter, map.query, map.selected, data);
  const groups = [
    ...clusterMapPlaces(
      pins.filter((p) => p.id !== map.selected),
      zoom,
    ),
    ...pins.filter((p) => p.id === map.selected).map((place) => ({ place, ids: [place.id] })),
  ];

  const activeCrewMembers =
    crew.crew?.members.filter(
      (m) => m.pointId && m.expiresAt && Date.parse(m.expiresAt) > (now ?? Date.now()),
    ) ?? [];
  const activeCrewPins = activeCrewMembers.length;
  const crewLeadPlace = activeCrewMembers[0]?.pointId
    ? places.find((p) => p.id === activeCrewMembers[0]!.pointId)
    : null;
  const activeMapSrc =
    zoomLayerReady && data.event.mapZoomImageUrl
      ? data.event.mapZoomImageUrl
      : data.event.mapImageUrl;

  const canvasWidthPx = fitted.width ? Math.round(fitted.width * zoom) : 0;
  const canvasHeightPx = fitted.height ? Math.round(fitted.height * zoom) : 0;

  return (
    <div
      className={cn(
        "venue-map-canvas relative overflow-hidden transition-opacity duration-200",
        expanded ? "h-full w-full" : "w-full",
      )}
    >
      {/* Offline banner when showing cached site plan */}
      {!online && imageState === "loaded" && (
        <div
          role="status"
          className="absolute inset-x-0 top-0 z-20 flex items-center justify-center gap-1.5 bg-warning-soft/95 px-3 py-1 text-[12px] font-medium text-foreground backdrop-blur"
        >
          <WifiOff size={13} aria-hidden /> Offline — showing saved map
        </div>
      )}

      {/* State 2: Empty (no site plan on this event) */}
      {imageState === "empty" && (
        <div
          data-testid="map-empty-state"
          className="flex h-full w-full flex-col items-center justify-center px-6 text-center transition-opacity duration-200"
        >
          <span className="grid size-14 place-items-center rounded-2xl bg-popover text-muted-foreground shadow-sm ring-1 ring-border">
            <MapIcon size={28} aria-hidden />
          </span>
          <p className="mt-4 text-[22px] font-bold text-foreground">Map coming soon</p>
          <p className="mt-1 max-w-xs text-[15px] text-muted-foreground">
            Venue map coming soon for {data.event.name}. Check back closer to the event.
          </p>
          {places.length > 0 && (
            <div className="mt-4 flex flex-wrap justify-center gap-2">
              {places.slice(0, 4).map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => map.setSelected(p.id)}
                  className="ios-chip text-[14px]"
                >
                  {p.name}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* State 3: Error (image failed to load) */}
      {imageState === "error" && (
        <div
          data-testid="map-error-state"
          className="flex h-full w-full flex-col items-center justify-center px-6 text-center transition-opacity duration-200"
        >
          <p className="text-[17px] font-semibold text-foreground">Couldn’t load the map</p>
          <p className="mt-1 text-[15px] text-muted-foreground">
            Check your connection or try again
          </p>
          <button
            type="button"
            onClick={() => {
              setRetryKey((k) => k + 1);
              setImageState("loading");
            }}
            className="ios-press mt-4 inline-flex min-h-11 items-center gap-2 rounded-full bg-favorite-soft px-5 text-[15px] font-semibold text-primary"
          >
            <RefreshCw size={16} aria-hidden /> Try again
          </button>
        </div>
      )}

      {/* States 1 (Loading) & 5 (Loaded) */}
      {imageState !== "empty" && imageState !== "error" && (
        <div
          ref={viewport}
          {...gestures}
          className="scrollbar-none grid h-full w-full touch-none place-items-center overflow-auto overscroll-contain p-3"
          tabIndex={0}
          aria-label="Venue plan. Drag to pan or pinch with two fingers to zoom. Zoom buttons are also available."
        >
          {imageState === "loading" && (
            <p
              role="status"
              data-testid="map-loading-state"
              className="pointer-events-none absolute z-10 animate-pulse text-[15px] font-medium text-foreground/45"
            >
              Loading map…
            </p>
          )}
          <div
            className="relative overflow-hidden rounded-xl bg-white shadow-sm ring-1 ring-black/10 transition-opacity duration-200"
            style={{
              width: canvasWidthPx ? `${canvasWidthPx}px` : `${zoom * 100}%`,
              height: canvasHeightPx ? `${canvasHeightPx}px` : undefined,
              aspectRatio: !canvasHeightPx
                ? `${naturalSize.width} / ${naturalSize.height}`
                : undefined,
              transform: bearing !== 0 ? `rotate(${bearing}deg)` : undefined,
              opacity: imageState === "loaded" ? 1 : 0.25,
            }}
          >
            <img
              key={`${data.event.mapImageUrl}-${retryKey}`}
              src={
                retryKey > 0 && activeMapSrc
                  ? `${activeMapSrc}${activeMapSrc.includes("?") ? "&" : "?"}retry=${retryKey}`
                  : activeMapSrc
              }
              alt={`Supplied ${data.event.name} venue plan`}
              className="venue-map-image absolute inset-0 h-full w-full select-none object-contain"
              draggable={false}
              onLoad={(e) => {
                const img = e.currentTarget;
                if (img.naturalWidth > 0 && img.naturalHeight > 0) {
                  setNaturalSize({ width: img.naturalWidth, height: img.naturalHeight });
                }
                setImageState("loaded");
              }}
              onError={() => setImageState("error")}
            />

            {places.map((place) => {
              const members =
                crew.crew?.members.filter(
                  (member) =>
                    member.pointId === place.id &&
                    member.expiresAt &&
                    Date.parse(member.expiresAt) > (now ?? Date.now()),
                ) ?? [];
              if (!members.length) return null;
              return (
                <button
                  key={`crew-${place.id}`}
                  type="button"
                  className="absolute z-20 grid min-h-11 min-w-11 -translate-x-1/2 -translate-y-full place-items-center rounded-full border-2 border-white bg-primary px-2 text-[14px] font-semibold text-primary-foreground shadow-float"
                  style={{ left: `${place.x}%`, top: `${place.y}%` }}
                  aria-label={`${members.map((m) => m.name).join(", ")} shared ${place.name}`}
                  onClick={() => {
                    map.setSelected(place.id);
                    if (expanded) map.setExpanded(false);
                  }}
                >
                  {members.length > 1 ? `${members.length} crew` : initials(members[0]!.name)}
                </button>
              );
            })}

            {groups.map(({ place, ids }) => {
              const Icon = placeIcon(place.type);
              const many = ids.length > 1;
              const selected = map.selected !== null && ids.includes(map.selected);
              const isHere = place.id === hereId;
              const locked = !many && isZoneLockedForTier(place, userTier);
              return (
                <button
                  key={place.id}
                  type="button"
                  className="map-pin"
                  data-selected={selected}
                  data-type={place.type}
                  data-locked={locked}
                  style={{ left: `${place.x}%`, top: `${place.y}%` }}
                  aria-label={
                    many
                      ? `${ids.length} ${TYPE_LABELS[place.type] ?? place.type} points nearby`
                      : `${place.name}${locked ? " (locked for current ticket tier)" : ""}${selected ? ", selected" : ""}`
                  }
                  onClick={() => {
                    if (many) openSheet({ kind: "places", ids });
                    else {
                      map.setSelected(place.id);
                      if (expanded) map.setExpanded(false);
                    }
                  }}
                >
                  <span className={cn("map-pin-dot overflow-hidden", isHere && "map-pin-here")}>
                    {many ? (
                      ids.length
                    ) : isHere && avatar?.url ? (
                      <img src={avatar.url} alt="" className="h-full w-full object-cover" />
                    ) : locked ? (
                      <Lock size={14} strokeWidth={2.5} aria-hidden />
                    ) : (
                      <Icon size={15} strokeWidth={2.4} aria-hidden />
                    )}
                  </span>
                  {(selected || isHere || zoom >= 2.2) && !many && (
                    <span className="map-pin-label">
                      {isHere ? `You · ${place.name}` : place.name}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Top-right controls: Fullscreen toggle + Compass (visible when map is rotated) */}
      <div className="absolute right-3 top-3 z-20 flex flex-col gap-2">
        <button
          type="button"
          onClick={() => map.setExpanded(!expanded)}
          aria-label={expanded ? "Close full-screen map" : "Open full-screen map"}
          className="grid size-11 place-items-center rounded-full bg-white/95 text-foreground shadow-float backdrop-blur"
        >
          {expanded ? <X size={20} /> : <Maximize2 size={18} />}
        </button>
        {bearing !== 0 && (
          <button
            type="button"
            onClick={() => setBearing(0)}
            aria-label="Reset north"
            data-testid="map-compass-btn"
            className="grid size-10 place-items-center rounded-full bg-white/95 text-foreground shadow-float backdrop-blur"
          >
            <Compass size={19} style={{ transform: `rotate(${-bearing}deg)` }} aria-hidden />
          </button>
        )}
      </div>

      {/* Bottom-left live sharing / crew peek pill */}
      {imageState === "loaded" && (
        <div className="pointer-events-none absolute bottom-3 left-3 z-20 max-w-[68%] truncate rounded-full bg-white/92 px-3 py-1.5 text-[13px] font-medium text-foreground shadow-sm backdrop-blur ring-1 ring-black/5">
          {activeCrewPins > 0 && crewLeadPlace
            ? `${activeCrewPins} of your crew ${activeCrewPins === 1 ? "is" : "are"} at ${crewLeadPlace.name}`
            : activeCrewPins > 0
              ? `${activeCrewPins} sharing live`
              : "Tap a location to see details"}
        </div>
      )}

      {/* Bottom-right controls: Zoom + Recenter FAB (always visible, 48px) */}
      {imageState !== "empty" && imageState !== "error" && (
        <div className="absolute bottom-3 right-3 z-20 flex flex-col items-center gap-2">
          <div className="flex flex-col overflow-hidden rounded-xl bg-white/95 text-foreground shadow-float backdrop-blur">
            <button
              type="button"
              aria-label="Zoom in"
              disabled={zoom >= maxZoom}
              onClick={() => setZoom(zoom + 0.5)}
              className="grid size-11 place-items-center disabled:opacity-35"
            >
              <Plus size={20} />
            </button>
            <span className="mx-2 h-px bg-separator" aria-hidden />
            <button
              type="button"
              aria-label="Zoom out"
              disabled={zoom <= MIN_ZOOM}
              onClick={() => setZoom(zoom - 0.5)}
              className="grid size-11 place-items-center disabled:opacity-35"
            >
              <Minus size={20} />
            </button>
          </div>
          <button
            type="button"
            aria-label="Recenter map"
            data-testid="map-recenter-fab"
            onClick={recenter}
            className="ios-press grid size-12 place-items-center rounded-full bg-white/95 text-foreground shadow-float backdrop-blur ring-1 ring-black/10"
          >
            <Crosshair size={21} aria-hidden />
          </button>
        </div>
      )}
    </div>
  );
}

function ExpandedMap() {
  const { map, view } = useCompanion();
  const dialog = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const el = dialog.current;
    const trigger = document.activeElement as HTMLElement | null;
    if (el && !el.open) el.showModal();
    return () => {
      el?.close();
      requestAnimationFrame(() => trigger?.isConnected && trigger.focus({ preventScroll: true }));
    };
  }, []);
  if (view !== "map") return null;
  return (
    <dialog
      ref={dialog}
      aria-label="Full-screen venue plan"
      className="m-0 h-dvh max-h-none w-screen max-w-none bg-card p-0 pt-safe pb-safe"
      onCancel={(event) => {
        event.preventDefault();
        map.setExpanded(false);
      }}
    >
      <MapCanvas expanded />
    </dialog>
  );
}

function BarMenuSection({ eventId, barName }: { eventId: string; barName: string }) {
  const menu = useMemo(() => getMenuForBar(eventId, barName), [eventId, barName]);
  const [category, setCategory] = useState<DrinkCategory | "All">("All");
  const visibleItems =
    category === "All" ? menu.items : menu.items.filter((item) => item.category === category);

  return (
    <div className="mt-3 space-y-2.5 rounded-2xl bg-popover p-3.5 ring-1 ring-border">
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-[15px] font-semibold">Drinks menu</h3>
        {menu.isSample && (
          <span className="rounded-full bg-warning-soft px-2.5 py-0.5 text-[12px] font-semibold text-foreground">
            Sample Menu
          </span>
        )}
      </div>
      <div className="scrollbar-none flex gap-1.5 overflow-x-auto py-0.5">
        {(["All", ...DRINK_CATEGORIES] as const).map((cat) => (
          <button
            key={cat}
            type="button"
            aria-pressed={category === cat}
            onClick={() => setCategory(cat)}
            className="ios-chip min-h-9 px-3 text-[13px]"
          >
            {cat}
          </button>
        ))}
      </div>
      <ul className="divide-y divide-border text-[15px]">
        {visibleItems.map((drink) => (
          <li key={drink.id} className="flex items-center justify-between gap-2 py-2">
            <span>
              <span className="font-medium">{drink.name}</span>
              <span className="block text-[12px] text-muted-foreground">{drink.category}</span>
            </span>
            <span className="text-[13px] tabular-nums text-muted-foreground">
              {drink.price ?? "Price TBC"}
            </span>
          </li>
        ))}
      </ul>
      <p className="text-[12px] text-muted-foreground">{menu.paymentNote}</p>
    </div>
  );
}

export function MapView() {
  const {
    data,
    places,
    map,
    openSheet,
    navigate,
    crew,
    attendee,
    now,
    eventTickets,
    openGateCard,
  } = useCompanion();
  const [categoryCollapsed, setCategoryCollapsed] = useState(false);

  const place = places.find((p) => p.id === map.selected);
  const term = map.query.trim();
  const listed = places
    .filter((p) => matchesMapSearch(p, map.query, data))
    .filter((p) => Boolean(term) || matchesFilter(p, map.filter));

  const stageArtists = place ? data.festival.artists.filter((a) => a.stageId === place.id) : [];
  const userTier = eventTickets[0]?.tier ?? attendee.preferences.ticketTier ?? "general";
  const placeRequiredTier = place ? requiredTierForPlace(place) : null;
  const placeLocked = place ? isZoneLockedForTier(place, userTier) : false;
  const ticketUrl = data.event.ticketUrl || data.festival.ticketUrl;

  return (
    <div className="venue-map-page pb-4">
      <div className="flex items-end justify-between gap-2 px-4 pt-2">
        <div className="min-w-0 flex-1">
          <h1 className="ios-large-title">Map</h1>
        </div>
        <button
          type="button"
          aria-label="Find nearby facilities"
          onClick={() => openSheet({ kind: "nearby" })}
          className="mb-1 grid size-11 flex-none place-items-center rounded-full bg-popover ring-1 ring-border"
        >
          <Compass size={19} />
        </button>
        <button
          type="button"
          aria-label="Location privacy"
          onClick={() => openSheet({ kind: "privacy" })}
          className="mb-1 grid size-11 flex-none place-items-center rounded-full bg-popover ring-1 ring-border"
        >
          <EyeOff size={19} />
        </button>
        <button
          type="button"
          aria-label="Show medics, security and exits"
          onClick={() => {
            map.setQuery("");
            map.setSelected(null);
            map.setFilter("safety");
            setCategoryCollapsed(false);
          }}
          className="mb-1 grid size-11 flex-none place-items-center rounded-full bg-popover ring-1 ring-border"
        >
          <Shield size={19} />
        </button>
      </div>

      <div className="mt-3 px-4">
        <SearchField
          id="venue-search"
          label="Search venue places or artists"
          placeholder="Stage, bar, toilet or artist"
          value={map.query}
          onChange={(value) => {
            map.setQuery(value);
            map.setSelected(null);
          }}
        />
      </div>

      <div
        className="scrollbar-none mt-2 flex gap-2 overflow-x-auto px-4 py-1"
        role="group"
        aria-label="Filter places"
      >
        {MAP_FILTERS.filter(
          ({ id }) => id === "all" || places.some((p) => matchesFilter(p, id)),
        ).map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            type="button"
            className="ios-chip"
            aria-pressed={map.filter === id}
            aria-expanded={id !== "all" ? map.filter === id && !term : undefined}
            aria-controls={
              id !== "all" && map.filter === id && !term ? "map-category-places" : undefined
            }
            onClick={() => {
              map.setQuery("");
              map.setFilter(id);
              map.setSelected(null);
              setCategoryCollapsed(false);
            }}
          >
            <Icon size={16} aria-hidden /> {label}
            {id !== "all" && (
              <span className="ml-0.5 text-[13px] text-muted-foreground">
                {places.filter((p) => matchesFilter(p, id)).length}
              </span>
            )}
          </button>
        ))}
      </div>

      {map.filter !== "all" && !term && (
        <section
          id="map-category-places"
          className="mx-4 mt-2 overflow-hidden rounded-2xl border border-border bg-popover shadow-sm"
          aria-label={`${MAP_FILTERS.find((f) => f.id === map.filter)?.label ?? "Places"} on the venue plan`}
        >
          <div className="flex items-center justify-between gap-2 border-b border-border px-4 py-2.5">
            <button
              type="button"
              className="text-left"
              onClick={() => setCategoryCollapsed((c) => !c)}
            >
              <p className="text-[16px] font-semibold">
                {MAP_FILTERS.find((f) => f.id === map.filter)?.label}
              </p>
              <p className="text-[13px] text-muted-foreground">{listed.length} on the venue plan</p>
            </button>
            <div className="flex items-center gap-3">
              {map.filter === "safety" && (
                <button
                  type="button"
                  className="text-[14px] font-semibold text-primary"
                  onClick={() => openSheet({ kind: "safety" })}
                >
                  Safety &amp; ICE
                </button>
              )}
              <button
                type="button"
                className="text-[14px] font-semibold text-primary"
                onClick={() => map.setFilter("all")}
              >
                Show all
              </button>
            </div>
          </div>
          {!categoryCollapsed && (
            <div className="max-h-40 overflow-y-auto">
              {listed.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  aria-pressed={p.id === map.selected}
                  className="ios-row w-full border-b border-border last:border-b-0"
                  onClick={() => map.setSelected(p.id)}
                >
                  <IconTile icon={placeIcon(p.type)} tone={placeTone(p.type)} />
                  <RowText title={p.name} subtitle={TYPE_LABELS[p.type] ?? p.type} />
                  <Chevron />
                </button>
              ))}
            </div>
          )}
        </section>
      )}

      <div className="mt-2 lg:grid lg:grid-cols-[minmax(0,1fr)_22rem] lg:items-start lg:gap-6 lg:px-4">
        <div className="lg:sticky lg:top-20">
          <div className="mx-4 mb-2 flex items-center justify-between rounded-xl bg-popover px-3 py-2 text-[13px] text-muted-foreground">
            <span>
              {(() => {
                const activeCrewPins =
                  crew.crew?.members.filter(
                    (m) =>
                      m.pointId && m.expiresAt && Date.parse(m.expiresAt) > (now ?? Date.now()),
                  ).length ?? 0;
                const localHere = Boolean(activeLandmarkPin(data, attendee.preferences.here, now));
                if (activeCrewPins > 0) {
                  return `${activeCrewPins} crew ${activeCrewPins === 1 ? "pin" : "pins"} live on the map`;
                }
                if (localHere) {
                  return "Your 60-minute landmark pin is active on this phone";
                }
                return "You’re hidden · no active pins — tap any landmark to plan or drop a pin";
              })()}
            </span>
          </div>
          <MapCanvas expanded={false} />
        </div>

        <div>
          {place ? (
            <Sheet title={place.name} onClose={() => map.setSelected(null)}>
              <section aria-live="polite" aria-labelledby="place-title" className="px-4">
                <div className="space-y-3 py-2">
                  <div className="flex items-start gap-3">
                    <IconTile icon={placeIcon(place.type)} tone={placeTone(place.type)} />
                    <div className="min-w-0 flex-1">
                      <p className="text-[13px] font-semibold uppercase tracking-wide text-muted-foreground">
                        {TYPE_LABELS[place.type] ?? place.type}
                      </p>
                      <h2 id="place-title" className="sr-only">
                        {place.name}
                      </h2>
                    </div>
                  </div>

                  {/* Map Tier Lock / Unlock banner */}
                  {placeRequiredTier && (
                    <div
                      data-testid="map-tier-access-note"
                      className={`space-y-2 rounded-2xl p-3.5 text-[15px] ${
                        placeLocked
                          ? "border border-warning/40 bg-warning-soft"
                          : "border border-primary/25 bg-favorite-soft"
                      }`}
                    >
                      <p className="font-semibold">
                        {placeLocked
                          ? `${place.name} is for ${formatTicketTier(placeRequiredTier)} ticket holders.`
                          : `Unlocked with your ${formatTicketTier(userTier)} ticket tier.`}
                      </p>
                      <p className="text-[13px] text-muted-foreground">
                        Stewards check official wristbands at zone entrances.
                      </p>
                      <div className="flex flex-wrap gap-3 pt-1">
                        <button
                          type="button"
                          className="min-h-10 text-[14px] font-semibold text-primary"
                          onClick={() => {
                            map.setSelected(null);
                            openSheet({ kind: "ticket" });
                          }}
                        >
                          Change my ticket tier
                        </button>
                        {placeLocked && ticketUrl && (
                          <button
                            type="button"
                            className="inline-flex min-h-10 items-center gap-1 text-[14px] font-semibold text-foreground underline"
                            onClick={() => {
                              map.setSelected(null);
                              openSheet({ kind: "buy-tickets" });
                            }}
                          >
                            Buy an upgrade <ArrowUpRight size={15} aria-hidden />
                          </button>
                        )}
                      </div>
                    </div>
                  )}

                  <p className="text-[16px] leading-relaxed">{place.description}</p>

                  {/* Category-specific detail blocks */}
                  {place.type === "stage" && (
                    <div className="space-y-2 rounded-2xl bg-popover p-3.5 ring-1 ring-border">
                      <p className="text-[15px] font-semibold">
                        {stageArtists.length
                          ? stageArtists.map((artist) => artist.name).join(" · ")
                          : "Performers awaiting confirmation"}
                      </p>
                      <p className="text-[13px] text-muted-foreground">
                        {data.festival.timetablePublished
                          ? "Check full lineup for set times."
                          : "Set times awaiting publication."}
                      </p>
                      <button
                        type="button"
                        className="inline-flex min-h-10 items-center gap-1 text-[14px] font-semibold text-primary"
                        onClick={() => {
                          map.setSelected(null);
                          navigate("lineup");
                        }}
                      >
                        View full lineup <ArrowUpRight size={15} aria-hidden />
                      </button>
                    </div>
                  )}

                  {place.type === "bar" && (
                    <BarMenuSection eventId={data.event.id} barName={place.name} />
                  )}

                  {place.type === "food" && (
                    <p className="rounded-xl bg-secondary px-3.5 py-2.5 text-[14px]">
                      <strong>Food area:</strong> Vendor menus and dietary details appear here once
                      confirmed by the organiser.
                    </p>
                  )}

                  {place.type === "entrance" && (
                    <div className="space-y-2 rounded-xl bg-secondary px-3.5 py-2.5 text-[14px]">
                      <p>
                        <strong>Opens {getEventOpensTime(data)} CAT.</strong> Have your ticket and
                        valid ID ready at the gate.
                      </p>
                      {eventTickets.length > 0 && (
                        <SecondaryButton
                          onClick={() => {
                            map.setSelected(null);
                            openGateCard(0);
                          }}
                        >
                          <Ticket size={17} aria-hidden /> Show my ticket
                        </SecondaryButton>
                      )}
                    </div>
                  )}

                  {(place.type === "first-aid" || place.type === "security") && (
                    <SecondaryButton
                      onClick={() => {
                        map.setSelected(null);
                        openSheet({ kind: "safety" });
                      }}
                    >
                      <Shield size={17} aria-hidden /> Open Safety &amp; ICE medical card
                    </SecondaryButton>
                  )}

                  {crew.crew?.members
                    .filter(
                      (m) =>
                        m.pointId === place.id &&
                        m.expiresAt &&
                        Date.parse(m.expiresAt) > (now ?? Date.now()),
                    )
                    .map((m) => (
                      <p key={m.id} className="text-[15px] text-primary">
                        {m.name} shared this landmark until{" "}
                        {new Date(m.expiresAt!).toLocaleTimeString([], {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                        .
                      </p>
                    ))}

                  <PrimaryButton
                    onClick={() => {
                      map.setSelected(null);
                      openSheet({ kind: "meeting", pointId: place.id });
                    }}
                  >
                    <Users size={19} aria-hidden /> Plan a meeting here
                  </PrimaryButton>
                </div>
              </section>
            </Sheet>
          ) : null}

          {term && listed.length === 0 && (
            <p className="px-4 py-5 text-[15px] text-muted-foreground">
              No matching places on this venue plan.
            </p>
          )}
        </div>
      </div>
      {map.expanded && <ExpandedMap />}
    </div>
  );
}
