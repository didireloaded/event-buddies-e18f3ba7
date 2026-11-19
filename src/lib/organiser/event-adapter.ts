import type { DemoData, MapPointRecord, PerformanceRecord, StageRecord } from "@/lib/event/types";
import type { AffineTransform, CalibrationRefPoint } from "@/lib/attendee/map-fit";
import {
  buildDefaultTemplateConfig,
  EVENT_TEMPLATES,
  readStoredTemplateConfig,
} from "@/lib/templates/event-templates";
import { EVENT_TYPES, parseProgram, parseZones, TYPE_TERMS, type EventType } from "./schema";
import type { PublishedOrganiserEvent } from "./cloud-extensions";

export const LOCAL_PUBLISHED_EVENTS_KEY = "event-buddies:published-organiser-events";
const MAP_CALIBRATION_KEY = (eventId: string) => `event-buddies:${eventId}:map-calibration:v1`;
const SITE_PLAN_ZOOM_URL_KEY = (eventId: string) =>
  `event-buddies:${eventId}:site-plan-zoom-url:v1`;

export function readStoredSitePlanZoomUrl(eventId: string): string | null {
  if (typeof window === "undefined") return null;
  try {
    return localStorage.getItem(SITE_PLAN_ZOOM_URL_KEY(eventId)) || null;
  } catch {
    return null;
  }
}

export function saveStoredSitePlanZoomUrl(eventId: string, url: string | null): void {
  if (typeof window === "undefined") return;
  try {
    if (!url) localStorage.removeItem(SITE_PLAN_ZOOM_URL_KEY(eventId));
    else localStorage.setItem(SITE_PLAN_ZOOM_URL_KEY(eventId), url);
  } catch {
    /* Ignore storage failures. */
  }
}

export type StoredMapCalibration = {
  version?: number;
  refs: CalibrationRefPoint[];
  transform: AffineTransform;
  updatedAt: string;
};

export function readStoredMapCalibration(eventId: string): StoredMapCalibration | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = JSON.parse(localStorage.getItem(MAP_CALIBRATION_KEY(eventId)) ?? "null");
    if (!raw || typeof raw !== "object" || !raw.transform) return null;
    return raw as StoredMapCalibration;
  } catch {
    return null;
  }
}

export function saveStoredMapCalibration(
  eventId: string,
  calibration: StoredMapCalibration | null,
): void {
  if (typeof window === "undefined") return;
  try {
    if (!calibration) localStorage.removeItem(MAP_CALIBRATION_KEY(eventId));
    else localStorage.setItem(MAP_CALIBRATION_KEY(eventId), JSON.stringify(calibration));
  } catch {
    /* Ignore storage failures. */
  }
}

function slugify(value: string): string {
  return (
    value
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "") || "item"
  );
}

function mapZoneTypeToPointType(zoneType: string): string {
  switch (zoneType) {
    case "toilets":
      return "toilet";
    case "medical":
      return "first-aid";
    case "gate":
      return "entrance";
    case "vip":
      return "zone";
    default:
      return zoneType;
  }
}

