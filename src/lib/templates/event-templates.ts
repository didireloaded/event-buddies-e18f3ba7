import { z } from "zod";
import type { EventType } from "@/lib/organiser/schema";

export const LAYOUT_FAMILIES = [
  "experience",
  "social",
  "professional",
  "competition",
  "discovery",
] as const;
export type LayoutFamily = (typeof LAYOUT_FAMILIES)[number];

export const TEMPLATE_IDS = [
  "music_festival",
  "concert",
  "nightlife_party",
  "conference_summit",
  "corporate_event",
  "sports_event",
  "expo_trade_show",
  "food_lifestyle_market",
  "cultural_community",
  "private_celebration",
  "wedding",
  "custom_event",
] as const;
export type EventTemplateId = (typeof TEMPLATE_IDS)[number];

export const PALETTE_PRESETS = [
  "coastal",
  "coral",
  "amber",
  "cobalt",
  "emerald",
  "crimson",
  "plum",
  "monochrome",
] as const;
export type BrandPalettePreset = (typeof PALETTE_PRESETS)[number];

export const FONT_PRESETS = ["editorial", "poster", "swiss", "classic"] as const;
export type DisplayFontPreset = (typeof FONT_PRESETS)[number];

export const EVENT_MODULES = [
  "tickets",
  "programme",
  "map",
  "crew",
  "live_location",
  "bars_menus",
  "activities",
  "passport",
  "memories",
  "networking",
  "rsvp",
  "updates",
] as const;
export type EventModuleId = (typeof EVENT_MODULES)[number];

export const HOME_SECTION_IDS = ["featured", "crew", "essentials", "upcoming"] as const;
export type TemplateHomeSectionId = (typeof HOME_SECTION_IDS)[number];

export const EVENT_VISIBILITIES = ["public", "private_invite"] as const;
export type EventVisibility = (typeof EVENT_VISIBILITIES)[number];

export const eventTemplateConfigSchema = z.object({
  version: z.number().int().positive().default(1),
  templateId: z.enum(TEMPLATE_IDS),
  layoutFamily: z.enum(LAYOUT_FAMILIES),
  surfaceMode: z.enum(["light", "dark"]),
  palettePreset: z.enum(PALETTE_PRESETS),
  fontPreset: z.enum(FONT_PRESETS),
  visibility: z.enum(EVENT_VISIBILITIES).default("public"),
  logoUrl: z.string().nullable().default(null),
  heroImageUrl: z.string().nullable().default(null),
  tagline: z.string().trim().max(140).default(""),
  rsvpNote: z.string().trim().max(240).default(""),
  enabledModules: z.array(z.enum(EVENT_MODULES)),
  homeSectionOrder: z.array(z.enum(HOME_SECTION_IDS)),
});
export type EventTemplateConfig = z.infer<typeof eventTemplateConfigSchema>;

export type TemplateTerms = {
  isConferenceLike: boolean;
  isPrivateLike: boolean;
  programLabel: string;
  peopleLabel: string;
  personSingular: string;
  placesLabel: string;
  placeSingular: string;
  crewLabel: string;
  featuredHeading: string;
  headlinerBadge: string;
  essentialsHeading: string;
  activitiesLabel: string;
  passportLabel: string;
  passportStampNoun: string;
  modeMusicLabel: string;
  modeFriendsLabel: string;
  modeBothLabel: string;
  entryRulesLabel: string;
  askLabel: string;
  primaryCtaLabel: string;
};

export type EventTemplateDefinition = {
  id: EventTemplateId;
  name: string;
  shortLabel: string;
  categoryLabel: string;
  legacyEventType: EventType;
  layoutFamily: LayoutFamily;
  defaultSurface: "light" | "dark";
  defaultPalette: BrandPalettePreset;
  defaultFont: DisplayFontPreset;
  defaultVisibility: EventVisibility;
  description: string;
  visualNotes: string;
  defaultModules: EventModuleId[];
  defaultHomeOrder: TemplateHomeSectionId[];
  terms: TemplateTerms;
};

export type LayoutFamilyMeta = {
  id: LayoutFamily;
  name: string;
  summary: string;
  bestFor: string;
  defaultSurface: "light" | "dark";
};

