// Plain data shapes for the database-free demo. They replace the Drizzle
// `$inferSelect` types used by the original Next.js app (see LOVABLE.md).
import type { BarMenuConfig } from "@/lib/attendee/bar-menu";
import type { EventTemplateConfig, EventVisibility } from "@/lib/templates/event-templates";
import type { FestivalInfo } from "./sound-of-summer";

export type EventRecord = {
  id: string;
  name: string;
  slug: string;
  description: string;
  category: string;
  status: string;
  startAt: Date;
  endAt: Date;
  doorsOpenAt: Date;
  /** False when a published/draft organiser event does not have a confirmed start date yet. */
  dateConfirmed?: boolean;
  /** False when gate opening hours have not been confirmed yet. */
  gatesConfirmed?: boolean;
  venueName: string;
  city: string;
  country: string;
  timezone: string;
  /** GPS is intentionally null until the organiser supplies georeferenced data. */
  latitude: number | null;
  longitude: number | null;
  heroImageUrl: string;
  logoUrl?: string | null;
  templateConfig?: EventTemplateConfig | null;
  visibility?: EventVisibility;
  mapImageUrl: string;
  mapZoomImageUrl?: string | null;
  mapCalibration?: {
    a: number;
    b: number;
    c: number;
    d: number;
    e: number;
    f: number;
  } | null;
  mapCalibrationVersion?: number | null;
  mapCalibrationUpdatedAt?: string | null;
  barMenus?: BarMenuConfig[] | undefined;
  ticketUrl: string | null;
  ticketSalesClose?: string | null;
  minTicketPrice: string | null;
  currency: string;
  packageVersion: number;
};

export type StageRecord = {
  id: string;
  eventId: string;
  name: string;
  description: string;
  latitude: number | null;
  longitude: number | null;
  /** Percentage position on the supplied image, never GPS. */
  mapX: number;
  mapY: number;
  colorKey: string;
  status: string;
  sortOrder: number;
};

export type MapPointRecord = {
  id: string;
  eventId: string;
  name: string;
  type: string;
  latitude: number | null;
  longitude: number | null;
  mapX: number;
  mapY: number;
  description: string;
  status: string;
  metadata: Record<string, unknown>;
};

export type PerformanceRecord = {
  id: string;
  stageId: string;
  artistId: string;
  artistName: string;
  genre: string | null;
  scheduledStart: Date;
  scheduledEnd: Date;
  status: string;
  sortOrder: number;
};

export type AnnouncementRecord = {
  id: string;
  eventId: string;
  title: string;
  body: string;
  category: string;
  priority: string;
  publishAt: Date;
};

export type CrewRecord = {
  id: string;
  eventId: string;
  name: string;
  ownerUserId: string;
  inviteCode: string;
};

export type CrewMemberRecord = {
  userId: string;
  displayName: string;
  role: string;
  mode: string | null;
  mapX: number | null;
  mapY: number | null;
  zoneName: string | null;
  active: boolean;
  updatedAt: Date | null;
};

export type DemoData = {
  festival: FestivalInfo;
  storageMode: "demo";
  event: EventRecord;
  stages: StageRecord[];
  performances: PerformanceRecord[];
  points: MapPointRecord[];
  announcements: AnnouncementRecord[];
  savedPerformanceIds: string[];
  crew: CrewRecord;
  crewMembers: CrewMemberRecord[];
  following: boolean;
};
