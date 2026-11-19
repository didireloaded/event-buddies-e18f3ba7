import type { DemoData, PerformanceRecord } from "@/lib/event/types";
import type { FestivalArtist } from "@/lib/event/sound-of-summer";
import { scheduleClashes } from "@/lib/attendee/schedule";
import type { ProgramItem, ZoneItem } from "@/lib/organiser/schema";

export type EventCategoryTerms = {
  isConferenceLike: boolean;
  programLabel: string;
  peopleLabel: string;
  personSingular: string;
  placesLabel: string;
  placeSingular: string;
  modeMusicLabel: string;
  modeFriendsLabel: string;
  modeBothLabel: string;
  entryRulesLabel: string;
};

export function getEventCategoryTerms(category: string | null | undefined): EventCategoryTerms {
  const lower = (category ?? "").toLowerCase();
  const isConference =
    lower.includes("conference") || lower.includes("summit") || lower.includes("expo");
  const isCorporate = lower.includes("corporate");
  const isSports = lower.includes("sport");

  if (isConference) {
    return {
      isConferenceLike: true,
      programLabel: "Agenda",
      peopleLabel: "Speakers",
      personSingular: "Speaker",
      placesLabel: "Rooms",
      placeSingular: "Room",
      modeMusicLabel: "Sessions",
      modeFriendsLabel: "Networking",
      modeBothLabel: "Both",
      entryRulesLabel: "Registration & Access",
    };
  }
  if (isCorporate) {
    return {
      isConferenceLike: true,
      programLabel: "Program",
      peopleLabel: "Presenters",
      personSingular: "Presenter",
      placesLabel: "Rooms",
      placeSingular: "Room",
      modeMusicLabel: "Sessions",
      modeFriendsLabel: "Networking",
      modeBothLabel: "Both",
      entryRulesLabel: "Registration & Access",
    };
  }
  if (isSports) {
    return {
      isConferenceLike: false,
      programLabel: "Fixtures",
      peopleLabel: "Teams",
      personSingular: "Team",
      placesLabel: "Venues",
      placeSingular: "Pitch",
      modeMusicLabel: "Matches",
      modeFriendsLabel: "Friends",
      modeBothLabel: "Both",
      entryRulesLabel: "Entry & Rules",
    };
  }
  return {
    isConferenceLike: false,
    programLabel: "Lineup",
    peopleLabel: "Artists",
    personSingular: "Artist",
    placesLabel: "Stages",
    placeSingular: "Stage",
    modeMusicLabel: "Music",
    modeFriendsLabel: "Friends",
    modeBothLabel: "Both",
    entryRulesLabel: "Entry & Rules",
  };
}

export type FeaturedParticipant = FestivalArtist & {
  stageName: string | null;
  isHeadliner: boolean;
};

/**
 * Resolves organiser-configured featured performers/speakers for an event.
 * Organiser selections (`headliner` / `featured` flags or explicit Headliner/Keynote billing)
 * are strictly authoritative: unfeatured acts are never auto-promoted per stage.
 */
export function selectFeaturedParticipants(data: DemoData): FeaturedParticipant[] {
  const artists = data.festival.artists as (FestivalArtist & {
    featured?: boolean;
    headliner?: boolean;
    featuredOrder?: number;
  })[];
  if (!artists.length) return [];

  const stageName = (stageId: string | null) =>
    stageId ? (data.stages.find((s) => s.id === stageId)?.name ?? null) : null;

  // Organiser-flagged featured/headliner entries are strictly authoritative.
  const explicit = artists
    .filter(
      (a) =>
        a.headliner ||
        a.featured ||
        a.role.toLowerCase().includes("headliner") ||
        a.role.toLowerCase().includes("keynote"),
    )
    .sort((a, b) => {
      if (Boolean(a.headliner) !== Boolean(b.headliner)) return a.headliner ? -1 : 1;
      return (a.featuredOrder ?? 999) - (b.featuredOrder ?? 999);
    });

  const chosen: FeaturedParticipant[] = [];
  const usedIds = new Set<string>();

  for (const a of explicit) {
    if (usedIds.has(a.id)) continue;
    usedIds.add(a.id);
    chosen.push({
      ...a,
      stageName: stageName(a.stageId),
      isHeadliner: Boolean(
        a.headliner ||
        a.role.toLowerCase().includes("headliner") ||
        a.role.toLowerCase().includes("keynote"),
      ),
    });
  }

  // Fallback only for explicit Keynote / Headliner / Featured title keywords (never auto-promote ordinary acts).
  if (chosen.length === 0) {
    for (const a of artists) {
      if (/keynote|headliner|featured/i.test(`${a.name} ${a.role}`)) {
        chosen.push({
          ...a,
          stageName: stageName(a.stageId),
          isHeadliner: /keynote|headliner/i.test(`${a.name} ${a.role}`),
        });
      }
      if (chosen.length >= 4) break;
    }
  }

  return chosen.slice(0, 4);
}