export const LAYOUT_FAMILY_META: Record<LayoutFamily, LayoutFamilyMeta> = {
  experience: {
    id: "experience",
    name: "Experience",
    summary: "Atmospheric dark photography hero, monumental headliner poster and stage-led lineup.",
    bestFor: "Music festivals & concerts",
    defaultSurface: "dark",
  },
  social: {
    id: "social",
    name: "Social",
    summary: "Invitation-led hero, RSVP & guest circle, photo memories and private group moments.",
    bestFor: "Nightlife, private parties & weddings",
    defaultSurface: "light",
  },
  professional: {
    id: "professional",
    name: "Professional",
    summary: "Warm editorial paper minimalism, timed session agenda, speakers and room tracks.",
    bestFor: "Conferences, summits & corporate events",
    defaultSurface: "light",
  },
  competition: {
    id: "competition",
    name: "Competition",
    summary: "High-contrast fixture schedule, teams & match venues, gate pass and fan zones.",
    bestFor: "Sports tournaments & match days",
    defaultSurface: "light",
  },
  discovery: {
    id: "discovery",
    name: "Discovery",
    summary:
      "Bright photography showcase, exhibitor/vendor directory, interactive plan and passport.",
    bestFor: "Expos, food markets, cultural & custom events",
    defaultSurface: "light",
  },
};

export type PalettePresetMeta = {
  id: BrandPalettePreset;
  name: string;
  lightHex: string;
  darkHex: string;
  lightInk: string;
  darkInk: string;
  softLight: string;
  softDark: string;
};

export const PALETTE_PRESET_META: Record<BrandPalettePreset, PalettePresetMeta> = {
  coastal: {
    id: "coastal",
    name: "Coastal Teal",
    lightHex: "#0E7C7B",
    darkHex: "#20C4BE",
    lightInk: "#FFFFFF",
    darkInk: "#071C1B",
    softLight: "#E4F3F2",
    softDark: "rgba(32, 196, 190, 0.16)",
  },
  coral: {
    id: "coral",
    name: "Terracotta Coral",
    lightHex: "#C64522",
    darkHex: "#F27750",
    lightInk: "#FFFFFF",
    darkInk: "#1B0B05",
    softLight: "#FBEAE4",
    softDark: "rgba(242, 119, 80, 0.18)",
  },
  amber: {
    id: "amber",
    name: "Stage Amber",
    lightHex: "#9A5B09",
    darkHex: "#E8AE3E",
    lightInk: "#FFFFFF",
    darkInk: "#1D1303",
    softLight: "#FBF1DF",
    softDark: "rgba(232, 174, 62, 0.18)",
  },
  cobalt: {
    id: "cobalt",
    name: "Editorial Cobalt",
    lightHex: "#1D52AE",
    darkHex: "#6BA3FF",
    lightInk: "#FFFFFF",
    darkInk: "#06152E",
    softLight: "#E8EFFB",
    softDark: "rgba(107, 163, 255, 0.18)",
  },
  emerald: {
    id: "emerald",
    name: "Pitch Emerald",
    lightHex: "#126B4B",
    darkHex: "#3AD19B",
    lightInk: "#FFFFFF",
    darkInk: "#041C13",
    softLight: "#E4F4ED",
    softDark: "rgba(58, 209, 155, 0.17)",
  },
  crimson: {
    id: "crimson",
    name: "Arena Crimson",
    lightHex: "#B1223B",
    darkHex: "#F4647D",
    lightInk: "#FFFFFF",
    darkInk: "#210409",
    softLight: "#FBE8EC",
    softDark: "rgba(244, 100, 125, 0.18)",
  },
  plum: {
    id: "plum",
    name: "Evening Plum",
    lightHex: "#6F2E63",
    darkHex: "#D48BC6",
    lightInk: "#FFFFFF",
    darkInk: "#1D0919",
    softLight: "#F4E8F1",
    softDark: "rgba(212, 139, 198, 0.18)",
  },
  monochrome: {
    id: "monochrome",
    name: "Editorial Ink",
    lightHex: "#15171A",
    darkHex: "#F4F1EA",
    lightInk: "#FFFFFF",
    darkInk: "#111315",
    softLight: "#EAE6DD",
    softDark: "rgba(244, 241, 234, 0.14)",
  },
};

export const FONT_PRESET_META: Record<
  DisplayFontPreset,
  { id: DisplayFontPreset; name: string; sample: string; stack: string }