export function organiserEventToDemoData(ev: PublishedOrganiserEvent): DemoData {
  const eventType: EventType = (EVENT_TYPES as readonly string[]).includes(ev.eventType)
    ? (ev.eventType as EventType)
    : "festival";
  const terms = TYPE_TERMS[eventType];
  const program = parseProgram(ev.program ?? []);
  const zones = parseZones(ev.zones ?? []);

  const hasStartDate = Boolean(ev.startDate && /^\d{4}-\d{2}-\d{2}$/.test(ev.startDate));
  const hasGates = Boolean(ev.gatesOpen && /^\d{2}:\d{2}$/.test(ev.gatesOpen));
  const dateStr = hasStartDate ? ev.startDate! : null;
  const endDateStr =
    hasStartDate && ev.endDate && /^\d{4}-\d{2}-\d{2}$/.test(ev.endDate) ? ev.endDate : dateStr;
  const gatesStr = hasGates ? ev.gatesOpen : "10:00";

  // Never inherit another event's demo date (e.g. Sound of Summer's Dec 28, 2026) when date is missing.
  const startAt = dateStr ? new Date(`${dateStr}T${gatesStr}:00+02:00`) : new Date(0);
  let endAt = endDateStr ? new Date(`${endDateStr}T23:00:00+02:00`) : new Date(0);
  if (dateStr && !(endAt > startAt)) {
    endAt = new Date(+startAt + 10 * 3600000);
  }

  // Build stages from stage zones + distinct program places
  const stageZones = zones.filter((z) => z.type === "stage");
  const stages: StageRecord[] = stageZones.map((z, idx) => ({
    id: `stage-${slugify(z.name)}-${idx + 1}`,
    eventId: ev.id,
    name: z.name,
    description: z.vendorNote || `${z.name} (${terms.places})`,
    latitude: null,
    longitude: null,
    mapX: z.x ?? Math.min(85, 25 + idx * 25),
    mapY: z.y ?? 45,
    colorKey: idx === 0 ? "amber" : "teal",
    status: z.status,
    sortOrder: idx + 1,
  }));

  for (const item of program) {
    const placeName = item.place.trim();
    if (placeName && !stages.some((s) => s.name.toLowerCase() === placeName.toLowerCase())) {
      const idx = stages.length;
      stages.push({
        id: `stage-${slugify(placeName)}-${idx + 1}`,
        eventId: ev.id,
        name: placeName,
        description: `${placeName} (${terms.places})`,
        latitude: null,
        longitude: null,
        mapX: Math.min(85, 25 + idx * 25),
        mapY: 45,
        colorKey: idx === 0 ? "amber" : "teal",
        status: "open",
        sortOrder: idx + 1,
      });
    }
  }

  // Build non-stage venue points
  const points: MapPointRecord[] = zones
    .filter((z) => z.type !== "stage")
    .map((z, idx) => {
      const tierLabel = z.accessTier && z.accessTier !== "all" ? ` · ${z.accessTier} access` : "";
      const statusLabel = z.status && z.status !== "open" ? ` (${z.status})` : "";
      return {
        id: `point-${slugify(z.name)}-${idx + 1}`,
        eventId: ev.id,
        name: z.name,
        type: mapZoneTypeToPointType(z.type),
        latitude: null,
        longitude: null,
        mapX: z.x ?? Math.min(90, 20 + ((idx * 17) % 70)),
        mapY: z.y ?? Math.min(85, 30 + ((idx * 23) % 50)),
        description: (z.vendorNote
          ? `${z.vendorNote}${tierLabel}${statusLabel}`
          : `${z.name}${tierLabel}${statusLabel}`
        ).trim(),
        status: z.status,
        metadata: { accessTier: z.accessTier },
      };
    });

  // Build artists / speakers & timed performances from program
  const artists = program.map((item, idx) => {
    const matchedStage = stages.find(
      (s) => s.name.toLowerCase() === item.place.trim().toLowerCase(),
    );
    return {
      id: `artist-${slugify(item.title)}-${idx + 1}`,
      name: item.title,
      role: item.headliner
        ? eventType === "conference"
          ? "Keynote"
          : "Headliner"
        : item.place.trim() || terms.people,
      stageId: matchedStage?.id ?? null,
      avatarUrl: null,
      featured: item.featured || item.headliner,
      headliner: item.headliner,
      featuredOrder: item.featuredOrder ?? (item.headliner ? 0 : idx + 1),
    };
  });

  const performances: PerformanceRecord[] = dateStr
    ? program
        .map((item, idx) => ({ item, idx }))
        .filter(({ item }) => /^\d{2}:\d{2}$/.test(item.time))
        .map(({ item, idx }) => {
          const matchedStage =
            stages.find((s) => s.name.toLowerCase() === item.place.trim().toLowerCase()) ??
            stages[0];
          const artistId = artists[idx]?.id ?? `artist-${slugify(item.title)}-${idx + 1}`;
          const perfStart = new Date(`${dateStr}T${item.time}:00+02:00`);
          const perfEnd = new Date(+perfStart + 3600000);
          return {
            id: `perf-${slugify(item.title)}-${idx + 1}`,
            stageId: matchedStage?.id ?? "stage-1",
            artistId,
            artistName: item.title,
            genre: terms.program,
            scheduledStart: perfStart,
            scheduledEnd: perfEnd,
            status: item.status,
            sortOrder: idx + 1,
          };
        })
    : [];

  const rules = ev.entryRules
    .split(/\n+/)
    .map((r) => r.trim())
    .filter((r) => r.length > 0);

  const venueParts = (ev.venue || "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  const venueName = venueParts[0] || "Venue TBC";
  const city = venueParts[1] || venueName;
  const cloudCalibration = ev.mapCalibration ?? null;
  const localCalibration = readStoredMapCalibration(ev.id);
  const resolvedCalibration = cloudCalibration ?? localCalibration;
  const calibration = resolvedCalibration?.transform ?? null;
  const zoomUrl = ev.sitePlanZoomUrl ?? readStoredSitePlanZoomUrl(ev.id) ?? null;
  const resolvedTemplateConfig =
    ev.templateConfig ?? readStoredTemplateConfig(ev.id) ?? buildDefaultTemplateConfig(eventType);
  const templateDef = EVENT_TEMPLATES[resolvedTemplateConfig.templateId];
  const resolvedVisibility = ev.visibility ?? resolvedTemplateConfig.visibility ?? "public";
  const heroUrl = resolvedTemplateConfig.heroImageUrl || ev.sitePlanUrl || "";

  return {
    storageMode: "demo",
    following: false,
    savedPerformanceIds: [],
    announcements: [],
    stages,
    points,
    performances,
    crew: {
      id: `crew-${ev.id}`,
      eventId: ev.id,
      name: `${ev.name} ${templateDef.terms.crewLabel}`,
      ownerUserId: "self",
      inviteCode: ev.id,
    },
    crewMembers: [
      {
        userId: "self",
        displayName: "You",
        role: "owner",
        mode: null,
        mapX: null,
        mapY: null,
        zoneName: null,
        active: true,
        updatedAt: null,
      },
    ],
    event: {
      id: ev.id,
      name: ev.name,
      slug: slugify(ev.name),
      description: resolvedTemplateConfig.tagline
        ? resolvedTemplateConfig.tagline
        : ev.venue
          ? `${ev.name} at ${ev.venue}.`
          : `${ev.name} — venue details to be confirmed by the organiser.`,
      category: templateDef.categoryLabel,
      status: "published",
      startAt,
      endAt,
      doorsOpenAt: startAt,
      dateConfirmed: hasStartDate,
      gatesConfirmed: hasStartDate && hasGates,
      venueName,
      city,
      country: "Namibia",
      timezone: "Africa/Windhoek",
      latitude: null,
      longitude: null,
      // Never inherit Sound of Summer artwork for another event; empty string renders a clean typographic fallback.
      heroImageUrl: heroUrl,
      logoUrl: resolvedTemplateConfig.logoUrl ?? null,
      templateConfig: {
        ...resolvedTemplateConfig,
        visibility: resolvedVisibility,
      },
      visibility: resolvedVisibility,
      mapImageUrl: ev.sitePlanUrl ?? "",
      mapZoomImageUrl: zoomUrl,
      mapCalibration: calibration,
      mapCalibrationVersion: resolvedCalibration?.version ?? null,
      mapCalibrationUpdatedAt: resolvedCalibration?.updatedAt ?? null,
      barMenus: ev.barMenus && ev.barMenus.length > 0 ? ev.barMenus : undefined,
      ticketUrl: null,
      minTicketPrice: null,
      currency: "NAD",
      packageVersion: resolvedTemplateConfig.version ?? 1,
    },
    festival: {
      officialUrl: "",
      ticketUrl: "",
      organiser: "Verified Organiser",
      sourceCheckedAt: (ev.publishedAt ?? new Date().toISOString()).slice(0, 10),
      timetablePublished: performances.length > 0,
      mapGeoreferenced: Boolean(calibration),
      mapNotice: ev.sitePlanUrl
        ? `Uploaded site plan for ${ev.name}.`
        : `Site plan for ${ev.name} will appear here once uploaded by the organiser.`,
      artists: artists as DemoData["festival"]["artists"],
      rules: rules.length > 0 ? rules : ["Follow organiser entry instructions at the venue gates."],
      transport: `Venue: ${ev.venue || "To be confirmed by the organiser"}.`,
      timingNotice: !hasStartDate
        ? "Event date and gate hours are still to be confirmed by the organiser."
        : hasGates
          ? `Gates open at ${ev.gatesOpen} CAT.`
          : "Gate hours are still to be confirmed by the organiser.",
      relatedEvent: {
        name: "",
        date: "",
        venue: "",
        url: "",
      },
    },
  };
}

export function readLocalPublishedEvents(): PublishedOrganiserEvent[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = JSON.parse(localStorage.getItem(LOCAL_PUBLISHED_EVENTS_KEY) ?? "[]");
    return Array.isArray(raw) ? (raw as PublishedOrganiserEvent[]) : [];
  } catch {
    return [];
  }
}

export function saveLocalPublishedEvent(ev: PublishedOrganiserEvent): void {
  if (typeof window === "undefined") return;
  try {
    const existing = readLocalPublishedEvents().filter((item) => item.id !== ev.id);
    localStorage.setItem(LOCAL_PUBLISHED_EVENTS_KEY, JSON.stringify([ev, ...existing]));
  } catch {
    /* Ignore quota failures. */
  }
}

export function removeLocalPublishedEvent(eventId: string): void {
  if (typeof window === "undefined") return;
  try {
    const next = readLocalPublishedEvents().filter((item) => item.id !== eventId);
    localStorage.setItem(LOCAL_PUBLISHED_EVENTS_KEY, JSON.stringify(next));
  } catch {
    /* Ignore storage failures. */
  }
}