export type HomeSectionId = "featured" | "crew" | "essentials" | "upcoming";

/**
 * Deterministic personalisation order driven by onboarding preference (`festivalMode`).
 * Influences priority without hiding any essential section.
 */
export function getPersonalisedHomeOrder(
  mode: "music" | "friends" | "both" | null,
): HomeSectionId[] {
  if (mode === "friends") {
    return ["crew", "featured", "essentials", "upcoming"];
  }
  if (mode === "music") {
    return ["featured", "essentials", "crew", "upcoming"];
  }
  return ["featured", "crew", "essentials", "upcoming"];
}

export type OrganiserIssue = {
  id: string;
  severity: "warning" | "info";
  title: string;
  detail: string;
};

/**
 * Deterministic organiser readiness & programme anomaly detector.
 * Runs locally with zero AI calls and never mutates official programme data automatically.
 */
export function analyzeOrganiserEvent(input: {
  name: string;
  venue: string;
  startDate: string;
  entryRules: string;
  program: ProgramItem[];
  zones: ZoneItem[];
  sitePlanPath: string | null;
  eventType: string;
}): OrganiserIssue[] {
  const issues: OrganiserIssue[] = [];

  if (!input.venue.trim()) {
    issues.push({
      id: "missing-venue",
      severity: "warning",
      title: "Venue address missing",
      detail: "Add the venue name and city so attendees can find directions.",
    });
  }
  if (!input.entryRules.trim()) {
    issues.push({
      id: "missing-rules",
      severity: "info",
      title: "Entry rules not set",
      detail: "Add age, ID or badge instructions before publishing.",
    });
  }

  // Detect duplicate programme titles
  const seenTitles = new Map<string, number>();
  const timePlaceSlots = new Map<string, string[]>();
  let unplacedCount = 0;
  let untimedCount = 0;
  let featuredCount = 0;

  for (const item of input.program) {
    const key = item.title.trim().toLowerCase();
    if (key) {
      seenTitles.set(key, (seenTitles.get(key) ?? 0) + 1);
    }
    if (!item.place.trim()) unplacedCount += 1;
    if (!item.time.trim()) untimedCount += 1;
    if (item.featured || item.headliner) featuredCount += 1;
    if (item.place.trim() && item.time.trim()) {
      const slot = `${item.place.trim().toLowerCase()}@${item.time.trim()}`;
      const list = timePlaceSlots.get(slot) ?? [];
      list.push(item.title);
      timePlaceSlots.set(slot, list);
    }
  }

  for (const [title, count] of seenTitles.entries()) {
    if (count > 1) {
      issues.push({
        id: `dup-${title}`,
        severity: "warning",
        title: `Duplicate entry: ${title}`,
        detail: `Appears ${count} times in the programme. Confirm whether intentional.`,
      });
    }
  }

  for (const [slot, titles] of timePlaceSlots.entries()) {
    if (titles.length > 1) {
      issues.push({
        id: `overlap-${slot}`,
        severity: "warning",
        title: "Overlapping schedule slot",
        detail: `${titles.join(" & ")} share the same time and location (${slot}).`,
      });
    }
  }

  if (input.program.length > 0 && unplacedCount > 0) {
    issues.push({
      id: "unplaced-items",
      severity: "info",
      title: `${unplacedCount} item${unplacedCount === 1 ? "" : "s"} missing a stage or room`,
      detail: "Assign a stage or room so attendees can jump from the programme to the map.",
    });
  }

  if (input.program.length > 0 && untimedCount === input.program.length) {
    issues.push({
      id: "all-untimed",
      severity: "info",
      title: "Set times pending",
      detail: "Attendees will see an honest notice that set times are awaiting publication.",
    });
  }

  if (input.program.length >= 3 && featuredCount === 0) {
    issues.push({
      id: "no-headliner",
      severity: "info",
      title: "No featured headliner selected",
      detail: "Mark one or more headliners/keynotes to highlight on the event home screen.",
    });
  }

  if (input.sitePlanPath && input.zones.length === 0) {
    issues.push({
      id: "no-zones",
      severity: "info",
      title: "No map points placed yet",
      detail: "Drop pins for stages, bars, toilets and medics so the venue map is interactive.",
    });
  }

  return issues;
}

export function summarizeAttendeeScheduleClashes(
  performances: PerformanceRecord[],
  savedIds: string[],
) {
  const mine = performances
    .filter((p) => savedIds.includes(p.id))
    .sort((a, b) => +new Date(a.scheduledStart) - +new Date(b.scheduledStart));
  return scheduleClashes(mine);
}