> = {
  editorial: {
    id: "editorial",
    name: "Editorial Sans",
    sample: "Tight contemporary headlines",
    stack:
      '"Avenir Next", "SF Pro Display", -apple-system, BlinkMacSystemFont, "Segoe UI", system-ui, sans-serif',
  },
  poster: {
    id: "poster",
    name: "Poster Display",
    sample: "Bold festival & matchday impact",
    stack:
      '"DIN Condensed", "Arial Narrow", "Avenir Next Condensed", Impact, system-ui, sans-serif',
  },
  swiss: {
    id: "swiss",
    name: "Swiss Grotesk",
    sample: "Crisp conference & corporate clarity",
    stack: '"Helvetica Neue", "SF Pro Display", -apple-system, system-ui, Arial, sans-serif',
  },
  classic: {
    id: "classic",
    name: "Editorial Serif",
    sample: "Refined wedding & cultural typography",
    stack: '"Iowan Old Style", "New York", Georgia, "Times New Roman", serif',
  },
};

export const MODULE_META: Record<
  EventModuleId,
  { id: EventModuleId; label: string; hint: string }
> = {
  tickets: { id: "tickets", label: "Tickets & passes", hint: "Offline gate card & ticket links" },
  programme: { id: "programme", label: "Programme", hint: "Lineup, agenda, fixtures or booths" },
  map: { id: "map", label: "Interactive map", hint: "Colour site plan, pins & directions" },
  crew: { id: "crew", label: "Crew & friends", hint: "Private groups, meetups & invites" },
  live_location: {
    id: "live_location",
    label: "Live location & pins",
    hint: "Expiring landmark & GPS sharing",
  },
  bars_menus: { id: "bars_menus", label: "Bars & menus", hint: "Drinks & vendor menus on map" },
  activities: { id: "activities", label: "Activities", hint: "Bingo, trivia, polls & party mode" },
  passport: { id: "passport", label: "Event Passport", hint: "Collectible venue stamps" },
  memories: { id: "memories", label: "Photo memories", hint: "Private diary & story cards" },
  networking: { id: "networking", label: "Networking", hint: "Attendee meetups & contacts" },
  rsvp: { id: "rsvp", label: "RSVP & guest info", hint: "Attendance details for invited guests" },
  updates: { id: "updates", label: "Official updates", hint: "Organiser alerts & changes" },
};

