import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  groupEventsBySection,
  missingFields,
  parseProgram,
  parseZones,
  PDF_MAX_BYTES,
  publishBlockers,
  validateImageFile,
  validatePdf,
  validateVerificationFile,
} from "@/lib/organiser/schema";
import { EventsTab } from "@/components/organiser/EventsTab";
import { CreateTab } from "@/components/organiser/CreateTab";
import { LiveTab } from "@/components/organiser/LiveTab";
import { EventReview } from "@/components/organiser/EventReview";
import type { OrgCtx } from "@/components/organiser/OrganiserApp";
import type { OrgEvent } from "@/lib/organiser/data";

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    from: () => ({
      select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: null, error: null }) }) }),
      update: () => ({ eq: async () => ({ error: null }) }),
      insert: () => ({
        select: () => ({ single: async () => ({ data: { id: "new-id" }, error: null }) }),
      }),
      delete: () => ({ eq: async () => ({ error: null }) }),
      upsert: async () => ({ error: null }),
    }),
    storage: {
      from: () => ({
        upload: async () => ({ error: null }),
        createSignedUrl: async () => ({ data: { signedUrl: "https://example.invalid/signed" } }),
      }),
    },
    auth: { signOut: async () => ({ error: null }) },
  },
}));

afterEach(cleanup);

function makeEvent(overrides: Partial<OrgEvent> = {}): OrgEvent {
  return {
    id: "evt-1",
    owner_id: "org-1",
    status: "draft",
    event_type: "festival",
    name: "Desert Pulse",
    start_date: "2027-02-14",
    end_date: null,
    venue: "Langstrand",
    gates_open: "14:00",
    entry_rules: "18+ with ID",
    program: [],
    zones: [],
    site_plan_path: null,
    source_pdf_path: null,
    source_label: null,
    extraction_missing: [],
    published_at: null,
    created_at: "2026-11-18T10:00:00Z",
    updated_at: "2026-11-18T10:00:00Z",
    ...overrides,
  };
}

function makeCtx(events: OrgEvent[] = [], verification_status = "unverified"): OrgCtx {
  return {
    userId: "org-1",
    profile: {
      user_id: "org-1",
      display_name: "Alex",
      organisation: "Namib Rage",
      logo_path: null,
      verification_status,
      verification_document_path: null,
      created_at: "2026-11-18T10:00:00Z",
      updated_at: "2026-11-18T10:00:00Z",
    },
    events,
    reload: vi.fn(async () => {}),
    go: vi.fn(),
  };
}

describe("organiser validation and helpers", () => {
  it("validates PDF type, emptiness and 50 MB size limit", () => {
    expect(validatePdf({ name: "lineup.pdf", type: "application/pdf", size: 1024 })).toBeNull();
    expect(validatePdf({ name: "photo.png", type: "image/png", size: 1024 })).toMatch(/Only PDF/);
    expect(validatePdf({ name: "empty.pdf", type: "application/pdf", size: 0 })).toMatch(/empty/);
    expect(
      validatePdf({ name: "huge.pdf", type: "application/pdf", size: PDF_MAX_BYTES + 1 }),
    ).toMatch(/50 MB/);
  });

  it("validates image and verification files and safe JSONB parsing", () => {
    expect(validateImageFile({ type: "image/png", size: 512 })).toBeNull();
    expect(validateImageFile({ type: "image/gif", size: 512 })).toMatch(/JPG, PNG or WebP/);
    expect(
      validateVerificationFile({ name: "doc.pdf", type: "application/pdf", size: 500 }),
    ).toBeNull();
    expect(
      validateVerificationFile({ name: "bad.exe", type: "application/octet-stream", size: 500 }),
    ).toMatch(/PDF, JPG, PNG or WebP/);

    expect(
      parseProgram([{ title: "Shimza", place: "Main", time: "21:00" }, { bad: true }]),
    ).toHaveLength(1);
    expect(parseZones([{ name: "Gate A", type: "gate", x: 10, y: 20 }, { name: "" }])).toHaveLength(
      1,
    );
  });

  it("computes extraction missing fields, publish blockers and event groups", () => {
    expect(
      missingFields({
        event_type: "festival",
        name: "Sound of Summer",
        start_date: null,
        end_date: null,
        venue: "",
        gates_open: null,
        entry_rules: null,
        program: [],
      }),
    ).toEqual(["Date", "Venue", "Gates open", "Entry rules", "Program"]);

    expect(
      publishBlockers({
        name: "",
        start_date: null,
        site_plan_path: null,
        verification: "unverified",
      }),
    ).toHaveLength(4);

    const grouped = groupEventsBySection(
      [
        makeEvent({ id: "live", status: "published", start_date: "2026-12-28" }),
        makeEvent({ id: "past", status: "published", start_date: "2026-10-01" }),
        makeEvent({ id: "draft", status: "draft" }),
        makeEvent({ id: "imp", status: "imported" }),
      ],
      "2026-11-18",
    );
    expect(grouped.live.map((e) => e.id)).toEqual(["live"]);
    expect(grouped.past.map((e) => e.id)).toEqual(["past"]);
    expect(grouped.drafts.map((e) => e.id)).toEqual(["draft"]);
    expect(grouped.imported.map((e) => e.id)).toEqual(["imp"]);
  });
});

