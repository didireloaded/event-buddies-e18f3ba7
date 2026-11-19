import type { DemoData, MapPointRecord, PerformanceRecord, StageRecord } from "@/lib/event/types";
import { EVENT_TYPES, parseProgram, parseZones, TYPE_TERMS, type EventType } from "./schema";
import type { PublishedOrganiserEvent } from "./cloud-extensions";

export const LOCAL_PUBLISHED_EVENTS_KEY = "event-buddies:published-organiser-events";

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

  const dateStr =
    ev.startDate && /^\d{4}-\d{2}-\d{2}$/.test(ev.startDate) ? ev.startDate : "2026-12-28";
  const endDateStr = ev.endDate && /^\d{4}-\d{2}-\d{2}$/.test(ev.endDate) ? ev.endDate : dateStr;
  const gatesStr = /^\d{2}:\d{2}$/.test(ev.gatesOpen) ? ev.gatesOpen : "10:00";

  const startAt = new Date(`${dateStr}T${gatesStr}:00+02:00`);
  let endAt = new Date(`${endDateStr}T23:00:00+02:00`);
  if (!(endAt > startAt)) {
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

  const performances: PerformanceRecord[] = program
    .map((item, idx) => ({ item, idx }))
    .filter(({ item }) => /^\d{2}:\d{2}$/.test(item.time))
    .map(({ item, idx }) => {
      const matchedStage =
        stages.find((s) => s.name.toLowerCase() === item.place.trim().toLowerCase()) ?? stages[0];
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
    });

  const rules = ev.entryRules
    .split(/\n+/)
    .map((r) => r.trim())
    .filter((r) => r.length > 0);

  const venueParts = (ev.venue || "Venue").split(",").map((s) => s.trim());
  const venueName = venueParts[0] || ev.venue || "Venue";
  const city = venueParts[1] || venueName;

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
      name: `${ev.name} Crew`,
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
      description: `${ev.name} at ${ev.venue || "confirmed venue"}.`,
      category:
        {
          festival: "Music festival",
          concert: "Concert",
          nightlife: "Nightlife",
          conference: "Conference",
          corporate: "Corporate event",
          sports: "Sports",
          expo: "Expo & market",
          cultural: "Cultural event",
          private: "Private event",
        }[eventType] ?? "Event",
      status: "published",
      startAt,
      endAt,
      doorsOpenAt: startAt,
      venueName,
      city,
      country: "Namibia",
      timezone: "Africa/Windhoek",
      latitude: null,
      longitude: null,
      heroImageUrl: ev.sitePlanUrl || "/images/sound-of-summer-hero.jpg",
      mapImageUrl: ev.sitePlanUrl ?? "",
      ticketUrl: null,
      minTicketPrice: null,
      currency: "NAD",
      packageVersion: 1,
    },
    festival: {
      officialUrl: "",
      ticketUrl: "",
      organiser: "Verified Organiser",
      sourceCheckedAt: (ev.publishedAt ?? new Date().toISOString()).slice(0, 10),
      timetablePublished: performances.length > 0,
      mapGeoreferenced: false,
      mapNotice: ev.sitePlanUrl
        ? `Uploaded site plan for ${ev.name}.`
        : `Site plan for ${ev.name} will appear here once uploaded by the organiser.`,
      artists: artists as DemoData["festival"]["artists"],
      rules: rules.length > 0 ? rules : ["Follow organiser entry instructions at the venue gates."],
      transport: `Venue: ${ev.venue || "Check organiser details"}.`,
      timingNotice: ev.gatesOpen
        ? `Gates open at ${ev.gatesOpen} CAT.`
        : "Check event schedule for gate hours.",
      relatedEvent: {
        name: ev.name,
        date: dateStr,
        venue: venueName,
        url: "#events",
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
