import type { DemoData } from "@/lib/event/types";

export type Place = {
  id: string;
  name: string;
  type: string;
  x: number;
  y: number;
  description: string;
};

export type MapFilter =
  | "all"
  | "stage"
  | "food"
  | "bar"
  | "toilet"
  | "water"
  | "entrance"
  | "sponsor"
  | "zone"
  | "safety";

export const SAFETY_TYPES = ["first-aid", "security", "exit"];

export function buildPlaces(data: DemoData): Place[] {
  return [
    ...data.stages.map((stage) => ({
      id: stage.id,
      name: stage.name,
      type: "stage",
      x: stage.mapX,
      y: stage.mapY,
      description: stage.description,
    })),
    ...data.points.map((point) => ({
      id: point.id,
      name: point.name,
      type: point.type,
      x: point.mapX,
      y: point.mapY,
      description: point.description,
    })),
  ];
}

export function matchesMapSearch(place: Place, query: string, data: DemoData) {
  const term = query.trim().toLowerCase();
  if (!term) return true;
  const artists = data.festival.artists
    .filter((artist) => artist.stageId === place.id)
    .map((artist) => artist.name)
    .join(" ");
  const aliases =
    place.type === "toilet"
      ? "bathroom restroom loo"
      : place.type === "first-aid"
        ? "medical medic help first aid"
        : place.type === "bar"
          ? "drinks"
          : "";
  const stageAliases = place.id === "sos-main" ? "Savanna Savannah Main Stage" : "";
  return `${place.name} ${place.type} ${artists} ${aliases} ${stageAliases}`
    .toLowerCase()
    .includes(term);
}

export function matchesFilter(place: Place, filter: MapFilter) {
  if (filter === "all") return true;
  if (filter === "safety") return SAFETY_TYPES.includes(place.type);
  return place.type === filter;
}

/**
 * Pins drawn on the plan. "All" shows stages, medics and entrances only so the
 * image stays readable; a search or a specific filter reveals the rest.
 */
export function visiblePins(
  places: Place[],
  filter: MapFilter,
  query: string,
  selectedId: string | null,
  data: DemoData,
) {
  return places
    .filter((place) => matchesMapSearch(place, query, data))
    .filter((place) => {
      if (place.id === selectedId || query.trim()) return true;
      if (filter === "all") return ["stage", "first-aid", "entrance"].includes(place.type);
      return matchesFilter(place, filter);
    });
}

export function clusterMapPlaces(places: Place[], zoom: number) {
  const groups: { place: Place; ids: string[] }[] = [];
  for (const place of places) {
    const group = groups.find(
      (item) =>
        place.type !== "stage" &&
        item.place.type === place.type &&
        Math.hypot(item.place.x - place.x, item.place.y - place.y) < 14 / zoom,
    );
    if (group) group.ids.push(place.id);
    else groups.push({ place, ids: [place.id] });
  }
  return groups;
}
