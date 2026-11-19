import { useEffect, useRef, useState, type FormEvent } from "react";
import {
  ArrowDown,
  ArrowLeft,
  ArrowUp,
  Globe,
  Lock,
  MapPin,
  Palette,
  Plus,
  RotateCw,
  Trash2,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import type { Database, Json } from "@/integrations/supabase/types";
import { dbError, signedUrl, uploadOwnFile, type OrgEvent } from "@/lib/organiser/data";
import {
  getOrganiserEventExtras,
  saveOrganiserEventExtras,
  type PublishedMapCalibration,
} from "@/lib/organiser/cloud-extensions";
import {
  readStoredMapCalibration,
  readStoredSitePlanZoomUrl,
  removeLocalPublishedEvent,
  saveLocalPublishedEvent,
  saveStoredMapCalibration,
  saveStoredSitePlanZoomUrl,
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
import {
  buildDefaultTemplateConfig,
  defaultTemplateIdForEventType,
  EVENT_TEMPLATES,
  LAYOUT_FAMILY_META,
  PALETTE_PRESET_META,
  readStoredTemplateConfig,
  saveStoredTemplateConfig,
  switchTemplatePreservingData,
  type EventTemplateConfig,
} from "@/lib/templates/event-templates";
import { Sheet } from "@/components/companion/Sheet";
import {
  Chevron,
  PrimaryButton,
  RowText,
  SecondaryButton,
  Section,
} from "@/components/companion/ui";
import { cn } from "@/lib/utils";
import type { OrgCtx } from "./OrganiserApp";
import { TemplateEditor } from "./TemplateEditor";

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

type EditorTab = "setup" | "template";

export function EventReview({ ctx, event }: { ctx: OrgCtx; event: OrgEvent }) {
  const [editorTab, setEditorTab] = useState<EditorTab>("setup");
  const [sheet, setSheet] = useState<ReviewSheet>(null);
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const savingRef = useRef(false);
  const [error, setError] = useState("");
  const [sitePlanUrl, setSitePlanUrl] = useState<string | null>(null);

  const [name, setName] = useState(event.name);
  const [eventType, setEventType] = useState<EventType>(
    (EVENT_TYPES as readonly string[]).includes(event.event_type)
      ? (event.event_type as EventType)
      : "festival",
  );
  const [templateConfig, setTemplateConfig] = useState<EventTemplateConfig>(
    () => readStoredTemplateConfig(event.id) ?? buildDefaultTemplateConfig(event.event_type),
  );
  const [templateSaving, setTemplateSaving] = useState(false);
  const [templateSaveNotice, setTemplateSaveNotice] = useState("");
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
  const [calVersion, setCalVersion] = useState<number>(
    () => readStoredMapCalibration(event.id)?.version ?? 0,
  );
  const [calStatus, setCalStatus] = useState("");
  const [calBusy, setCalBusy] = useState(false);
  const [barItems, setBarItems] = useState<BarDrinkItem[]>(
    () => readOrganiserBarMenus(event.id)[0]?.items ?? [],
  );
  const [barPaymentNote, setBarPaymentNote] = useState(
    () =>
      readOrganiserBarMenus(event.id)[0]?.paymentNote ?? "Cashless & card accepted at event bars.",
  );
  const [barStatus, setBarStatus] = useState("");
  const [barBusy, setBarBusy] = useState(false);
  const [newDrinkName, setNewDrinkName] = useState("");
  const [newDrinkCat, setNewDrinkCat] = useState<DrinkCategory>("Beer");
  const [newDrinkPrice, setNewDrinkPrice] = useState("");

  useEffect(() => {
    let active = true;
    const resolvedType: EventType = (EVENT_TYPES as readonly string[]).includes(event.event_type)
      ? (event.event_type as EventType)
      : "festival";
    setName(event.name);
    setEventType(resolvedType);
    const localTpl = readStoredTemplateConfig(event.id);
    setTemplateConfig(localTpl ?? buildDefaultTemplateConfig(resolvedType));
    setTemplateSaveNotice("");
    setStartDate(event.start_date ?? "");
    setEndDate(event.end_date ?? "");
    setVenue(event.venue);
    setGatesOpen(event.gates_open);
    setEntryRules(event.entry_rules);
    setProgram(parseProgram(event.program));
    setZones(parseZones(event.zones));
    const localCal = readStoredMapCalibration(event.id);
    setCalVersion(localCal?.version ?? 0);
    setCalRefs(
      localCal?.refs ?? [
        { x: 20, y: 60, lat: -22.821, lng: 14.539 },
        { x: 80, y: 60, lat: -22.821, lng: 14.544 },
        { x: 50, y: 20, lat: -22.818, lng: 14.5415 },
      ],
    );
    setBarItems(readOrganiserBarMenus(event.id)[0]?.items ?? []);
    setBarPaymentNote(
      readOrganiserBarMenus(event.id)[0]?.paymentNote ?? "Cashless & card accepted at event bars.",
    );
    setBarStatus("");
    void getOrganiserEventExtras(event.id).then((extras) => {
      if (!active || !extras) return;
      if (extras.mapCalibration) {
        setCalRefs(extras.mapCalibration.refs);
        setCalVersion(extras.mapCalibration.version);
        saveStoredMapCalibration(event.id, extras.mapCalibration);
      }
      if (extras.barMenus.length > 0) {
        setBarItems(extras.barMenus[0]!.items);
        setBarPaymentNote(
          extras.barMenus[0]!.paymentNote || "Cashless & card accepted at event bars.",
        );
        saveOrganiserBarMenus(event.id, extras.barMenus);
      }
      if (extras.templateConfig) {
        setTemplateConfig(extras.templateConfig);
        saveStoredTemplateConfig(event.id, extras.templateConfig);
      }
    });
    return () => {
      active = false;
    };
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
  const activeTemplateDef = EVENT_TEMPLATES[templateConfig.templateId];
  const activeAccentHex =
    templateConfig.surfaceMode === "dark"
      ? PALETTE_PRESET_META[templateConfig.palettePreset].darkHex
      : PALETTE_PRESET_META[templateConfig.palettePreset].lightHex;
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

  async function savePatch(
    patch: Database["public"]["Tables"]["organiser_events"]["Update"],
    options?: { nested?: boolean; nextTemplateConfig?: EventTemplateConfig },
  ) {
    if (!options?.nested && savingRef.current) return false;
    if (typeof navigator !== "undefined" && !navigator.onLine) {
      setSaveState("error");
      setError("You’re offline. Connect to save changes.");
      return false;
    }
    if (!options?.nested) savingRef.current = true;
    setSaveState("saving");
    setError("");
    const activeTpl = options?.nextTemplateConfig ?? templateConfig;
    try {
      const { error: updErr } = await supabase
        .from("organiser_events")
        .update(patch)
        .eq("id", event.id);
      if (updErr) {
        setSaveState("error");
        setError(dbError(updErr.message));
        return false;
      }
      if (event.status === "published" && patch.status !== "draft") {
        saveLocalPublishedEvent({
          id: event.id,
          eventType: (patch.event_type as EventType | undefined) ?? eventType,
          name: (typeof patch.name === "string" ? patch.name : name).trim(),
          startDate:
            patch.start_date !== undefined ? (patch.start_date ?? null) : startDate || null,
          endDate: patch.end_date !== undefined ? (patch.end_date ?? null) : endDate || null,
          venue: (typeof patch.venue === "string" ? patch.venue : venue).trim(),
          gatesOpen: (typeof patch.gates_open === "string" ? patch.gates_open : gatesOpen).trim(),
          entryRules: (typeof patch.entry_rules === "string"
            ? patch.entry_rules
            : entryRules
          ).trim(),
          program: patch.program !== undefined ? parseProgram(patch.program) : program,
          zones: patch.zones !== undefined ? parseZones(patch.zones) : zones,
          sitePlanPath:
            patch.site_plan_path !== undefined ? patch.site_plan_path : event.site_plan_path,
          sitePlanUrl,
          sitePlanZoomUrl: readStoredSitePlanZoomUrl(event.id),
          barMenus: readOrganiserBarMenus(event.id),
          mapCalibration: (() => {
            const c = readStoredMapCalibration(event.id);
            return c ? { ...c, version: c.version ?? 1 } : null;
          })(),
          templateConfig: activeTpl,
          visibility: activeTpl.visibility,
          publishedAt: new Date().toISOString(),
        });
      }
      setSaveState("saved");
      await ctx.reload();
      return true;
    } finally {
      if (!options?.nested) savingRef.current = false;
    }
  }

  async function saveTemplate(next: EventTemplateConfig) {
    if (templateSaving) return;
    setTemplateSaving(true);
    setTemplateSaveNotice("");
    const nextLegacyType = EVENT_TEMPLATES[next.templateId].legacyEventType;
    setTemplateConfig(next);
    setEventType(nextLegacyType);
    saveStoredTemplateConfig(event.id, next);
    try {
      await savePatch({ event_type: nextLegacyType }, { nextTemplateConfig: next });
      const cloud = await saveOrganiserEventExtras({
        eventId: event.id,
        templateConfig: next,
        visibility: next.visibility,
      });
      if (cloud.ok) {
        setTemplateSaveNotice(
          `Saved “${EVENT_TEMPLATES[next.templateId].name}” (${LAYOUT_FAMILY_META[next.layoutFamily].name}) and synced to Cloud.`,
        );
      } else {
        setTemplateSaveNotice(
          `Saved “${EVENT_TEMPLATES[next.templateId].name}” on this device — apply the Cloud SQL update to share template styling across phones.`,
        );
      }
    } finally {
      setTemplateSaving(false);
    }
  }

  async function saveBasics(e: FormEvent) {
    e.preventDefault();
    let nextTpl = templateConfig;
    if (EVENT_TEMPLATES[templateConfig.templateId].legacyEventType !== eventType) {
      nextTpl = switchTemplatePreservingData(
        templateConfig,
        defaultTemplateIdForEventType(eventType),
      );
      setTemplateConfig(nextTpl);
      saveStoredTemplateConfig(event.id, nextTpl);
      void saveOrganiserEventExtras({
        eventId: event.id,
        templateConfig: nextTpl,
        visibility: nextTpl.visibility,
      });
    }
    if (
      await savePatch(
        {
          name: name.trim(),
          event_type: eventType,
          start_date: startDate || null,
          end_date: endDate || null,
          venue: venue.trim(),
          gates_open: gatesOpen.trim(),
          entry_rules: entryRules.trim(),
        },
        { nextTemplateConfig: nextTpl },
      )
    )
      setSheet(null);
  }

  async function uploadSitePlan(file: File) {
    if (savingRef.current) return;
    const problem = validateImageFile(file);
    if (problem) {
      setError(problem);
      return;
    }
    savingRef.current = true;
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
        void uploadOwnFile(ctx.userId, optimized.zoomFile, "site-plans-zoom")
          .then((zoomPath) => signedUrl(zoomPath))
          .then((zoomSigned) => {
            if (zoomSigned) saveStoredSitePlanZoomUrl(event.id, zoomSigned);
          })
          .catch(() => {});
      } else {
        saveStoredSitePlanZoomUrl(event.id, null);
      }
      await savePatch({ site_plan_path: path }, { nested: true });
      setSitePlanRotation(0);
    } catch (err) {
      setSaveState("error");
      setError(err instanceof Error ? err.message : "Couldn’t upload site plan.");
    } finally {
      savingRef.current = false;
      setUploadProgress(null);
    }
  }

  async function duplicateEdition() {
    if (savingRef.current) return;
    savingRef.current = true;
    setSaveState("saving");
    setError("");
    try {
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
      saveStoredTemplateConfig(data.id, templateConfig);
      setSaveState("saved");
      await ctx.reload();
      ctx.go("events", data.id);
    } finally {
      savingRef.current = false;
    }
  }

  function exportProgramJson() {
    const payload = {
      name: name || "Untitled event",
      eventType,
      templateConfig,
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
        className="flex min-h-11 items-center gap-1.5 text-[15px] font-semibold text-primary"
        onClick={() => ctx.go("events")}
      >
        <ArrowLeft size={17} aria-hidden /> All events
      </button>

      <div className="mt-2 flex flex-wrap items-start justify-between gap-3 border-b border-separator pb-4">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="eb-kicker text-muted-foreground">
              {event.status} · {eventType}
            </p>
            <span className="inline-flex items-center gap-1 rounded-full border border-border bg-secondary px-2 py-0.5 text-[11px] font-semibold text-foreground">
              <span
                aria-hidden
                className="size-2 rounded-full"
                style={{ backgroundColor: activeAccentHex }}
              />
              {activeTemplateDef.name}
            </span>
            <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-muted-foreground">
              {templateConfig.visibility === "private_invite" ? (
                <>
                  <Lock size={11} aria-hidden /> Private invite
                </>
              ) : (
                <>
                  <Globe size={11} aria-hidden /> Public
                </>
              )}
            </span>
          </div>
          <h1 className="eb-page-title mt-1 break-words">{name || "Untitled draft"}</h1>
        </div>
        {saveState !== "idle" && (
          <p role="status" className="pt-1 text-[14px] font-medium text-muted-foreground">
            {saveState === "saving"
              ? "Saving…"
              : saveState === "saved"
                ? "Saved"
                : "Needs attention"}
          </p>
        )}
      </div>

      {/* Editorial view switcher: Setup & Publish | Template & Preview */}
      <div
        role="tablist"
        aria-label="Event studio views"
        className="mt-3 flex items-center gap-6 border-b border-separator"
      >
        <button
          type="button"
          role="tab"
          aria-selected={editorTab === "setup"}
          onClick={() => setEditorTab("setup")}
          className={cn(
            "relative min-h-11 py-2 text-[15px] font-semibold transition-colors",
            editorTab === "setup"
              ? "text-foreground"
              : "text-muted-foreground hover:text-foreground",
          )}
        >
          Setup &amp; Publish
          {editorTab === "setup" && (
            <span
              aria-hidden
              className="absolute inset-x-0 -bottom-px h-0.5 rounded-full bg-primary"
            />
          )}
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={editorTab === "template"}
          onClick={() => setEditorTab("template")}
          className={cn(
            "relative inline-flex min-h-11 items-center gap-1.5 py-2 text-[15px] font-semibold transition-colors",
            editorTab === "template"
              ? "text-foreground"
              : "text-muted-foreground hover:text-foreground",
          )}
        >
          <Palette size={15} aria-hidden />
          Template &amp; Preview
          {editorTab === "template" && (
            <span
              aria-hidden
              className="absolute inset-x-0 -bottom-px h-0.5 rounded-full bg-primary"
            />
          )}
        </button>
      </div>

      {event.extraction_missing.length > 0 && (
        <p className="mt-4 rounded-xl border border-border bg-secondary px-4 py-3 text-[14px] text-muted-foreground">
          Not found in PDF: {event.extraction_missing.join(", ")}. Tap any row below to add them.
        </p>
      )}

      {error && (
        <p
          role="alert"
          className="mt-4 rounded-xl border border-warning/40 bg-warning-soft px-4 py-3 text-[15px]"
        >
          {error}
        </p>
      )}

      {editorTab === "template" ? (
        <div className="mt-5">
          <TemplateEditor
            eventId={event.id}
            userId={ctx.userId}
            eventName={name}
            startDate={startDate}
            endDate={endDate}
            venue={venue}
            gatesOpen={gatesOpen}
            entryRules={entryRules}
            program={program}
            zones={zones}
            sitePlanUrl={sitePlanUrl}
            config={templateConfig}
            onChange={(next) => {
              setTemplateConfig(next);
              setEventType(EVENT_TEMPLATES[next.templateId].legacyEventType);
            }}
            onSave={saveTemplate}
            saving={templateSaving}
            saveNotice={templateSaveNotice}
          />
        </div>
      ) : (
        <>
          {/* Quick launch banner into Visual Template Editor */}
          <div className="eb-panel mt-5 flex flex-wrap items-center justify-between gap-3 p-4">
            <div className="min-w-0 flex-1">
              <p className="eb-kicker text-primary">Attendee Experience Template</p>
              <p className="mt-0.5 text-[16px] font-bold">
                {activeTemplateDef.name} · {LAYOUT_FAMILY_META[templateConfig.layoutFamily].name}{" "}
                layout
              </p>
              <p className="mt-0.5 text-[13px] text-muted-foreground">
                {templateConfig.surfaceMode === "dark" ? "Dark obsidian" : "Light paper"} surface ·{" "}
                {templateConfig.enabledModules.length} active modules ·{" "}
                {templateConfig.visibility === "private_invite"
                  ? "Private invite-only (hidden from Discover)"
                  : "Public Discover listing"}
              </p>
            </div>
            <SecondaryButton className="w-auto px-4" onClick={() => setEditorTab("template")}>
              <Palette size={15} aria-hidden /> Open Template Editor
            </SecondaryButton>
          </div>

          <Section title="Review details" id="org-review-rows">
            <div className="eb-list">
              <button
                type="button"
                className="eb-row w-full text-left"
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
                className="eb-row w-full text-left"
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
                className="eb-row w-full text-left"
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
                className="eb-row w-full text-left"
                onClick={() => setSheet("zones")}
              >
                <RowText
                  title={`Venue zones & ${terms.places.toLowerCase()}`}
                  subtitle={
                    zones.length
                      ? `${zones.length} mapped points`
                      : "Add stages, bars, gates or medics"
                  }
                />
                <Chevron />
              </button>
              <button
                type="button"
                className="eb-row w-full text-left"
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
              <div className="eb-list">
                {readinessIssues.map((issue) => (
                  <div key={issue.id} className="eb-row items-start py-3">
                    <RowText
                      title={
                        <span
                          className={
                            issue.severity === "warning"
                              ? "font-semibold text-warning"
                              : "font-medium"
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
            <div className="eb-panel space-y-3 p-4 sm:p-5">
              {event.status === "published" ? (
                <>
                  <p className="text-[15px]">
                    Marked published
                    {event.published_at ? ` on ${event.published_at.slice(0, 10)}` : ""}.{" "}
                    {templateConfig.visibility === "private_invite"
                      ? "Private invite-only link (excluded from public Discover)."
                      : "Visible in public Discover and direct event link."}
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
            <div className="eb-list">
              <button
                type="button"
                disabled={saveState === "saving"}
                className="eb-row w-full text-left disabled:opacity-50"
                onClick={() => void duplicateEdition()}
              >
                <RowText
                  title="Duplicate for next edition"
                  subtitle="Keeps template, venue, rules, zones and site plan; clears dates and program"
                />
                <Chevron />
              </button>
              <button type="button" className="eb-row w-full text-left" onClick={exportProgramJson}>
                <RowText title={`Export ${terms.program.toLowerCase()} JSON`} />
                <Chevron />
              </button>
              {event.status !== "published" && (
                <button
                  type="button"
                  className="eb-row w-full text-left text-destructive"
                  onClick={() => setSheet("delete")}
                >
                  <RowText title="Delete draft" />
                  <Chevron />
                </button>
              )}
            </div>
          </Section>
        </>
      )}

      {sheet === "basics" && (
        <Sheet title="Event basics & rules" onClose={() => setSheet(null)}>
          <form onSubmit={(e) => void saveBasics(e)} className="space-y-4">
            <label className="block text-[14px] font-semibold">
              Event name
              <input
                className="eb-field mt-1"
                maxLength={160}
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </label>
            <label className="block text-[14px] font-semibold">
              Event type
              <select
                className="eb-field mt-1"
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
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <label className="block text-[14px] font-semibold">
                Start date
                <input
                  type="date"
                  className="eb-field mt-1"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                />
              </label>
              <label className="block text-[14px] font-semibold">
                End date
                <input
                  type="date"
                  className="eb-field mt-1"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                />
              </label>
            </div>
            <label className="block text-[14px] font-semibold">
              Venue
              <input
                className="eb-field mt-1"
                maxLength={200}
                value={venue}
                onChange={(e) => setVenue(e.target.value)}
              />
            </label>
            <label className="block text-[14px] font-semibold">
              Gates open
              <input
                className="eb-field mt-1"
                maxLength={20}
                placeholder="12:00"
                value={gatesOpen}
                onChange={(e) => setGatesOpen(e.target.value)}
              />
            </label>
            <label className="block text-[14px] font-semibold">
              Entry rules
              <textarea
                rows={4}
                maxLength={2000}
                className="eb-field mt-1"
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
              <div key={idx} className="eb-panel space-y-2.5 p-3.5">
                <input
                  aria-label={`${terms.people} item ${idx + 1} name`}
                  className="eb-field"
                  value={item.title}
                  placeholder="Artist, speaker or session"
                  onChange={(e) =>
                    setProgram((prev) =>
                      prev.map((row, i) => (i === idx ? { ...row, title: e.target.value } : row)),
                    )
                  }
                />
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                  <input
                    aria-label={`Item ${idx + 1} place`}
                    className="eb-field"
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
                    className="eb-field"
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
                    className="eb-field flex-1"
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

            <div className="flex items-center justify-between rounded-xl border border-border bg-secondary px-3.5 py-2.5">
              <span className="text-[14px] font-medium">
                Rotation before upload: <strong>{sitePlanRotation}°</strong>
              </span>
              <button
                type="button"
                className="inline-flex min-h-11 items-center gap-1.5 rounded-full border border-border bg-card px-3 text-[14px] font-semibold"
                onClick={() =>
                  setSitePlanRotation(((sitePlanRotation + 90) % 360) as SitePlanRotation)
                }
              >
                <RotateCw size={15} aria-hidden /> Rotate 90°
              </button>
            </div>

            {uploadProgress && (
              <div role="status" className="eb-panel space-y-1.5 p-3">
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

            {error && (
              <p
                role="alert"
                className="rounded-xl border border-warning/40 bg-warning-soft px-3.5 py-2.5 text-[14px]"
              >
                {error}
              </p>
            )}

            <label
              className={`eb-press flex min-h-12 w-full items-center justify-center rounded-full bg-primary px-4 text-[16px] font-semibold text-primary-foreground ${
                saveState === "saving" ? "pointer-events-none opacity-50" : "cursor-pointer"
              }`}
            >
              {saveState === "saving"
                ? "Uploading site plan…"
                : sitePlanUrl
                  ? "Replace site plan"
                  : "Upload site plan"}
              <input
                type="file"
                accept={IMAGE_TYPES.join(",")}
                disabled={saveState === "saving"}
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

            {sitePlanUrl && (
              <details className="eb-panel p-3.5">
                <summary className="min-h-11 cursor-pointer content-center text-[15px] font-semibold">
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
                    <div
                      key={idx}
                      className="space-y-1.5 rounded-lg border border-border bg-secondary/60 p-2.5"
                    >
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
                      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                        <input
                          type="number"
                          step="0.0001"
                          aria-label={`Point ${idx + 1} latitude`}
                          className="eb-field"
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
                          className="eb-field"
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
                    disabled={calBusy}
                    onClick={async () => {
                      const transform = computeAffineCalibration(calRefs);
                      if (!transform) {
                        setCalStatus(
                          "Points must form a triangle (not a straight line) to solve calibration.",
                        );
                        return;
                      }
                      const nextVersion = calVersion + 1;
                      const payload: PublishedMapCalibration = {
                        version: nextVersion,
                        refs: calRefs,
                        transform,
                        updatedAt: new Date().toISOString(),
                      };
                      setCalBusy(true);
                      saveStoredMapCalibration(event.id, payload);
                      setCalVersion(nextVersion);
                      const cloud = await saveOrganiserEventExtras({
                        eventId: event.id,
                        mapCalibration: payload,
                      });
                      setCalBusy(false);
                      if (cloud.ok) {
                        setCalStatus(
                          `GPS affine calibration saved (v${nextVersion}) and published to Cloud for all attendees.`,
                        );
                      } else {
                        setCalStatus(
                          `GPS affine calibration saved on this device only (v${nextVersion}) — apply the Cloud SQL update to share across phones.`,
                        );
                      }
                    }}
                  >
                    {calBusy ? "Publishing calibration…" : "Save GPS calibration"}
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
                className="eb-field mt-1"
                maxLength={160}
                value={barPaymentNote}
                onChange={(e) => setBarPaymentNote(e.target.value)}
              />
            </label>
            {barItems.length > 0 && (
              <div className="eb-list">
                {barItems.map((drink) => (
                  <div key={drink.id} className="eb-row justify-between py-2.5">
                    <div>
                      <p className="text-[15px] font-semibold">{drink.name}</p>
                      <p className="text-[13px] text-muted-foreground">
                        {drink.category} · {drink.price ?? "Price TBC"}
                      </p>
                    </div>
                    <button
                      type="button"
                      aria-label={`Remove ${drink.name}`}
                      className="grid size-11 flex-none place-items-center text-destructive"
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
            <div className="eb-panel space-y-2.5 p-3.5">
              <input
                aria-label="Drink name"
                className="eb-field"
                placeholder="Drink name (e.g. Windhoek Lager 330ml)"
                value={newDrinkName}
                onChange={(e) => setNewDrinkName(e.target.value)}
              />
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                <select
                  aria-label="Drink category"
                  className="eb-field"
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
                  className="eb-field"
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
            {barStatus && (
              <p role="status" className="text-[13px] font-medium text-primary">
                {barStatus}
              </p>
            )}
            <PrimaryButton
              disabled={barBusy}
              onClick={async () => {
                const nextMenus = barItems.length
                  ? [
                      {
                        isSample: false,
                        paymentNote: barPaymentNote.trim(),
                        items: barItems,
                        updatedAt: new Date().toISOString(),
                      },
                    ]
                  : [];
                setBarBusy(true);
                saveOrganiserBarMenus(event.id, nextMenus);
                const cloud = await saveOrganiserEventExtras({
                  eventId: event.id,
                  barMenus: nextMenus,
                });
                setBarBusy(false);
                if (cloud.ok) {
                  setBarStatus("Bar menu published to Cloud for all attendees.");
                  setSheet(null);
                } else {
                  setBarStatus(
                    "Saved on this device only — apply the Cloud SQL update so all attendees see this bar menu.",
                  );
                  setSheet(null);
                }
              }}
            >
              {barBusy ? "Publishing bar menu…" : "Save bar menu"}
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
              <div key={idx} className="eb-panel space-y-2.5 p-3.5">
                <div className="flex gap-2">
                  <input
                    aria-label={`Zone ${idx + 1} name`}
                    className="eb-field flex-1"
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
                    className="eb-field flex-1"
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
                      className="min-h-11 rounded-full border border-border bg-secondary px-3 text-[13px] font-semibold"
                      onClick={() => setActiveZoneIndex(idx)}
                    >
                      <MapPin size={14} className="mr-1 inline" />
                      {zone.x !== null && zone.y !== null ? `${zone.x}%, ${zone.y}%` : "Set pin"}
                    </button>
                  )}
                </div>
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                  <select
                    aria-label={`Zone ${idx + 1} access tier`}
                    className="eb-field"
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
                    className="eb-field"
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
                  className="eb-field"
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
            <p className="text-[15px]">
              {templateConfig.visibility === "private_invite"
                ? "Publishing activates this private invite-only event link. It remains hidden from public Discover, Search and Calendar feeds."
                : "Publishing makes this event’s details visible to attendees in Discover and via its direct link. Confirm the event name, date and template look right."}
            </p>
            <PrimaryButton
              disabled={saveState === "saving"}
              onClick={async () => {
                if (await savePatch({ status: "published" })) {
                  saveStoredTemplateConfig(event.id, templateConfig);
                  void saveOrganiserEventExtras({
                    eventId: event.id,
                    templateConfig,
                    visibility: templateConfig.visibility,
                  });
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
                    sitePlanZoomUrl: readStoredSitePlanZoomUrl(event.id),
                    barMenus: readOrganiserBarMenus(event.id),
                    mapCalibration: (() => {
                      const c = readStoredMapCalibration(event.id);
                      return c ? { ...c, version: c.version ?? 1 } : null;
                    })(),
                    templateConfig,
                    visibility: templateConfig.visibility,
                    publishedAt: new Date().toISOString(),
                  });
                  setSheet(null);
                }
              }}
            >
              {saveState === "saving" ? "Publishing…" : "Confirm publish"}
            </PrimaryButton>
            <SecondaryButton onClick={() => setSheet(null)}>Cancel</SecondaryButton>
          </div>
        </Sheet>
      )}

      {sheet === "unpublish" && (
        <Sheet title="Unpublish event?" onClose={() => setSheet(null)}>
          <div className="space-y-4">
            <p className="text-[15px]">
              Unpublishing returns this event to draft status. Attendees keep their existing crew
              records.
            </p>
            <PrimaryButton
              disabled={saveState === "saving"}
              onClick={async () => {
                if (await savePatch({ status: "draft" })) {
                  removeLocalPublishedEvent(event.id);
                  setSheet(null);
                }
              }}
            >
              {saveState === "saving" ? "Unpublishing…" : "Confirm unpublish"}
            </PrimaryButton>
            <SecondaryButton onClick={() => setSheet(null)}>Cancel</SecondaryButton>
          </div>
        </Sheet>
      )}

      {sheet === "delete" && (
        <Sheet title="Delete draft?" onClose={() => setSheet(null)}>
          <div className="space-y-4">
            <p className="text-[15px]">This permanently deletes this unpublished draft.</p>
            <PrimaryButton
              className="bg-destructive"
              disabled={saveState === "saving"}
              onClick={async () => {
                if (savingRef.current) return;
                savingRef.current = true;
                setSaveState("saving");
                setError("");
                try {
                  const { error: delErr } = await supabase
                    .from("organiser_events")
                    .delete()
                    .eq("id", event.id);
                  if (delErr) {
                    setSaveState("error");
                    setError(dbError(delErr.message));
                    return;
                  }
                  setSheet(null);
                  await ctx.reload();
                  ctx.go("events");
                } finally {
                  savingRef.current = false;
                }
              }}
            >
              {saveState === "saving" ? "Deleting…" : "Delete draft"}
            </PrimaryButton>
            <SecondaryButton onClick={() => setSheet(null)}>Cancel</SecondaryButton>
          </div>
        </Sheet>
      )}
    </div>
  );
}