describe("organiser tabs", () => {
  it("renders an actionable empty state and only reveals search when list exceeds 3", () => {
    const emptyCtx = makeCtx([]);
    const { rerender } = render(<EventsTab ctx={emptyCtx} />);
    fireEvent.click(screen.getByRole("button", { name: /Create from PDF or draft/i }));
    expect(emptyCtx.go).toHaveBeenCalledWith("create");
    expect(screen.queryByLabelText("Search your events")).toBeNull();

    const fourCtx = makeCtx([
      makeEvent({ id: "1", name: "One" }),
      makeEvent({ id: "2", name: "Two" }),
      makeEvent({ id: "3", name: "Three" }),
      makeEvent({ id: "4", name: "Four", status: "imported" }),
    ]);
    rerender(<EventsTab ctx={fourCtx} />);
    expect(screen.getByLabelText("Search your events")).toBeVisible();
    fireEvent.click(screen.getByRole("button", { name: /Four/i }));
    expect(fourCtx.go).toHaveBeenCalledWith("events", "4");
  });

  it("shows honest unavailable state for partner feeds and rejects non-PDF upload", () => {
    const ctx = makeCtx([]);
    const view = render(<CreateTab ctx={ctx} />);
    expect(screen.getByText("Partner event feeds unavailable")).toBeVisible();
    const input = view.container.querySelector('input[type="file"]') as HTMLInputElement;
    const png = new File([new Uint8Array([1, 2])], "poster.png", { type: "image/png" });
    fireEvent.change(input, { target: { files: [png] } });
    expect(screen.getByRole("alert")).toHaveTextContent(/Only PDF files/);
  });

  it("separates verified timed items from unscheduled items and discloses broadcast and aggregate rules", async () => {
    const liveEvent = makeEvent({
      id: "live-1",
      status: "published",
      program: [
        { title: "Shimza", place: "Main Stage", time: "21:00", status: "scheduled" },
        { title: "Xduppy", place: "", time: "", status: "scheduled" },
      ],
    });
    await act(async () => {
      render(<LiveTab ctx={makeCtx([liveEvent], "verified")} />);
    });
    expect(screen.getByText(/21:00/)).toBeVisible();
    expect(screen.getByText(/Time pending/)).toBeVisible();
    expect(screen.getByText("One-way attendee broadcast")).toBeVisible();
    expect(
      screen.getByText(/Individual attendee profiles and locations are never exposed/),
    ).toBeVisible();
  });

  it("lists publish blockers and adapts terminology in EventReview", async () => {
    const confEvent = makeEvent({ event_type: "conference", site_plan_path: null });
    await act(async () => {
      render(<EventReview ctx={makeCtx([confEvent], "unverified")} event={confEvent} />);
    });
    expect(screen.getByText("Agenda")).toBeVisible();
    expect(screen.getByText("Upload a site plan")).toBeVisible();
    expect(screen.getByText("Organiser verification must be approved")).toBeVisible();
    expect(screen.getByRole("button", { name: "Publish event" })).toBeDisabled();
  });
});
