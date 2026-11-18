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

export const IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"] as const;
export const IMAGE_MAX_BYTES = 10 * 1024 * 1024;
export const VERIFICATION_MAX_BYTES = 10 * 1024 * 1024;

export function validateImageFile(
  file: { type: string; size: number },
  maxBytes = IMAGE_MAX_BYTES,
): string | null {
  if (!IMAGE_TYPES.includes(file.type as (typeof IMAGE_TYPES)[number]))
    return "Choose a JPG, PNG or WebP image.";
  if (file.size <= 0) return "This image file is empty.";
  if (file.size > maxBytes)
    return `This image is larger than ${Math.round(maxBytes / (1024 * 1024))} MB.`;
  return null;
}

export function validateVerificationFile(file: {
  name: string;
  type: string;
  size: number;
}): string | null {
  const isPdf = file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf");
  const isImage = IMAGE_TYPES.includes(file.type as (typeof IMAGE_TYPES)[number]);
  if (!isPdf && !isImage) return "Choose a PDF, JPG, PNG or WebP document.";
  if (file.size <= 0) return "This file is empty.";
  if (file.size > VERIFICATION_MAX_BYTES) return "This file is larger than 10 MB.";
  return null;
}

export function parseProgram(raw: unknown): ProgramItem[] {
  if (!Array.isArray(raw)) return [];
  const items: ProgramItem[] = [];
  for (const entry of raw) {
    const parsed = programItem.safeParse(entry);
    if (parsed.success) items.push(parsed.data);
  }
  return items;
}

export function parseZones(raw: unknown): ZoneItem[] {
  if (!Array.isArray(raw)) return [];
  const items: ZoneItem[] = [];
  for (const entry of raw) {
    const parsed = zoneItem.safeParse(entry);
    if (parsed.success) items.push(parsed.data);
  }
  return items;
}

export type OrganiserEventSummary = {
  id: string;
  status: string;
  start_date: string | null;
  end_date: string | null;
};

export function groupEventsBySection<T extends OrganiserEventSummary>(
  events: T[],
  todayIso: string,
) {
  const live: T[] = [];
  const drafts: T[] = [];
  const imported: T[] = [];
  const past: T[] = [];
  for (const event of events) {
    if (event.status === "imported") imported.push(event);
    else if (event.status === "published") {
      const end = event.end_date ?? event.start_date;
      if (end && end < todayIso) past.push(event);
      else live.push(event);
    } else drafts.push(event);
  }
  return { live, drafts, imported, past };
}

export function verificationStatusCopy(status: string | null | undefined): string {
  switch (status) {
    case "verified":
      return "Verified — you can publish reviewed events.";
    case "pending":
      return "Pending review — drafts can be saved while verification is checked.";
    case "rejected":
      return "Verification not approved — upload updated proof to submit again.";
    default:
      return "Unverified — drafts stay private until an admin approves verification.";
  }
}
