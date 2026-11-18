import { z } from "zod";

export const EVENT_TYPES = ["festival", "conference", "corporate"] as const;
export type EventType = (typeof EVENT_TYPES)[number];

export const TYPE_TERMS: Record<EventType, { program: string; people: string; places: string }> = {
  festival: { program: "Lineup", people: "Artists", places: "Stages" },
  conference: { program: "Agenda", people: "Speakers", places: "Rooms" },
  corporate: { program: "Program", people: "Presenters", places: "Rooms" },
};

export const ZONE_TYPES = [
  "stage",
  "bar",
  "toilets",
  "water",
  "food",
  "medical",
  "gate",
  "vip",
  "sponsor",
  "other",
] as const;

export const programItem = z.object({
  title: z.string().trim().min(1).max(120),
  place: z.string().trim().max(120).default(""),
  time: z.string().trim().max(20).default(""),
  status: z.enum(["scheduled", "delayed", "cancelled", "moved"]).default("scheduled"),
});
export type ProgramItem = z.infer<typeof programItem>;

export const zoneItem = z.object({
  name: z.string().trim().min(1).max(80),
  type: z.enum(ZONE_TYPES),
  /** Position on the uploaded site plan, as 0–100 percentages. */
  x: z.number().min(0).max(100).nullable().default(null),
  y: z.number().min(0).max(100).nullable().default(null),
});
export type ZoneItem = z.infer<typeof zoneItem>;

export const PDF_MAX_BYTES = 50 * 1024 * 1024;

export function validatePdf(file: { name: string; type: string; size: number }): string | null {
  const isPdf = file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf");
  if (!isPdf) return "Only PDF files can be used.";
  if (file.size === 0) return "This file is empty.";
  if (file.size > PDF_MAX_BYTES) return "This PDF is larger than 50 MB.";
  return null;
}

/** Fields the extractor may fill. null means "Not found" — never guessed. */
export const extractionSchema = z.object({
  event_type: z.enum(EVENT_TYPES).nullable(),
  name: z.string().max(160).nullable(),
  start_date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .nullable(),
  end_date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .nullable(),
  venue: z.string().max(200).nullable(),
  gates_open: z
    .string()
    .regex(/^\d{2}:\d{2}$/)
    .nullable(),
  entry_rules: z.string().max(2000).nullable(),
  program: z
    .array(
      z.object({
        title: z.string().min(1).max(120),
        place: z.string().max(120).nullable(),
        time: z
          .string()
          .regex(/^\d{2}:\d{2}$/)
          .nullable(),
      }),
    )
    .max(200),
});
export type Extraction = z.infer<typeof extractionSchema>;

export const extractionJsonSchema = {
  type: "object",
  additionalProperties: false,
  required: [
    "event_type",
    "name",
    "start_date",
    "end_date",
    "venue",
    "gates_open",
    "entry_rules",
    "program",
  ],
  properties: {
    event_type: { type: ["string", "null"], enum: [...EVENT_TYPES, null] },
    name: { type: ["string", "null"] },
    start_date: { type: ["string", "null"], description: "YYYY-MM-DD" },
    end_date: { type: ["string", "null"], description: "YYYY-MM-DD" },
    venue: { type: ["string", "null"] },
    gates_open: { type: ["string", "null"], description: "HH:MM 24h" },
    entry_rules: { type: ["string", "null"] },
    program: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["title", "place", "time"],
        properties: {
          title: { type: "string" },
          place: { type: ["string", "null"] },
          time: { type: ["string", "null"], description: "HH:MM 24h, only if printed" },
        },
      },
    },
  },
} as const;

export const EXTRACTION_FIELDS = [
  ["name", "Event name"],
  ["start_date", "Date"],
  ["venue", "Venue"],
  ["gates_open", "Gates open"],
  ["entry_rules", "Entry rules"],
  ["program", "Program"],
] as const;

export function missingFields(x: Extraction): string[] {
  return EXTRACTION_FIELDS.filter(([key]) => {
    const v = x[key];
    return v == null || (Array.isArray(v) && v.length === 0) || v === "";
  }).map(([, label]) => label);
}

export type ReadinessInput = {
  name: string;
  start_date: string | null;
  site_plan_path: string | null;
  verification: "unverified" | "pending" | "verified" | "rejected" | null;
};

/** Mirrors the database publish guard so the UI explains what is missing. */
export function publishBlockers(e: ReadinessInput): string[] {
  const out: string[] = [];
  if (!e.name.trim()) out.push("Add the event name");
  if (!e.start_date) out.push("Add the event date");
  if (!e.site_plan_path) out.push("Upload a site plan");
  if (e.verification !== "verified") out.push("Organiser verification must be approved");
  return out;
}

export const BROADCAST_LIMIT = 240;
