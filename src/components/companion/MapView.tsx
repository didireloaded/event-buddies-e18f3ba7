import { Maximize2, Minus, Plus, Users, X, MapPinOff } from "lucide-react";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import {
  clusterMapPlaces,
  matchesFilter,
  matchesMapSearch,
  visiblePins,
} from "@/lib/attendee/map";
import { cn } from "@/lib/utils";
import { useCompanion } from "./context";
import { MAP_FILTERS, TYPE_LABELS, placeIcon, placeTone } from "./places";
import { Chevron, IconTile, Notice, PrimaryButton, RowText, SearchField, Section } from "./ui";

const MIN_ZOOM = 1;
const MAX_ZOOM = 4;

function MapCanvas({ expanded }: { expanded: boolean }) {
  const { data, places, map, openSheet } = useCompanion();
  const [zoom, setZoomState] = useState(expanded ? 2.5 : 1);
  const viewport = useRef<HTMLDivElement>(null);
  const anchor = useRef<{ x: number; y: number } | null>(null);

  // Keep the centre of the view stationary while zooming with the buttons.
  const setZoom = (next: number) => {
    const el = viewport.current;
    if (el) {
      anchor.current = {
        x: (el.scrollLeft + el.clientWidth / 2) / el.scrollWidth,
        y: (el.scrollTop + el.clientHeight / 2) / el.scrollHeight,
      };
    }
    setZoomState(Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, next)));
  };
  useLayoutEffect(() => {
    const el = viewport.current;
    const a = anchor.current;
    if (!el || !a) return;
    el.scrollTo({
      left: a.x * el.scrollWidth - el.clientWidth / 2,
      top: a.y * el.scrollHeight - el.clientHeight / 2,
    });
    anchor.current = null;
  }, [zoom]);

  // Centre the selected place (or the main stage when the expanded view opens).
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
  }, [target, zoom]);

  const groups = clusterMapPlaces(
    visiblePins(places, map.filter, map.query, map.selected, data),
    zoom,
  );

  return (
    <div
      className={cn(
        "relative overflow-hidden bg-card",
        expanded ? "h-full w-full" : "aspect-square w-full rounded-2xl",
      )}
    >
      <div
        ref={viewport}
        className="h-full w-full overflow-auto overscroll-contain"
        tabIndex={0}
        aria-label="Venue plan. Scroll to pan."
      >
        <div className="relative aspect-square" style={{ width: `${zoom * 100}%` }}>
          <img
            src={data.event.mapImageUrl}
            alt="Supplied Sound of Summer 2026 venue plan showing three stages, bars, toilets, medics, entrances, the Experience and Platinum zones, and the jetty"
            width={1238}
            height={1238}
            className="absolute inset-0 h-full w-full select-none"
            draggable={false}
          />
          {groups.map(({ place, ids }) => {
            const Icon = placeIcon(place.type);
            const many = ids.length > 1;
            const selected = map.selected !== null && ids.includes(map.selected);
            return (
              <button
                key={place.id}
                type="button"
                className="map-pin"
                data-selected={selected}
                style={{ left: `${place.x}%`, top: `${place.y}%` }}
                aria-label={
                  many
                    ? `${ids.length} ${TYPE_LABELS[place.type] ?? place.type} points nearby`
                    : `${place.name}${selected ? ", selected" : ""}`
                }
                onClick={() => {
                  if (many) openSheet({ kind: "places", ids });
                  else {
                    map.setSelected(place.id);
                    if (expanded) map.setExpanded(false);
                  }
                }}
              >
                <span className={placeTone(place.type)}>
                  {many ? ids.length : <Icon size={15} strokeWidth={2.4} aria-hidden />}
                </span>
                {(place.type === "stage" || selected || zoom >= 2.5) && !many && (
                  <span className="map-pin-label">{place.name}</span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      <div className="absolute right-2 top-2 flex flex-col gap-2">
        <button
          type="button"
          onClick={() => map.setExpanded(!expanded)}
          aria-label={expanded ? "Close full-screen map" : "Open full-screen map"}
          className="ios-bar grid size-11 place-items-center rounded-full text-foreground shadow-float"
        >
          {expanded ? <X size={20} /> : <Maximize2 size={18} />}
        </button>
      </div>
      <div className="ios-bar absolute bottom-2 right-2 flex flex-col overflow-hidden rounded-xl shadow-float">
        <button
          type="button"
          aria-label="Zoom in"
          disabled={zoom >= MAX_ZOOM}
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
      <p className="ios-bar absolute bottom-2 left-2 rounded-md px-2 py-1 text-[12px] font-medium text-muted-foreground">
        Plan image · not GPS · {Math.round(zoom * 100)}%
      </p>
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

export function MapView() {
  const { data, places, map, openSheet } = useCompanion();
  const detailRef = useRef<HTMLElement>(null);
  const place = places.find((p) => p.id === map.selected);
  const term = map.query.trim();
  const listed = places
    .filter((p) => matchesMapSearch(p, map.query, data))
    .filter((p) => Boolean(term) || matchesFilter(p, map.filter));

  useEffect(() => {
    if (place && window.matchMedia("(max-width: 1023px)").matches)
      detailRef.current?.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }, [place]);

  const stageArtist = place && data.festival.artists.find((a) => a.stageId === place.id);

  return (
    <>
      <h1 className="px-4 text-[34px] font-bold tracking-tight">Map</h1>
      <p className="px-4 text-[15px] text-muted-foreground">
        {data.event.venueName} · {data.points.length} marked points
      </p>
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
      <div className="scrollbar-none mt-2 flex gap-2 overflow-x-auto px-4 py-1" role="group" aria-label="Filter places">
        {MAP_FILTERS.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            type="button"
            className="ios-chip"
            aria-pressed={map.filter === id}
            onClick={() => {
              map.setFilter(id);
              map.setSelected(null);
            }}
          >
            <Icon size={16} aria-hidden /> {label}
          </button>
        ))}
      </div>

      <div className="mt-2 lg:grid lg:grid-cols-[minmax(0,1fr)_22rem] lg:items-start lg:gap-6 lg:px-4">
        <div className="px-4 lg:sticky lg:top-16 lg:px-0">
          <MapCanvas expanded={false} />
          <p className="ios-footnote px-1">{data.festival.mapNotice}</p>
        </div>

        <div>
          {place ? (
            <section
              ref={detailRef}
              aria-live="polite"
              aria-labelledby="place-title"
              className="mt-5 scroll-mt-24 px-4 lg:mt-0"
            >
              <div className="ios-group p-4">
                <div className="flex items-start gap-3">
                  <IconTile icon={placeIcon(place.type)} tone={placeTone(place.type)} />
                  <div className="min-w-0 flex-1">
                    <p className="text-[13px] font-semibold uppercase tracking-wide text-muted-foreground">
                      {TYPE_LABELS[place.type] ?? place.type}
                    </p>
                    <h2 id="place-title" className="text-[22px] font-bold leading-tight">
                      {place.name}
                    </h2>
                  </div>
                  <button
                    type="button"
                    aria-label="Close place details"
                    onClick={() => map.setSelected(null)}
                    className="-mr-2 -mt-2 grid size-11 place-items-center rounded-full text-muted-foreground"
                  >
                    <X size={20} />
                  </button>
                </div>
                <p className="mt-3 text-[17px] leading-relaxed">{place.description}</p>
                {place.type === "stage" && (
                  <p className="mt-3 rounded-lg bg-muted px-3 py-2 text-[15px]">
                    <strong className="font-semibold">{stageArtist?.name ?? "Artists to be confirmed"}</strong>
                    <span className="block text-muted-foreground">Set times awaiting publication.</span>
                  </p>
                )}
                <p className="mt-3 flex items-center gap-1.5 text-[13px] text-muted-foreground">
                  <MapPinOff size={14} aria-hidden /> Position from the plan image. No GPS or walking route yet.
                </p>
                <PrimaryButton className="mt-4" onClick={() => openSheet({ kind: "meeting" })}>
                  <Users size={19} /> Plan a meeting here
                </PrimaryButton>
              </div>
            </section>
          ) : null}

          <Section
            title={
              term
                ? `${listed.length} ${listed.length === 1 ? "result" : "results"}`
                : map.filter === "all"
                  ? `All places (${listed.length})`
                  : `${MAP_FILTERS.find((f) => f.id === map.filter)?.label} (${listed.length})`
            }
            id="map-directory"
            className="px-4 lg:mt-5"
          >
            {listed.length ? (
              <div className="ios-group ios-group-indent">
                {listed.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    className="ios-row"
                    aria-current={p.id === map.selected ? "true" : undefined}
                    onClick={() => map.setSelected(p.id)}
                  >
                    <IconTile icon={placeIcon(p.type)} tone={placeTone(p.type)} />
                    <RowText title={p.name} subtitle={TYPE_LABELS[p.type] ?? p.type} />
                    <Chevron />
                  </button>
                ))}
              </div>
            ) : (
              <Notice icon={MapPinOff}>
                No matching places. Try a stage, bar, toilet or medic point.
              </Notice>
            )}
          </Section>
        </div>
      </div>
      {map.expanded && <ExpandedMap />}
    </>
  );
}
