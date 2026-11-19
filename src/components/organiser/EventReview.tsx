import { useEffect, useState, type FormEvent } from "react";
import { ArrowDown, ArrowLeft, ArrowUp, MapPin, Plus, RotateCw, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import type { Database, Json } from "@/integrations/supabase/types";
import { dbError, signedUrl, uploadOwnFile, type OrgEvent } from "@/lib/organiser/data";
import {
  readStoredMapCalibration,
  removeLocalPublishedEvent,
  saveLocalPublishedEvent,
  saveStoredMapCalibration,
} from "@/lib/organiser/event-adapter";
import {
  computeAffineCalibration,
  optimizeSitePlanImage,
  type CalibrationRefPoint,
  type SitePlanRotation,
} from "@/lib/attendee/map-fit";
import {
  DRINK_CATEGORIES,
  readOrganiserBarMenus,
  saveOrganiserBarMenus,
  type BarDrinkItem,
  type DrinkCategory,
} from "@/lib/attendee/bar-menu";
import { analyzeOrganiserEvent } from "@/lib/intelligence/event-intelligence";
import {
  EVENT_TYPES,
  IMAGE_TYPES,
  parseProgram,
  parseZones,
  publishBlockers,
  TYPE_TERMS,
  validateImageFile,
  ZONE_TYPES,
  type EventType,
  type ProgramItem,
  type ZoneItem,
} from "@/lib/organiser/schema";
import { Sheet } from "@/components/companion/Sheet";
import {
  Chevron,
  PrimaryButton,
  RowText,
  SecondaryButton,
  Section,
} from "@/components/companion/ui";
import type { OrgCtx } from "./OrganiserApp";

type ReviewSheet =
  | "basics"
  | "program"
  | "site-plan"
  | "zones"
  | "bar-menus"
  | "publish"
  | "unpublish"
  | "delete"
  | null;

export function EventReview({ ctx, event }: { ctx: OrgCtx; event: OrgEvent }) {
  const [sheet, setSheet] = useState<ReviewSheet>(null);
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [error, setError] = useState("");
  const [sitePlanUrl, setSitePlanUrl] = useState<string | null>(null);

  const [name, setName] = useState(event.name);
  const [eventType, setEventType] = useState<EventType>(
    (EVENT_TYPES as readonly string[]).includes(event.event_type)
      ? (event.event_type as EventType)
      : "festival",
  );
  const [startDate, setStartDate] = useState(event.start_date ?? "");
  const [endDate, setEndDate] = useState(event.end_date ?? "");
  const [venue, setVenue] = useState(event.venue);
  const [gatesOpen, setGatesOpen] = useState(event.gates_open);
  const [entryRules, setEntryRules] = useState(event.entry_rules);
  const [program, setProgram] = useState<ProgramItem[]>(() => parseProgram(event.program));
  const [zones, setZones] = useState<ZoneItem[]>(() => parseZones(event.zones));
  const [activeZoneIndex, setActiveZoneIndex] = useState<number | null>(null);
  const [sitePlanRotation, setSitePlanRotation] = useState<SitePlanRotation>(0);
  const [uploadProgress, setUploadProgress] = useState<{ percent: number; label: string } | null>(
    null,
  );
  const [calRefs, setCalRefs] = useState<CalibrationRefPoint[]>(
    () =>
      readStoredMapCalibration(event.id)?.refs ?? [
        { x: 20, y: 60, lat: -22.821, lng: 14.539 },
        { x: 80, y: 60, lat: -22.821, lng: 14.544 },
        { x: 50, y: 20, lat: -22.818, lng: 14.5415 },
      ],
  );
  const [calActiveIdx, setCalActiveIdx] = useState<number | null>(null);
  const [calStatus, setCalStatus] = useState("");
  const [barItems, setBarItems] = useState<BarDrinkItem[]>(
    () => readOrganiserBarMenus(event.id)[0]?.items ?? [],
  );
  const [barPaymentNote, setBarPaymentNote] = useState(
    () =>
      readOrganiserBarMenus(event.id)[0]?.paymentNote ?? "Cashless & card accepted at event bars.",
  );
  const [newDrinkName, setNewDrinkName] = useState("");
  const [newDrinkCat, setNewDrinkCat] = useState<DrinkCategory>("Beer");
  const [newDrinkPrice, setNewDrinkPrice] = useState("");

  useEffect(() => {
    setName(event.name);
    setEventType(
      (EVENT_TYPES as readonly string[]).includes(event.event_type)
        ? (event.event_type as EventType)
        : "festival",
    );
    setStartDate(event.start_date ?? "");
    setEndDate(event.end_date ?? "");
    setVenue(event.venue);
    setGatesOpen(event.gates_open);
    setEntryRules(event.entry_rules);
    setProgram(parseProgram(event.program));
    setZones(parseZones(event.zones));
  }, [event]);

  useEffect(() => {
    let active = true;
    void signedUrl(event.site_plan_path).then((url) => {
      if (active) setSitePlanUrl(url);
    });
    return () => {
      active = false;
    };
  }, [event.site_plan_path]);

  const terms = TYPE_TERMS[eventType];
  const verification = (ctx.profile?.verification_status ?? "unverified") as
    "unverified" | "pending" | "verified" | "rejected";
  const blockers = publishBlockers({
    name,
    start_date: startDate || null,
    site_plan_path: event.site_plan_path,
    event_type: eventType,
    venue,
    verification,
  });
  const readinessIssues = analyzeOrganiserEvent({
    name,
    venue,
    startDate,
    entryRules,
    program,
    zones,
    sitePlanPath: event.site_plan_path,
    eventType,
  });

  async function savePatch(patch: Database["public"]["Tables"]["organiser_events"]["Update"]) {
    if (typeof navigator !== "undefined" && !navigator.onLine) {
      setSaveState("error");
      setError("You’re offline. Connect to save changes.");
      return false;
    }
    setSaveState("saving");
    setError("");
    const { error: updErr } = await supabase
      .from("organiser_events")
      .update(patch)
      .eq("id", event.id);
    if (updErr) {
      setSaveState("error");
      setError(dbError(updErr.message));
      return false;
    }
    setSaveState("saved");
    await ctx.reload();
    return true;
  }

  async function saveBasics(e: FormEvent) {
    e.preventDefault();
    if (
      await savePatch({
        name: name.trim(),
        event_type: eventType,
        start_date: startDate || null,
        end_date: endDate || null,
        venue: venue.trim(),
        gates_open: gatesOpen.trim(),
        entry_rules: entryRules.trim(),
      })
    )
      setSheet(null);
  }

  async function uploadSitePlan(file: File) {
    const problem = validateImageFile(file);
    if (problem) {
      setError(problem);
      return;
    }
    setSaveState("saving");
    setError("");
    setUploadProgress({ percent: 10, label: "Checking image quality…" });
    try {
      const optimized = await optimizeSitePlanImage(file, {
        rotation: sitePlanRotation,
        onProgress: (percent, label) => setUploadProgress({ percent, label }),
      });
      setUploadProgress({ percent: 85, label: "Uploading optimized map…" });
      const path = await uploadOwnFile(ctx.userId, optimized.displayFile, "site-plans");
      if (optimized.zoomFile) {
        // Upload high-res zoom variant alongside display version (best-effort)
        void uploadOwnFile(ctx.userId, optimized.zoomFile, "site-plans-zoom").catch(() => {});
      }
      await savePatch({ site_plan_path: path });
      setSitePlanRotation(0);
    } catch (err) {
      setSaveState("error");
      setError(err instanceof Error ? err.message : "Couldn’t upload site plan.");
    } finally {
      setUploadProgress(null);
    }
  }

  async function duplicateEdition() {
    setSaveState("saving");
    setError("");
    const { data, error: dupErr } = await supabase
      .from("organiser_events")
      .insert({
        owner_id: ctx.userId,
        status: "draft",
        event_type: eventType,
        name: name.trim() ? `${name.trim()} (next edition)` : "Next edition draft",
        venue: venue.trim(),
        entry_rules: entryRules.trim(),
        site_plan_path: event.site_plan_path,
        zones: zones as unknown as Json,
      })
      .select("id")
      .single();
    if (dupErr || !data) {
      setSaveState("error");
      setError(dbError(dupErr?.message));
      return;
    }
    setSaveState("saved");
    await ctx.reload();
    ctx.go("events", data.id);
  }

  function exportProgramJson() {
    const payload = {
      name: name || "Untitled event",
      eventType,
      startDate: startDate || null,
      endDate: endDate || null,
      venue: venue || null,
      gatesOpen: gatesOpen || null,
      entryRules: entryRules || null,
      program,
      zones,
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${(name || "event").toLowerCase().replace(/[^a-z0-9]+/g, "-")}-program.json`;
    link.click();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  return (
    <div className="py-4">
      <button
        type="button"
        className="flex min-h-11 items-center gap-1 text-[16px] font-semibold text-primary"
        onClick={() => ctx.go("events")}
      >
        <ArrowLeft size={18} aria-hidden /> All events
      </button>

      <div className="mt-2 flex items-start justify-between gap-3">
        <div>
          <p className="text-[13px] font-semibold uppercase tracking-wide text-muted-foreground">
            {event.status} · {eventType}
          </p>
          <h1 className="ios-large-title">{name || "Untitled draft"}</h1>
        </div>
        {saveState !== "idle" && (
          <p role="status" className="pt-2 text-[14px] text-muted-foreground">
            {saveState === "saving"
              ? "Saving…"
              : saveState === "saved"
                ? "Saved"
                : "Needs attention"}
          </p>
        )}
      </div>

      {event.extraction_missing.length > 0 && (
        <p className="mt-3 rounded-xl bg-secondary px-4 py-3 text-[14px] text-muted-foreground">
          Not found in PDF: {event.extraction_missing.join(", ")}. Tap any row below to add them.
        </p>
      )}

      {error && (
        <p role="alert" className="mt-3 rounded-xl bg-warning-soft px-4 py-3 text-[15px]">
          {error}
        </p>
      )}

      <Section title="Review details" id="org-review-rows">
        <div className="ios-group">
          <button
            type="button"
            className="ios-row w-full text-left"
            onClick={() => setSheet("basics")}
          >
            <RowText
              title="Event basics & rules"
              subtitle={`${startDate || "Add date"} · ${venue || "Add venue"}${gatesOpen ? ` · Gates ${gatesOpen}` : ""}`}
            />
            <Chevron />
          </button>
          <button
            type="button"
            className="ios-row w-full text-left"
            onClick={() => setSheet("program")}
          >
            <RowText
              title={terms.program}
              subtitle={
                program.length
                  ? `${program.length} ${terms.people.toLowerCase()} added`
                  : `Add ${terms.people.toLowerCase()}`
              }
            />
            <Chevron />
          </button>
          <button
            type="button"
            className="ios-row w-full text-left"
            onClick={() => setSheet("site-plan")}
          >
            <RowText
              title="Site plan"
              subtitle={
                event.site_plan_path
                  ? "Uploaded — tap to view, rotate or replace"
                  : eventType === "festival"
                    ? "Required before publishing (≥2000px)"
                    : "Optional for this event type"
              }
            />
            <Chevron />
          </button>
          <button
            type="button"
            className="ios-row w-full text-left"
            onClick={() => setSheet("zones")}
          >
            <RowText
              title={`Venue zones & ${terms.places.toLowerCase()}`}
              subtitle={
                zones.length ? `${zones.length} mapped points` : "Add stages, bars, gates or medics"
              }
            />
            <Chevron />
          </button>
          <button
            type="button"
            className="ios-row w-full text-left"
            onClick={() => setSheet("bar-menus")}
          >
            <RowText
              title="Bar drinks menu"
              subtitle={
                barItems.length
                  ? `${barItems.length} confirmed drinks published`
                  : "Optional · bars show Sample Menu until configured"
              }
            />
            <Chevron />
          </button>
        </div>
      </Section>

      {readinessIssues.length > 0 && (
        <Section title="Readiness checks" id="org-readiness-checks">
          <div className="ios-group">
            {readinessIssues.map((issue) => (
              <div key={issue.id} className="ios-row items-start py-3">
                <RowText
                  title={
                    <span
                      className={
                        issue.severity === "warning" ? "font-semibold text-warning" : "font-medium"
                      }
                    >
                      {issue.title}
                    </span>
                  }
                  subtitle={issue.detail}
                />
              </div>
            ))}
          </div>
        </Section>
      )}

      <Section title="Publish" id="org-publish">
        <div className="ios-card space-y-3 p-4">
          {event.status === "published" ? (
            <>
              <p className="text-[15px]">
                Marked published{event.published_at ? ` on ${event.published_at.slice(0, 10)}` : ""}
                .
              </p>
              <SecondaryButton onClick={() => setSheet("unpublish")}>Unpublish</SecondaryButton>
            </>
          ) : (
            <>
              {blockers.length > 0 && (
                <ul className="list-disc space-y-1 pl-5 text-[14px] text-muted-foreground">
                  {blockers.map((b) => (
                    <li key={b}>{b}</li>
                  ))}
                </ul>
              )}
              <PrimaryButton disabled={blockers.length > 0} onClick={() => setSheet("publish")}>
                Publish event
              </PrimaryButton>
            </>
          )}
        </div>
      </Section>

      <Section title="Actions" id="org-actions">
        <div className="ios-group">
          <button
            type="button"
            className="ios-row w-full text-left"
            onClick={() => void duplicateEdition()}
          >
            <RowText
              title="Duplicate for next edition"
              subtitle="Keeps venue, rules, zones and site plan; clears dates and program"
            />
            <Chevron />
          </button>
          <button type="button" className="ios-row w-full text-left" onClick={exportProgramJson}>
            <RowText title={`Export ${terms.program.toLowerCase()} JSON`} />
            <Chevron />
          </button>
          {event.status !== "published" && (
            <button
              type="button"
              className="ios-row w-full text-left text-destructive"
              onClick={() => setSheet("delete")}
            >
              <RowText title="Delete draft" />
              <Chevron />
            </button>
          )}
        </div>
      </Section>

      {sheet === "basics" && (
        <Sheet title="Event basics & rules" onClose={() => setSheet(null)}>
          <form onSubmit={(e) => void saveBasics(e)} className="space-y-4">
            <label className="block text-[15px] font-semibold">
              Event name
              <input
                className="ios-field mt-1"
                maxLength={160}
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </label>
            <label className="block text-[15px] font-semibold">
              Event type
              <select
                className="ios-field mt-1"
                value={eventType}
                onChange={(e) => setEventType(e.target.value as EventType)}
              >
                <option value="festival">Festival (Lineup / Artists / Stages)</option>
                <option value="concert">Concert (Lineup / Performers / Stages)</option>
                <option value="nightlife">Nightlife (Lineup / DJs / Rooms)</option>
                <option value="conference">Conference (Agenda / Speakers / Rooms)</option>
                <option value="corporate">Corporate (Program / Presenters / Rooms)</option>
                <option value="sports">Sports (Fixtures / Teams / Venues)</option>
                <option value="expo">Expo &amp; Market (Schedule / Exhibitors / Booths)</option>
                <option value="cultural">Cultural (Programme / Performers / Areas)</option>
                <option value="private">Private event (Schedule / Hosts / Areas)</option>
              </select>
            </label>
            <div className="grid grid-cols-2 gap-3">
              <label className="block text-[15px] font-semibold">
                Start date
                <input
                  type="date"
                  className="ios-field mt-1"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                />
              </label>
              <label className="block text-[15px] font-semibold">
                End date
                <input
                  type="date"
                  className="ios-field mt-1"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                />
              </label>
            </div>
            <label className="block text-[15px] font-semibold">
              Venue
              <input
                className="ios-field mt-1"
                maxLength={200}
                value={venue}
                onChange={(e) => setVenue(e.target.value)}
              />
            </label>
            <label className="block text-[15px] font-semibold">
              Gates open
              <input
                className="ios-field mt-1"
                maxLength={20}
                placeholder="12:00"
                value={gatesOpen}
                onChange={(e) => setGatesOpen(e.target.value)}
              />
            </label>
            <label className="block text-[15px] font-semibold">
              Entry rules
              <textarea
                rows={4}
                maxLength={2000}
                className="ios-field mt-1"
                value={entryRules}
                onChange={(e) => setEntryRules(e.target.value)}
              />
            </label>
            <PrimaryButton type="submit" disabled={saveState === "saving"}>
              Save basics
            </PrimaryButton>
          </form>
        </Sheet>
      )}

      {sheet === "program" && (
        <Sheet title={terms.program} onClose={() => setSheet(null)}>
          <div className="space-y-4">
            {program.map((item, idx) => (
              <div key={idx} className="ios-card space-y-2 p-3">
                <input
                  aria-label={`${terms.people} item ${idx + 1} name`}
                  className="ios-field"
                  value={item.title}
                  placeholder="Artist, speaker or session"
                  onChange={(e) =>
                    setProgram((prev) =>
                      prev.map((row, i) => (i === idx ? { ...row, title: e.target.value } : row)),
                    )
                  }
                />
                <div className="grid grid-cols-2 gap-2">
                  <input
                    aria-label={`Item ${idx + 1} place`}
                    className="ios-field"
                    value={item.place}
                    placeholder={terms.places}
                    onChange={(e) =>
                      setProgram((prev) =>
                        prev.map((row, i) => (i === idx ? { ...row, place: e.target.value } : row)),
                      )
                    }
                  />
                  <input
                    aria-label={`Item ${idx + 1} time`}
                    className="ios-field"
                    value={item.time}
                    placeholder="HH:MM (optional)"
                    onChange={(e) =>
                      setProgram((prev) =>
                        prev.map((row, i) => (i === idx ? { ...row, time: e.target.value } : row)),
                      )
                    }
                  />
                </div>
                <div className="flex flex-wrap items-center gap-4 pt-1 text-[13px]">
                  <label className="flex items-center gap-1.5 font-medium">
                    <input
                      type="checkbox"
                      checked={Boolean(item.headliner)}
                      onChange={(e) =>
                        setProgram((prev) =>
                          prev.map((row, i) =>
                            i === idx
                              ? {
                                  ...row,
                                  headliner: e.target.checked,
                                  featured: e.target.checked || row.featured,
                                }
                              : row,
                          ),
                        )
                      }
                    />
                    {eventType === "conference" ? "Keynote" : "Headliner"}
                  </label>
                  <label className="flex items-center gap-1.5 font-medium">
                    <input
                      type="checkbox"
                      checked={Boolean(item.featured)}
                      onChange={(e) =>
                        setProgram((prev) =>
                          prev.map((row, i) =>
                            i === idx ? { ...row, featured: e.target.checked } : row,
                          ),
                        )
                      }
                    />
                    Featured on Home
                  </label>
                </div>
                <div className="flex items-center gap-2">
                  <select
                    aria-label={`Item ${idx + 1} status`}
                    className="ios-field flex-1"
                    value={item.status}
                    onChange={(e) =>
                      setProgram((prev) =>
                        prev.map((row, i) =>
                          i === idx
                            ? { ...row, status: e.target.value as ProgramItem["status"] }
                            : row,
                        ),
                      )
                    }
                  >
                    <option value="scheduled">Scheduled</option>
                    <option value="delayed">Delayed</option>
                    <option value="moved">Moved</option>
                    <option value="cancelled">Cancelled</option>
                  </select>
                  <button
                    type="button"
                    aria-label="Move up"
                    disabled={idx === 0}
                    className="grid size-11 place-items-center disabled:opacity-35"
                    onClick={() =>
                      setProgram((prev) => {
                        const copy = [...prev];
                        [copy[idx - 1], copy[idx]] = [copy[idx]!, copy[idx - 1]!];
                        return copy;
                      })
                    }
                  >
                    <ArrowUp size={18} />
                  </button>
                  <button
                    type="button"
                    aria-label="Move down"
                    disabled={idx === program.length - 1}
                    className="grid size-11 place-items-center disabled:opacity-35"
                    onClick={() =>
                      setProgram((prev) => {
                        const copy = [...prev];
                        [copy[idx + 1], copy[idx]] = [copy[idx]!, copy[idx + 1]!];
                        return copy;
                      })
                    }
                  >
                    <ArrowDown size={18} />
                  </button>
                  <button
                    type="button"
                    aria-label="Remove item"
                    className="grid size-11 place-items-center text-destructive"
                    onClick={() => setProgram((prev) => prev.filter((_, i) => i !== idx))}
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
              </div>
            ))}
            <SecondaryButton
              onClick={() =>
                setProgram((prev) => [
                  ...prev,
                  {
                    title: "",
                    place: "",
                    time: "",
                    status: "scheduled",
                    featured: false,
                    headliner: false,
                    featuredOrder: null,
                  },
                ])
              }
            >
              <Plus size={18} /> Add item
            </SecondaryButton>
            <PrimaryButton
              disabled={saveState === "saving"}
              onClick={async () => {
                const cleaned = program.filter((p) => p.title.trim().length > 0);
                setProgram(cleaned);
                if (await savePatch({ program: cleaned as unknown as Json })) setSheet(null);
              }}
            >
              Save {terms.program.toLowerCase()}
            </PrimaryButton>
          </div>
        </Sheet>
      )}

      {sheet === "site-plan" && (
        <Sheet title="Site plan" onClose={() => setSheet(null)}>
          <div className="space-y-4">
            {sitePlanUrl ? (
              <div className="overflow-hidden rounded-xl border border-border bg-white p-2">
                <img
                  src={sitePlanUrl}
                  alt="Uploaded event site plan"
                  style={{ transform: `rotate(${sitePlanRotation}deg)` }}
                  className="max-h-72 w-full object-contain transition-transform duration-200"
                />
              </div>
            ) : (
              <p className="text-[15px] text-muted-foreground">
                No site plan uploaded yet. Upload a crisp JPG, PNG or WebP map (at least 2000px on
                the long edge, aspect ratio between 1:3 and 3:1).
              </p>
            )}

            {/* Orientation rotation control (0°, 90°, 180°, 270°) */}
            <div className="flex items-center justify-between rounded-xl bg-secondary px-3.5 py-2.5">
              <span className="text-[14px] font-medium">
                Rotation before upload: <strong>{sitePlanRotation}°</strong>
              </span>
              <button
                type="button"
                className="inline-flex min-h-10 items-center gap-1.5 rounded-lg bg-popover px-3 text-[14px] font-semibold"
                onClick={() =>
                  setSitePlanRotation(((sitePlanRotation + 90) % 360) as SitePlanRotation)
                }
              >
                <RotateCw size={15} aria-hidden /> Rotate 90°
              </button>
            </div>

            {uploadProgress && (
              <div role="status" className="space-y-1.5 rounded-xl bg-popover p-3">
                <div className="flex items-center justify-between text-[13px] font-medium">
                  <span>{uploadProgress.label}</span>
                  <span className="tabular-nums">{uploadProgress.percent}%</span>
                </div>
                <div className="h-2 w-full overflow-hidden rounded-full bg-secondary">
                  <div
                    className="h-full rounded-full bg-primary transition-all duration-200"
                    style={{ width: `${uploadProgress.percent}%` }}
                  />
                </div>
              </div>
            )}

            <label className="ios-press flex min-h-12 w-full cursor-pointer items-center justify-center rounded-xl bg-primary px-4 text-[17px] font-semibold text-primary-foreground">
              {sitePlanUrl ? "Replace site plan" : "Upload site plan"}
              <input
                type="file"
                accept={IMAGE_TYPES.join(",")}
                className="sr-only"
                onChange={(e) => {
                  const chosen = e.currentTarget.files?.[0];
                  e.currentTarget.value = "";
                  if (chosen) void uploadSitePlan(chosen);
                }}
              />
            </label>
            <p className="text-[13px] text-muted-foreground">
              Validated at ≥2000px long edge, compressed to WebP (80% quality), and split into
              display + zoom layers automatically.
            </p>

            {/* Option A — 3-Point GPS Calibration (affine transform pixel% <-> lat/lng) */}
            {sitePlanUrl && (
              <details className="rounded-xl border border-border bg-popover p-3">
                <summary className="min-h-10 cursor-pointer content-center text-[15px] font-semibold">
                  Calibrate GPS (3 reference points)
                </summary>
                <div className="mt-3 space-y-3">
                  <p className="text-[13px] text-muted-foreground">
                    Drop 3 non-collinear reference points on the map and enter their verified real
                    latitude/longitude so live GPS crew pins align accurately.
                  </p>
                  {calActiveIdx !== null && (
                    <button
                      type="button"
                      className="relative block w-full overflow-hidden rounded-xl border border-primary"
                      onClick={(e) => {
                        const rect = e.currentTarget.getBoundingClientRect();
                        const x = Math.round(((e.clientX - rect.left) / rect.width) * 1000) / 10;
                        const y = Math.round(((e.clientY - rect.top) / rect.height) * 1000) / 10;
                        setCalRefs((prev) =>
                          prev.map((r, i) => (i === calActiveIdx ? { ...r, x, y } : r)),
                        );
                        setCalActiveIdx(null);
                      }}
                    >
                      <img
                        src={sitePlanUrl}
                        alt="Tap to place calibration point"
                        className="w-full"
                      />
                      {calRefs.map((ref, idx) => (
                        <span
                          key={idx}
                          style={{ left: `${ref.x}%`, top: `${ref.y}%` }}
                          className="absolute -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary px-2 py-0.5 text-[11px] font-bold text-primary-foreground"
                        >
                          P{idx + 1}
                        </span>
                      ))}
                    </button>
                  )}
                  {calRefs.map((ref, idx) => (
                    <div key={idx} className="space-y-1.5 rounded-lg bg-secondary/60 p-2.5">
                      <div className="flex items-center justify-between text-[13px] font-semibold">
                        <span>
                          Point {idx + 1} ({ref.x}%, {ref.y}%)
                        </span>
                        <button
                          type="button"
                          className="text-primary"
                          onClick={() => setCalActiveIdx(idx)}
                        >
                          Tap on map
                        </button>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <input
                          type="number"
                          step="0.0001"
                          aria-label={`Point ${idx + 1} latitude`}
                          className="ios-field"
                          value={ref.lat}
                          onChange={(e) =>
                            setCalRefs((prev) =>
                              prev.map((r, i) =>
                                i === idx ? { ...r, lat: Number(e.target.value) } : r,
                              ),
                            )
                          }
                        />
                        <input
                          type="number"
                          step="0.0001"
                          aria-label={`Point ${idx + 1} longitude`}
                          className="ios-field"
                          value={ref.lng}
                          onChange={(e) =>
                            setCalRefs((prev) =>
                              prev.map((r, i) =>
                                i === idx ? { ...r, lng: Number(e.target.value) } : r,
                              ),
                            )
                          }
                        />
                      </div>
                    </div>
                  ))}
                  <SecondaryButton
                    onClick={() => {
                      const transform = computeAffineCalibration(calRefs);
                      if (!transform) {
                        setCalStatus(
                          "Points must form a triangle (not a straight line) to solve calibration.",
                        );
                        return;
                      }
                      saveStoredMapCalibration(event.id, {
                        refs: calRefs,
                        transform,
                        updatedAt: new Date().toISOString(),
                      });
                      setCalStatus("GPS affine calibration saved for this site plan.");
                    }}
                  >
                    Save GPS calibration
                  </SecondaryButton>
                  {calStatus && (
                    <p role="status" className="text-[13px] font-medium text-primary">
                      {calStatus}
                    </p>
                  )}
                </div>
              </details>
            )}
          </div>
        </Sheet>
      )}

      {sheet === "bar-menus" && (
        <Sheet title="Bar drinks menu" onClose={() => setSheet(null)}>
          <div className="space-y-4">
            <p className="text-[14px] text-muted-foreground">
              Add official drinks and optional prices for this event’s bars. Until you save items
              here, bar pins display a clearly labelled Sample Menu.
            </p>
            <label className="block text-[14px] font-semibold">
              Payment &amp; bar note
              <input
                className="ios-field mt-1"
                maxLength={160}
                value={barPaymentNote}
                onChange={(e) => setBarPaymentNote(e.target.value)}
              />
            </label>
            {barItems.length > 0 && (
              <div className="ios-group">
                {barItems.map((drink) => (
                  <div key={drink.id} className="ios-row justify-between py-2.5">
                    <div>
                      <p className="text-[15px] font-semibold">{drink.name}</p>
                      <p className="text-[13px] text-muted-foreground">
                        {drink.category} · {drink.price ?? "Price TBC"}
                      </p>
                    </div>
                    <button
                      type="button"
                      aria-label={`Remove ${drink.name}`}
                      className="grid size-10 place-items-center text-destructive"
                      onClick={() =>
                        setBarItems((prev) => prev.filter((item) => item.id !== drink.id))
                      }
                    >
                      <Trash2 size={17} />
                    </button>
                  </div>
                ))}
              </div>
            )}
            <div className="space-y-2 rounded-2xl bg-popover p-3">
              <input
                aria-label="Drink name"
                className="ios-field"
                placeholder="Drink name (e.g. Windhoek Lager 330ml)"
                value={newDrinkName}
                onChange={(e) => setNewDrinkName(e.target.value)}
              />
              <div className="grid grid-cols-2 gap-2">
                <select
                  aria-label="Drink category"
                  className="ios-field"
                  value={newDrinkCat}
                  onChange={(e) => setNewDrinkCat(e.target.value as DrinkCategory)}
                >
                  {DRINK_CATEGORIES.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
                <input
                  aria-label="Drink price (optional)"
                  className="ios-field"
                  placeholder="Price (optional, e.g. N$ 45)"
                  value={newDrinkPrice}
                  onChange={(e) => setNewDrinkPrice(e.target.value)}
                />
              </div>
              <SecondaryButton
                onClick={() => {
                  if (!newDrinkName.trim()) return;
                  setBarItems((prev) => [
                    ...prev,
                    {
                      id: crypto.randomUUID(),
                      name: newDrinkName.trim(),
                      category: newDrinkCat,
                      price: newDrinkPrice.trim() || null,
                      available: true,
                    },
                  ]);
                  setNewDrinkName("");
                  setNewDrinkPrice("");
                }}
              >
                <Plus size={17} aria-hidden /> Add drink
              </SecondaryButton>
            </div>
            <PrimaryButton
              onClick={() => {
                saveOrganiserBarMenus(
                  event.id,
                  barItems.length
                    ? [
                        {
                          isSample: false,
                          paymentNote: barPaymentNote.trim(),
                          items: barItems,
                        },
                      ]
                    : [],
                );
                setSheet(null);
              }}
            >
              Save bar menu
            </PrimaryButton>
          </div>
        </Sheet>
      )}

      {sheet === "zones" && (
        <Sheet title={`Venue zones & ${terms.places.toLowerCase()}`} onClose={() => setSheet(null)}>
          <div className="space-y-4">
            {sitePlanUrl && activeZoneIndex !== null && (
              <div className="space-y-2">
                <p className="text-[14px] font-medium text-primary">
                  Tap on the site plan to place “{zones[activeZoneIndex]?.name || "point"}”.
                </p>
                <button
                  type="button"
                  className="relative block w-full overflow-hidden rounded-xl border border-primary"
                  onClick={(e) => {
                    const rect = e.currentTarget.getBoundingClientRect();
                    const x = Math.round(((e.clientX - rect.left) / rect.width) * 1000) / 10;
                    const y = Math.round(((e.clientY - rect.top) / rect.height) * 1000) / 10;
                    setZones((prev) =>
                      prev.map((z, i) => (i === activeZoneIndex ? { ...z, x, y } : z)),
                    );
                    setActiveZoneIndex(null);
                  }}
                >
                  <img src={sitePlanUrl} alt="Tap to position zone" className="w-full" />
                  {zones.map(
                    (z, i) =>
                      z.x !== null &&
                      z.y !== null && (
                        <span
                          key={i}
                          style={{ left: `${z.x}%`, top: `${z.y}%` }}
                          className="absolute -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary px-2 py-0.5 text-[11px] font-semibold text-primary-foreground"
                        >
                          {z.name || z.type}
                        </span>
                      ),
                  )}
                </button>
              </div>
            )}

            {zones.map((zone, idx) => (
              <div key={idx} className="ios-card space-y-2 p-3">
                <div className="flex gap-2">
                  <input
                    aria-label={`Zone ${idx + 1} name`}
                    className="ios-field flex-1"
                    value={zone.name}
                    placeholder="Main Stage, North Gate, Medics..."
                    onChange={(e) =>
                      setZones((prev) =>
                        prev.map((z, i) => (i === idx ? { ...z, name: e.target.value } : z)),
                      )
                    }
                  />
                  <button
                    type="button"
                    aria-label="Remove zone"
                    className="grid size-11 place-items-center text-destructive"
                    onClick={() => setZones((prev) => prev.filter((_, i) => i !== idx))}
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
                <div className="flex items-center gap-2">
                  <select
                    aria-label={`Zone ${idx + 1} category`}
                    className="ios-field flex-1"
                    value={zone.type}
                    onChange={(e) =>
                      setZones((prev) =>
                        prev.map((z, i) =>
                          i === idx ? { ...z, type: e.target.value as ZoneItem["type"] } : z,
                        ),
                      )
                    }
                  >
                    {ZONE_TYPES.map((type) => (
                      <option key={type} value={type}>
                        {type}
                      </option>
                    ))}
                  </select>
                  {sitePlanUrl && (
                    <button
                      type="button"
                      className="min-h-11 rounded-xl bg-secondary px-3 text-[14px] font-semibold"
                      onClick={() => setActiveZoneIndex(idx)}
                    >
                      <MapPin size={15} className="mr-1 inline" />
                      {zone.x !== null && zone.y !== null ? `${zone.x}%, ${zone.y}%` : "Set pin"}
                    </button>
                  )}
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <select
                    aria-label={`Zone ${idx + 1} access tier`}
                    className="ios-field"
                    value={zone.accessTier}
                    onChange={(e) =>
                      setZones((prev) =>
                        prev.map((z, i) =>
                          i === idx
                            ? { ...z, accessTier: e.target.value as ZoneItem["accessTier"] }
                            : z,
                        ),
                      )
                    }
                  >
                    <option value="all">All attendees</option>
                    <option value="experience">Experience tier</option>
                    <option value="platinum">Platinum tier</option>
                    <option value="vip">VIP tier</option>
                  </select>
                  <select
                    aria-label={`Zone ${idx + 1} status`}
                    className="ios-field"
                    value={zone.status}
                    onChange={(e) =>
                      setZones((prev) =>
                        prev.map((z, i) =>
                          i === idx ? { ...z, status: e.target.value as ZoneItem["status"] } : z,
                        ),
                      )
                    }
                  >
                    <option value="open">Open</option>
                    <option value="busy">Busy</option>
                    <option value="closed">Closed</option>
                  </select>
                </div>
                <input
                  aria-label={`Zone ${idx + 1} vendor or facility note`}
                  className="ios-field"
                  maxLength={200}
                  value={zone.vendorNote}
                  placeholder="Menu, payment methods (card/cashless), or access notes…"
                  onChange={(e) =>
                    setZones((prev) =>
                      prev.map((z, i) => (i === idx ? { ...z, vendorNote: e.target.value } : z)),
                    )
                  }
                />
              </div>
            ))}

            <SecondaryButton
              onClick={() =>
                setZones((prev) => [
                  ...prev,
                  {
                    name: "",
                    type: "stage",
                    x: null,
                    y: null,
                    accessTier: "all",
                    vendorNote: "",
                    status: "open",
                  },
                ])
              }
            >
              <Plus size={18} /> Add point
            </SecondaryButton>
            <PrimaryButton
              disabled={saveState === "saving"}
              onClick={async () => {
                const cleaned = zones.filter((z) => z.name.trim().length > 0);
                setZones(cleaned);
                if (await savePatch({ zones: cleaned as unknown as Json })) setSheet(null);
              }}
            >
              Save points
            </PrimaryButton>
          </div>
        </Sheet>
      )}

      {sheet === "publish" && (
        <Sheet title="Publish event?" onClose={() => setSheet(null)}>
          <div className="space-y-4">
            <p className="text-[16px]">
              Publishing makes this event’s details visible to attendees when synced. Confirm the
              event name, date and site plan are accurate.
            </p>
            <PrimaryButton
              onClick={async () => {
                if (await savePatch({ status: "published" })) {
                  saveLocalPublishedEvent({
                    id: event.id,
                    eventType,
                    name: name.trim(),
                    startDate: startDate || null,
                    endDate: endDate || null,
                    venue: venue.trim(),
                    gatesOpen: gatesOpen.trim(),
                    entryRules: entryRules.trim(),
                    program,
                    zones,
                    sitePlanPath: event.site_plan_path,
                    sitePlanUrl,
                    publishedAt: new Date().toISOString(),
                  });
                  setSheet(null);
                }
              }}
            >
              Confirm publish
            </PrimaryButton>
            <SecondaryButton onClick={() => setSheet(null)}>Cancel</SecondaryButton>
          </div>
        </Sheet>
      )}

      {sheet === "unpublish" && (
        <Sheet title="Unpublish event?" onClose={() => setSheet(null)}>
          <div className="space-y-4">
            <p className="text-[16px]">
              Unpublishing returns this event to draft status. Attendees keep their existing crew
              records.
            </p>
            <PrimaryButton
              onClick={async () => {
                if (await savePatch({ status: "draft" })) {
                  removeLocalPublishedEvent(event.id);
                  setSheet(null);
                }
              }}
            >
              Confirm unpublish
            </PrimaryButton>
            <SecondaryButton onClick={() => setSheet(null)}>Cancel</SecondaryButton>
          </div>
        </Sheet>
      )}

      {sheet === "delete" && (
        <Sheet title="Delete draft?" onClose={() => setSheet(null)}>
          <div className="space-y-4">
            <p className="text-[16px]">This permanently deletes this unpublished draft.</p>
            <PrimaryButton
              className="bg-destructive"
              onClick={async () => {
                const { error: delErr } = await supabase
                  .from("organiser_events")
                  .delete()
                  .eq("id", event.id);
                if (delErr) {
                  setError(dbError(delErr.message));
                  return;
                }
                setSheet(null);
                await ctx.reload();
                ctx.go("events");
              }}
            >
              Delete draft
            </PrimaryButton>
            <SecondaryButton onClick={() => setSheet(null)}>Cancel</SecondaryButton>
          </div>
        </Sheet>
      )}
    </div>
  );
}