export const EVENT_TEMPLATES: Record<EventTemplateId, EventTemplateDefinition> = {
  music_festival: {
    id: "music_festival",
    name: "Music Festival",
    shortLabel: "Festival",
    categoryLabel: "Music festival",
    legacyEventType: "festival",
    layoutFamily: "experience",
    defaultSurface: "dark",
    defaultPalette: "coastal",
    defaultFont: "editorial",
    defaultVisibility: "public",
    description:
      "Dark immersive photography, multi-stage lineup, venue map, tickets and Crew Mode.",
    visualNotes: "Full-bleed dark hero, monumental headliner spotlight, 2-col artist portraits.",
    defaultModules: [
      "tickets",
      "programme",
      "map",
      "crew",
      "live_location",
      "bars_menus",
      "activities",
      "passport",
      "memories",
      "updates",
    ],
    defaultHomeOrder: ["featured", "crew", "essentials", "upcoming"],
    terms: {
      isConferenceLike: false,
      isPrivateLike: false,
      programLabel: "Lineup",
      peopleLabel: "Artists",
      personSingular: "Artist",
      placesLabel: "Stages",
      placeSingular: "Stage",
      crewLabel: "Crew",
      featuredHeading: "Headliners & featured",
      headlinerBadge: "Headliner",
      essentialsHeading: "Festival essentials",
      activitiesLabel: "Festival extras",
      passportLabel: "Festival passport",
      passportStampNoun: "stage stamps",
      modeMusicLabel: "Music",
      modeFriendsLabel: "Friends",
      modeBothLabel: "Both",
      entryRulesLabel: "Entry & Rules",
      askLabel: "Ask about the festival",
      primaryCtaLabel: "I’m going",
    },
  },
  concert: {
    id: "concert",
    name: "Concert",
    shortLabel: "Concert",
    categoryLabel: "Concert",
    legacyEventType: "concert",
    layoutFamily: "experience",
    defaultSurface: "dark",
    defaultPalette: "crimson",
    defaultFont: "poster",
    defaultVisibility: "public",
    description:
      "Artist-led, poster-inspired layout focused on main artist, support acts and entry.",
    visualNotes:
      "Monumental poster typography, streamlined single-venue programme, fast gate pass.",
    defaultModules: ["tickets", "programme", "map", "crew", "memories", "updates"],
    defaultHomeOrder: ["featured", "essentials", "crew", "upcoming"],
    terms: {
      isConferenceLike: false,
      isPrivateLike: false,
      programLabel: "Lineup",
      peopleLabel: "Performers",
      personSingular: "Performer",
      placesLabel: "Stages",
      placeSingular: "Stage",
      crewLabel: "Crew",
      featuredHeading: "Main artist & support",
      headlinerBadge: "Headliner",
      essentialsHeading: "Concert essentials",
      activitiesLabel: "Fan activities",
      passportLabel: "Event passport",
      passportStampNoun: "venue stamps",
      modeMusicLabel: "Performance",
      modeFriendsLabel: "Friends",
      modeBothLabel: "Both",
      entryRulesLabel: "Entry & Rules",
      askLabel: "Ask about this concert",
      primaryCtaLabel: "I’m going",
    },
  },
  nightlife_party: {
    id: "nightlife_party",
    name: "Nightlife & Party",
    shortLabel: "Nightlife",
    categoryLabel: "Nightlife",
    legacyEventType: "nightlife",
    layoutFamily: "social",
    defaultSurface: "dark",
    defaultPalette: "coral",
    defaultFont: "editorial",
    defaultVisibility: "public",
    description:
      "Expressive, nocturnal, social layout for DJ lineups, crews, drinks and photo memories.",
    visualNotes: "Velvet nocturnal surface, playful coral accents, friend-first social header.",
    defaultModules: [
      "tickets",
      "programme",
      "map",
      "crew",
      "live_location",
      "bars_menus",
      "activities",
      "memories",
      "updates",
    ],
    defaultHomeOrder: ["crew", "featured", "essentials", "upcoming"],
    terms: {
      isConferenceLike: false,
      isPrivateLike: false,
      programLabel: "Lineup",
      peopleLabel: "DJs",
      personSingular: "DJ",
      placesLabel: "Rooms",
      placeSingular: "Room",
      crewLabel: "Crew",
      featuredHeading: "On the decks",
      headlinerBadge: "Featured DJ",
      essentialsHeading: "Night essentials",
      activitiesLabel: "Party extras",
      passportLabel: "Night passport",
      passportStampNoun: "room stamps",
      modeMusicLabel: "Music",
      modeFriendsLabel: "Friends",
      modeBothLabel: "Both",
      entryRulesLabel: "Entry & Door",
      askLabel: "Ask about this night",
      primaryCtaLabel: "I’m going",
    },
  },
  conference_summit: {
    id: "conference_summit",
    name: "Conference & Summit",
    shortLabel: "Conference",
    categoryLabel: "Conference",
    legacyEventType: "conference",
    layoutFamily: "professional",
    defaultSurface: "light",
    defaultPalette: "cobalt",
    defaultFont: "swiss",
    defaultVisibility: "public",
    description:
      "Editorial paper minimalism with structured timed agendas, speakers, rooms and networking.",
    visualNotes: "Warm paper canvas, hairline agenda rows, zero festival copy, clean room badges.",
    defaultModules: ["tickets", "programme", "map", "networking", "passport", "updates"],
    defaultHomeOrder: ["featured", "essentials", "crew", "upcoming"],
    terms: {
      isConferenceLike: true,
      isPrivateLike: false,
      programLabel: "Agenda",
      peopleLabel: "Speakers",
      personSingular: "Speaker",
      placesLabel: "Rooms",
      placeSingular: "Room",
      crewLabel: "Network",
      featuredHeading: "Featured speakers",
      headlinerBadge: "Keynote",
      essentialsHeading: "Event essentials",
      activitiesLabel: "Event activities",
      passportLabel: "Exhibitor passport",
      passportStampNoun: "exhibitor stamps",
      modeMusicLabel: "Sessions",
      modeFriendsLabel: "Networking",
      modeBothLabel: "Both",
      entryRulesLabel: "Registration & Access",
      askLabel: "Ask about this event",
      primaryCtaLabel: "Register / Attend",
    },
  },
  corporate_event: {
    id: "corporate_event",
    name: "Corporate Event",
    shortLabel: "Corporate",
    categoryLabel: "Corporate event",
    legacyEventType: "corporate",
    layoutFamily: "professional",
    defaultSurface: "light",
    defaultPalette: "monochrome",
    defaultFont: "swiss",
    defaultVisibility: "public",
    description:
      "Polished, brand-aware minimal workspace for presentations, registration and venue details.",
    visualNotes: "Architectural editorial grid, muted ink typography, zero consumer clutter.",
    defaultModules: ["tickets", "programme", "map", "networking", "updates"],
    defaultHomeOrder: ["featured", "essentials", "crew", "upcoming"],
    terms: {
      isConferenceLike: true,
      isPrivateLike: false,
      programLabel: "Program",
      peopleLabel: "Presenters",
      personSingular: "Presenter",
      placesLabel: "Rooms",
      placeSingular: "Room",
      crewLabel: "Colleagues",
      featuredHeading: "Featured presenters",
      headlinerBadge: "Keynote",
      essentialsHeading: "Event essentials",
      activitiesLabel: "Event activities",
      passportLabel: "Event passport",
      passportStampNoun: "session stamps",
      modeMusicLabel: "Sessions",
      modeFriendsLabel: "Networking",
      modeBothLabel: "Both",
      entryRulesLabel: "Registration & Access",
      askLabel: "Ask about this event",
      primaryCtaLabel: "Confirm attendance",
    },
  },
  sports_event: {
    id: "sports_event",
    name: "Sports Event",
    shortLabel: "Sports",
    categoryLabel: "Sports",
    legacyEventType: "sports",
    layoutFamily: "competition",
    defaultSurface: "light",
    defaultPalette: "emerald",
    defaultFont: "poster",
    defaultVisibility: "public",
    description:
      "Bold team-led layout featuring fixtures, match info, venue map, tickets and fan zones.",
    visualNotes:
      "High-contrast fixture strips, bold display scoreboard hierarchy, stadium colour accent.",
    defaultModules: [
      "tickets",
      "programme",
      "map",
      "crew",
      "live_location",
      "activities",
      "updates",
    ],
    defaultHomeOrder: ["featured", "crew", "essentials", "upcoming"],
    terms: {
      isConferenceLike: false,
      isPrivateLike: false,
      programLabel: "Fixtures",
      peopleLabel: "Teams",
      personSingular: "Team",
      placesLabel: "Venues",
      placeSingular: "Pitch",
      crewLabel: "Crew",
      featuredHeading: "Featured matchups",
      headlinerBadge: "Main fixture",
      essentialsHeading: "Matchday essentials",
      activitiesLabel: "Fan activities",
      passportLabel: "Matchday passport",
      passportStampNoun: "fan stamps",
      modeMusicLabel: "Matches",
      modeFriendsLabel: "Friends",
      modeBothLabel: "Both",
      entryRulesLabel: "Entry & Rules",
      askLabel: "Ask about matchday",
      primaryCtaLabel: "I’m going",
    },
  },
  expo_trade_show: {
    id: "expo_trade_show",
    name: "Expo & Trade Show",
    shortLabel: "Expo",
    categoryLabel: "Expo & trade show",
    legacyEventType: "expo",
    layoutFamily: "discovery",
    defaultSurface: "light",
    defaultPalette: "cobalt",
    defaultFont: "swiss",
    defaultVisibility: "public",
    description:
      "Clean, modular directory for exhibitors, booths, sessions, floor map and passport stamps.",
    visualNotes:
      "Structured exhibitor showcase, booth tags, floor map prominence, stamp collection.",
    defaultModules: ["tickets", "programme", "map", "networking", "passport", "updates"],
    defaultHomeOrder: ["featured", "essentials", "crew", "upcoming"],
    terms: {
      isConferenceLike: true,
      isPrivateLike: false,
      programLabel: "Schedule",
      peopleLabel: "Exhibitors",
      personSingular: "Exhibitor",
      placesLabel: "Booths",
      placeSingular: "Booth",
      crewLabel: "Network",
      featuredHeading: "Featured exhibitors",
      headlinerBadge: "Featured booth",
      essentialsHeading: "Visitor essentials",
      activitiesLabel: "Expo activities",
      passportLabel: "Exhibitor passport",
      passportStampNoun: "booth stamps",
      modeMusicLabel: "Exhibitors",
      modeFriendsLabel: "Networking",
      modeBothLabel: "Both",
      entryRulesLabel: "Registration & Access",
      askLabel: "Ask about this expo",
      primaryCtaLabel: "Attend expo",
    },
  },
  food_lifestyle_market: {
    id: "food_lifestyle_market",
    name: "Food & Lifestyle Market",
    shortLabel: "Market",
    categoryLabel: "Food & market",
    legacyEventType: "expo",
    layoutFamily: "discovery",
    defaultSurface: "light",
    defaultPalette: "coral",
    defaultFont: "editorial",
    defaultVisibility: "public",
    description:
      "Bright, inviting layout for vendor discovery, menus, market maps and saved favourites.",
    visualNotes: "Sunlit editorial paper, visual vendor directory, menus & market map exploration.",
    defaultModules: ["programme", "map", "bars_menus", "crew", "passport", "memories", "updates"],
    defaultHomeOrder: ["featured", "essentials", "crew", "upcoming"],
    terms: {
      isConferenceLike: false,
      isPrivateLike: false,
      programLabel: "Vendors",
      peopleLabel: "Vendors",
      personSingular: "Vendor",
      placesLabel: "Areas",
      placeSingular: "Stall",
      crewLabel: "Crew",
      featuredHeading: "Featured stalls & makers",
      headlinerBadge: "Featured stall",
      essentialsHeading: "Market essentials",
      activitiesLabel: "Market activities",
      passportLabel: "Tasting passport",
      passportStampNoun: "stall stamps",
      modeMusicLabel: "Vendors",
      modeFriendsLabel: "Friends",
      modeBothLabel: "Both",
      entryRulesLabel: "Entry & Hours",
      askLabel: "Ask about this market",
      primaryCtaLabel: "I’m going",
    },
  },
  cultural_community: {
    id: "cultural_community",
    name: "Cultural & Community",
    shortLabel: "Cultural",
    categoryLabel: "Cultural event",
    legacyEventType: "cultural",
    layoutFamily: "discovery",
    defaultSurface: "light",
    defaultPalette: "amber",
    defaultFont: "classic",
    defaultVisibility: "public",
    description:
      "Organiser-led cultural programming with performances, community booths and venue guides.",
    visualNotes: "Warm editorial serif titles, generous photography framing, experience stamps.",
    defaultModules: ["programme", "map", "crew", "passport", "memories", "updates"],
    defaultHomeOrder: ["featured", "essentials", "crew", "upcoming"],
    terms: {
      isConferenceLike: false,
      isPrivateLike: false,
      programLabel: "Programme",
      peopleLabel: "Performers",
      personSingular: "Performer",
      placesLabel: "Areas",
      placeSingular: "Area",
      crewLabel: "Group",
      featuredHeading: "Programme highlights",
      headlinerBadge: "Featured",
      essentialsHeading: "Visitor essentials",
      activitiesLabel: "Community activities",
      passportLabel: "Experience passport",
      passportStampNoun: "experience stamps",
      modeMusicLabel: "Programme",
      modeFriendsLabel: "Friends",
      modeBothLabel: "Both",
      entryRulesLabel: "Entry & Info",
      askLabel: "Ask about this event",
      primaryCtaLabel: "I’m going",
    },
  },
  private_celebration: {
    id: "private_celebration",
    name: "Private Celebration",
    shortLabel: "Private Party",
    categoryLabel: "Private party",
    legacyEventType: "private",
    layoutFamily: "social",
    defaultSurface: "light",
    defaultPalette: "coral",
    defaultFont: "editorial",
    defaultVisibility: "private_invite",
    description:
      "Warm, invitation-first party experience with RSVP, guest circle, schedule and shared photos.",
    visualNotes:
      "Private by default (excluded from public Discover), tactile invite header & guest list.",
    defaultModules: ["rsvp", "programme", "crew", "activities", "memories", "updates"],
    defaultHomeOrder: ["crew", "featured", "essentials"],
    terms: {
      isConferenceLike: false,
      isPrivateLike: true,
      programLabel: "Schedule",
      peopleLabel: "Hosts & Guests",
      personSingular: "Host",
      placesLabel: "Spaces",
      placeSingular: "Space",
      crewLabel: "Guests",
      featuredHeading: "Tonight’s moments",
      headlinerBadge: "Host",
      essentialsHeading: "Guest info",
      activitiesLabel: "Party activities",
      passportLabel: "Party moments",
      passportStampNoun: "party stamps",
      modeMusicLabel: "Schedule",
      modeFriendsLabel: "Friends",
      modeBothLabel: "Both",
      entryRulesLabel: "Guest Details",
      askLabel: "Ask about this party",
      primaryCtaLabel: "RSVP · I’m in",
    },
  },
  wedding: {
    id: "wedding",
    name: "Wedding",
    shortLabel: "Wedding",
    categoryLabel: "Wedding",
    legacyEventType: "private",
    layoutFamily: "social",
    defaultSurface: "light",
    defaultPalette: "emerald",
    defaultFont: "classic",
    defaultVisibility: "private_invite",
    description:
      "Elegant editorial invitation with ceremony & reception details, RSVP, directions and memories.",
    visualNotes:
      "Editorial serif display, champagne-ivory paper, private invite-only visibility by default.",
    defaultModules: ["rsvp", "programme", "map", "crew", "memories", "updates"],
    defaultHomeOrder: ["featured", "essentials", "crew"],
    terms: {
      isConferenceLike: false,
      isPrivateLike: true,
      programLabel: "Order of Day",
      peopleLabel: "Hosts",
      personSingular: "Host",
      placesLabel: "Venues",
      placeSingular: "Venue",
      crewLabel: "Guests",
      featuredHeading: "Ceremony & Reception",
      headlinerBadge: "Key moment",
      essentialsHeading: "Guest information",
      activitiesLabel: "Guestbook & extras",
      passportLabel: "Wedding moments",
      passportStampNoun: "moment stamps",
      modeMusicLabel: "Order of Day",
      modeFriendsLabel: "Guests",
      modeBothLabel: "Both",
      entryRulesLabel: "Ceremony & Dress",
      askLabel: "Ask about the wedding",
      primaryCtaLabel: "RSVP",
    },
  },
  custom_event: {
    id: "custom_event",
    name: "Custom Event",
    shortLabel: "Custom",
    categoryLabel: "Event",
    legacyEventType: "cultural",
    layoutFamily: "discovery",
    defaultSurface: "light",
    defaultPalette: "coastal",
    defaultFont: "editorial",
    defaultVisibility: "public",
    description:
      "Flexible starting point with controlled layouts, brand palette and selectable attendee modules.",
    visualNotes:
      "Adapts to whichever of the 5 layout families and palette presets the organiser chooses.",
    defaultModules: ["tickets", "programme", "map", "crew", "memories", "updates"],
    defaultHomeOrder: ["featured", "crew", "essentials", "upcoming"],
    terms: {
      isConferenceLike: false,
      isPrivateLike: false,
      programLabel: "Programme",
      peopleLabel: "Participants",
      personSingular: "Participant",
      placesLabel: "Locations",
      placeSingular: "Location",
      crewLabel: "Crew",
      featuredHeading: "Highlights",
      headlinerBadge: "Featured",
      essentialsHeading: "Event essentials",
      activitiesLabel: "Event activities",
      passportLabel: "Event passport",
      passportStampNoun: "checkpoint stamps",
      modeMusicLabel: "Programme",
      modeFriendsLabel: "Friends",
      modeBothLabel: "Both",
      entryRulesLabel: "Entry & Rules",
      askLabel: "Ask about this event",
      primaryCtaLabel: "I’m going",
    },
  },
};

