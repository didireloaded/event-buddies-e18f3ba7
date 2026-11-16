// Database-free demo loader. Adapted from the original `src/lib/demo-data.ts`:
// the PostgreSQL/Drizzle branch and `process.env.DATABASE_URL` switch were
// removed because this Lovable build has no database (see LOVABLE.md).
// The original "Eternal Summer" fixture now only supplies base fields that
// `soundOfSummerDemo()` overrides with verified Sound of Summer data.
import { soundOfSummerDemo } from "./sound-of-summer";
import type {
  CrewMemberRecord,
  CrewRecord,
  DemoData,
  EventRecord,
  MapPointRecord,
  StageRecord,
} from "./types";

export type BaseDemoData = Omit<DemoData, "festival"> & {
  festival?: DemoData["festival"];
};

export const DEMO_IDS = {
  user: "00000000-0000-4000-8000-000000000001",
  stacy: "00000000-0000-4000-8000-000000000002",
  andrea: "00000000-0000-4000-8000-000000000003",
  shandre: "00000000-0000-4000-8000-000000000004",
  organiser: "10000000-0000-4000-8000-000000000001",
  event: "20000000-0000-4000-8000-000000000001",
  crew: "60000000-0000-4000-8000-000000000001",
} as const;

const baseStage = (sortOrder: number, colorKey: string): StageRecord => ({
  id: `base-stage-${sortOrder}`,
  eventId: DEMO_IDS.event,
  name: "",
  description: "",
  latitude: null,
  longitude: null,
  mapX: 50,
  mapY: 50,
  colorKey,
  status: "upcoming",
  sortOrder,
});

const member = (
  userId: string,
  displayName: string,
  role: string,
  mode: string,
): CrewMemberRecord => ({
  userId,
  displayName,
  role,
  mode,
  mapX: null,
  mapY: null,
  zoneName: null,
  active: false,
  updatedAt: null,
});

function baseData(): BaseDemoData {
  const event: EventRecord = {
    id: DEMO_IDS.event,
    name: "",
    slug: "",
    description: "",
    category: "Music festival",
    status: "published",
    startAt: new Date("2026-12-28T12:00:00+02:00"),
    endAt: new Date("2026-12-28T23:00:00+02:00"),
    doorsOpenAt: new Date("2026-12-28T12:00:00+02:00"),
    venueName: "",
    city: "",
    country: "Namibia",
    timezone: "Africa/Windhoek",
    latitude: null,
    longitude: null,
    heroImageUrl: "",
    mapImageUrl: "",
    ticketUrl: null,
    minTicketPrice: null,
    currency: "N$",
    packageVersion: 18,
  };
  const point: MapPointRecord = {
    id: "base-point",
    eventId: DEMO_IDS.event,
    name: "",
    type: "zone",
    latitude: null,
    longitude: null,
    mapX: 50,
    mapY: 50,
    description: "",
    status: "unconfirmed",
    metadata: {},
  };
  const crew: CrewRecord = {
    id: DEMO_IDS.crew,
    eventId: DEMO_IDS.event,
    name: "Didi’s Crew",
    ownerUserId: DEMO_IDS.user,
    inviteCode: "",
  };
  return {
    storageMode: "demo",
    event,
    stages: [baseStage(1, "coral"), baseStage(2, "violet"), baseStage(3, "cyan")],
    performances: [],
    points: [point],
    announcements: [],
    savedPerformanceIds: [],
    crew,
    crewMembers: [
      member(DEMO_IDS.user, "Didi", "owner", "exact"),
      member(DEMO_IDS.stacy, "Stacy", "member", "exact"),
      member(DEMO_IDS.andrea, "Andrea", "member", "approximate"),
      member(DEMO_IDS.shandre, "Shandre", "member", "off"),
    ],
    following: false,
  };
}

/** Pure and deterministic: safe to call during SSR and in the browser. */
export function getDemoData(): DemoData {
  return soundOfSummerDemo(baseData());
}

export type OrganiserData = DemoData & {
  organiser: { id: string; name: string; verified: boolean };
};

export function getOrganiserData(): OrganiserData {
  const data = getDemoData();
  return {
    ...data,
    organiser: {
      id: DEMO_IDS.organiser,
      name: data.festival.organiser,
      verified: false,
    },
  };
}