export const EVENT_TEMPLATE_LIST: EventTemplateDefinition[] = TEMPLATE_IDS.map(
  (id) => EVENT_TEMPLATES[id],
);

export function defaultTemplateIdForEventType(
  eventTypeOrCategory?: string | null,
): EventTemplateId {
  const lower = (eventTypeOrCategory ?? "").trim().toLowerCase();
  if (!lower) return "music_festival";
  if ((TEMPLATE_IDS as readonly string[]).includes(lower)) return lower as EventTemplateId;
  if (lower.includes("wedding")) return "wedding";
  if (lower.includes("private") || lower.includes("celebration") || lower.includes("birthday")) {
    return "private_celebration";
  }
  if (lower.includes("nightlife") || lower.includes("club") || lower.includes("party")) {
    return "nightlife_party";
  }
  if (lower.includes("conference") || lower.includes("summit") || lower.includes("forum")) {
    return "conference_summit";
  }
  if (lower.includes("corporate") || lower.includes("offsite") || lower.includes("company")) {
    return "corporate_event";
  }
  if (lower.includes("sport") || lower.includes("match") || lower.includes("tournament")) {
    return "sports_event";
  }
  if (lower.includes("market") || lower.includes("food") || lower.includes("lifestyle")) {
    return "food_lifestyle_market";
  }
  if (lower.includes("expo") || lower.includes("trade")) return "expo_trade_show";
  if (lower.includes("concert") || lower.includes("live show") || lower.includes("gig")) {
    return "concert";
  }
  if (lower.includes("cultural") || lower.includes("community") || lower.includes("art")) {
    return "cultural_community";
  }
  if (lower.includes("custom")) return "custom_event";
  return "music_festival";
}

export function buildDefaultTemplateConfig(
  templateIdOrCategory?: string | null,
  overrides: Partial<EventTemplateConfig> = {},
): EventTemplateConfig {
  const templateId = defaultTemplateIdForEventType(templateIdOrCategory);
  const def = EVENT_TEMPLATES[templateId];
  return {
    version: 1,
    templateId: def.id,
    layoutFamily: def.layoutFamily,
    surfaceMode: def.defaultSurface,
    palettePreset: def.defaultPalette,
    fontPreset: def.defaultFont,
    visibility: def.defaultVisibility,
    logoUrl: null,
    heroImageUrl: null,
    tagline: "",
    rsvpNote: "",
    enabledModules: [...def.defaultModules],
    homeSectionOrder: [...def.defaultHomeOrder],
    ...overrides,
  };
}

/**
 * Lossless template switching: updates the visual family, mood, default modules and
 * section order for the newly selected template while preserving approved organiser
 * media (logo/hero), tagline, RSVP note, visibility and version counter.
 * All underlying event records (programme, zones, tickets, crews, calibration) live
 * outside templateConfig and are never deleted or reset.
 */
export function switchTemplatePreservingData(
  current: EventTemplateConfig,
  nextTemplateId: EventTemplateId,
): EventTemplateConfig {
  const nextDef = EVENT_TEMPLATES[nextTemplateId];
  return {
    ...current,
    version: current.version + 1,
    templateId: nextDef.id,
    layoutFamily: nextDef.layoutFamily,
    surfaceMode: nextDef.defaultSurface,
    palettePreset: nextDef.defaultPalette,
    fontPreset: nextDef.defaultFont,
    enabledModules: [...nextDef.defaultModules],
    homeSectionOrder: [...nextDef.defaultHomeOrder],
    // Preserve organiser's explicit visibility unless switching into a private-by-default template from default
    visibility:
      nextDef.defaultVisibility === "private_invite" ? "private_invite" : current.visibility,
  };
}

export function resolveEventTemplate(input: {
  category?: string | null | undefined;
  templateConfig?: EventTemplateConfig | null | undefined;
}): {
  config: EventTemplateConfig;
  definition: EventTemplateDefinition;
  palette: PalettePresetMeta;
  font: (typeof FONT_PRESET_META)[DisplayFontPreset];
} {
  const config = input.templateConfig
    ? {
        ...buildDefaultTemplateConfig(input.templateConfig.templateId),
        ...input.templateConfig,
      }
    : buildDefaultTemplateConfig(input.category);
  const definition = EVENT_TEMPLATES[config.templateId];
  const palette = PALETTE_PRESET_META[config.palettePreset] ?? PALETTE_PRESET_META.coastal;
  const font = FONT_PRESET_META[config.fontPreset] ?? FONT_PRESET_META.editorial;
  return { config, definition, palette, font };
}

export function isModuleEnabled(
  config: EventTemplateConfig | null | undefined,
  moduleId: EventModuleId,
): boolean {
  if (!config) return true;
  return config.enabledModules.includes(moduleId);
}

/** CSS custom properties applied onto the event shell for controlled organiser branding. */
export function buildTemplateCssVars(config: EventTemplateConfig): Record<string, string> {
  const palette = PALETTE_PRESET_META[config.palettePreset] ?? PALETTE_PRESET_META.coastal;
  const font = FONT_PRESET_META[config.fontPreset] ?? FONT_PRESET_META.editorial;
  const isDark = config.surfaceMode === "dark";
  return {
    "--primary": isDark ? palette.darkHex : palette.lightHex,
    "--primary-foreground": isDark ? palette.darkInk : palette.lightInk,
    "--favorite": isDark ? palette.darkHex : palette.lightHex,
    "--favorite-soft": isDark ? palette.softDark : palette.softLight,
    "--ring": isDark ? palette.darkHex : palette.lightHex,
    "--eb-display-font": font.stack,
  };
}

const TEMPLATE_CONFIG_KEY = (eventId: string) => `event-buddies:${eventId}:template-config:v1`;

export function readStoredTemplateConfig(eventId: string): EventTemplateConfig | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(TEMPLATE_CONFIG_KEY(eventId));
    if (!raw) return null;
    const parsed = eventTemplateConfigSchema.safeParse(JSON.parse(raw));
    return parsed.success ? parsed.data : null;
  } catch {
    return null;
  }
}

export function saveStoredTemplateConfig(
  eventId: string,
  config: EventTemplateConfig | null,
): void {
  if (typeof window === "undefined") return;
  try {
    if (!config) localStorage.removeItem(TEMPLATE_CONFIG_KEY(eventId));
    else localStorage.setItem(TEMPLATE_CONFIG_KEY(eventId), JSON.stringify(config));
  } catch {
    /* Ignore storage failures. */
  }
}
