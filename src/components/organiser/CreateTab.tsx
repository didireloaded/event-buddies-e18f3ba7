import { useEffect, useRef, useState, type FormEvent } from "react";
import { Check, CheckCircle2, CircleDashed, FileText, Link2, Sparkles } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { dbError, uploadOwnFile } from "@/lib/organiser/data";
import { extractEventFromPdf } from "@/lib/organiser/extract.functions";
import { getTicketProviderName } from "@/lib/attendee/tickets";
import { EVENT_TYPES, validatePdf, type EventType } from "@/lib/organiser/schema";
import {
  buildDefaultTemplateConfig,
  defaultTemplateIdForEventType,
  EVENT_TEMPLATE_LIST,
  EVENT_TEMPLATES,
  LAYOUT_FAMILIES,
  LAYOUT_FAMILY_META,
  PALETTE_PRESET_META,
  saveStoredTemplateConfig,
  type EventTemplateId,
  type LayoutFamily,
} from "@/lib/templates/event-templates";
import { PrimaryButton, SecondaryButton, Section } from "@/components/companion/ui";
import { cn } from "@/lib/utils";
import type { OrgCtx } from "./OrganiserApp";

type Step = "idle" | "draft" | "upload" | "extract" | "done" | "error";

const CHECKLIST = [
  { key: "draft", label: "Create private draft" },
  { key: "upload", label: "Upload PDF document" },
  { key: "extract", label: "Read printed event facts" },
] as const;

export function CreateTab({ ctx }: { ctx: OrgCtx }) {
  const [step, setStep] = useState<Step>("idle");
  const [fileName, setFileName] = useState("");
  const [error, setError] = useState("");
  const [createdId, setCreatedId] = useState<string | null>(null);
  const [missing, setMissing] = useState<string[]>([]);
  const [familyFilter, setFamilyFilter] = useState<LayoutFamily | "all">("all");
  const [selectedTemplateId, setSelectedTemplateId] = useState<EventTemplateId>("music_festival");
  const [manualType, setManualType] = useState<EventType>("festival");
  const [manualName, setManualName] = useState("");
  const [manualDate, setManualDate] = useState("");
  const [manualVenue, setManualVenue] = useState("");
  const [externalUrl, setExternalUrl] = useState("");
  const [manualBusy, setManualBusy] = useState(false);
  const cancelledRef = useRef(false);
  const mountedRef = useRef(true);
  const offline = typeof navigator !== "undefined" && !navigator.onLine;

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      cancelledRef.current = true;
    };
  }, []);

  function pickTemplate(tplId: EventTemplateId) {
    setSelectedTemplateId(tplId);
    setManualType(EVENT_TEMPLATES[tplId].legacyEventType);
  }

  function handleLegacyTypeSelect(nextType: EventType) {
    setManualType(nextType);
    setSelectedTemplateId(defaultTemplateIdForEventType(nextType));
  }

  async function processPdf(file: File) {
    const problem = validatePdf(file);
    if (problem) {
      setError(problem);
      setStep("error");
      return;
    }
    if (offline) {
      setError("You’re offline. Connect before uploading a PDF.");
      setStep("error");
      return;
    }

    cancelledRef.current = false;
    setFileName(file.name);
    setError("");
    setMissing([]);
    setCreatedId(null);

    try {
      setStep("draft");
      const { data: inserted, error: insErr } = await supabase
        .from("organiser_events")
        .insert({
          owner_id: ctx.userId,
          status: "draft",
          source_label: file.name.slice(0, 120),
        })
        .select("id")
        .single();
      if (insErr || !inserted) throw new Error(dbError(insErr?.message));
      if (cancelledRef.current || !mountedRef.current) return;
      setCreatedId(inserted.id);

      setStep("upload");
      const path = await uploadOwnFile(ctx.userId, file, "pdfs");
      const { error: pathErr } = await supabase
        .from("organiser_events")
        .update({ source_pdf_path: path })
        .eq("id", inserted.id);
      if (pathErr) throw new Error(dbError(pathErr.message));
      if (cancelledRef.current || !mountedRef.current) return;

      setStep("extract");
      const result = await extractEventFromPdf({ data: { eventId: inserted.id } });
      if (cancelledRef.current || !mountedRef.current) return;
      if (!result.ok) {
        setError(`${result.error} Your draft was kept so you can fill details manually.`);
        setStep("error");
        await ctx.reload();
        return;
      }

      setMissing(result.missing);
      setStep("done");
      await ctx.reload();
    } catch (err) {
      if (cancelledRef.current || !mountedRef.current) return;
      setError(err instanceof Error ? err.message : "Couldn’t upload this PDF. Try again.");
      setStep("error");
    }
  }

  async function createGuidedDraft(e: FormEvent) {
    e.preventDefault();
    if (busy || manualBusy) return;
    if (offline) {
      setError("You’re offline. Connect to create a draft.");
      return;
    }
    if (!manualName.trim()) {
      setError("Enter an event name to create a draft.");
      return;
    }
    setError("");
    setManualBusy(true);
    try {
      const chosenDef = EVENT_TEMPLATES[selectedTemplateId];
      const { data, error: insErr } = await supabase
        .from("organiser_events")
        .insert({
          owner_id: ctx.userId,
          status: "draft",
          event_type: chosenDef.legacyEventType,
          name: manualName.trim().slice(0, 160),
          start_date: manualDate || null,
          venue: manualVenue.trim().slice(0, 200),
        })
        .select("id")
        .single();
      if (insErr || !data) {
        setError(dbError(insErr?.message));
        return;
      }
      saveStoredTemplateConfig(data.id, buildDefaultTemplateConfig(selectedTemplateId));
      await ctx.reload();
      ctx.go("events", data.id);
    } finally {
      setManualBusy(false);
    }
  }

  async function importExternalUrlDraft(e: FormEvent) {
    e.preventDefault();
    if (busy || manualBusy) return;
    if (offline) {
      setError("You’re offline. Connect to save a reviewed import draft.");
      return;
    }
    let parsedUrl: URL;
    try {
      parsedUrl = new URL(externalUrl.trim());
      if (parsedUrl.protocol !== "https:" && parsedUrl.protocol !== "http:") {
        throw new Error("Invalid protocol");
      }
    } catch {
      setError("Enter a valid https:// event listing URL (e.g. Webtickets or Howler).");
      return;
    }
    const cleanSource = `${parsedUrl.origin}${parsedUrl.pathname}`.slice(0, 120);
    if (ctx.events.some((ev) => ev.source_label === cleanSource)) {
      setError("A draft with this external listing URL already exists in your workspace.");
      return;
    }
    const provider = getTicketProviderName(parsedUrl.toString());
    const slugPart = parsedUrl.pathname
      .split("/")
      .filter(Boolean)
      .pop()
      ?.replace(/[-_]+/g, " ")
      .trim();
    const guessedTitle = slugPart
      ? slugPart.replace(/\b\w/g, (ch) => ch.toUpperCase()).slice(0, 120)
      : `${provider} Event Draft`;

    setError("");
    setManualBusy(true);
    try {
      const { data, error: insErr } = await supabase
        .from("organiser_events")
        .insert({
          owner_id: ctx.userId,
          status: "imported",
          event_type: manualType,
          name: guessedTitle,
          source_label: cleanSource,
          extraction_missing: ["Date", "Venue", "Gates open", "Entry rules", "Program"],
        })
        .select("id")
        .single();
      if (insErr || !data) {
        setError(dbError(insErr?.message));
        return;
      }
      saveStoredTemplateConfig(data.id, buildDefaultTemplateConfig(selectedTemplateId));
      setExternalUrl("");
      await ctx.reload();
      ctx.go("events", data.id);
    } finally {
      setManualBusy(false);
    }
  }

  async function createBlankDraft() {
    if (busy || manualBusy) return;
    if (offline) {
      setError("You’re offline. Connect to create a draft.");
      return;
    }
    setError("");
    setManualBusy(true);
    try {
      const { data, error: insErr } = await supabase
        .from("organiser_events")
        .insert({ owner_id: ctx.userId, status: "draft" })
        .select("id")
        .single();
      if (insErr || !data) {
        setError(dbError(insErr?.message));
        return;
      }
      saveStoredTemplateConfig(data.id, buildDefaultTemplateConfig("custom_event"));
      await ctx.reload();
      ctx.go("events", data.id);
    } finally {
      setManualBusy(false);
    }
  }

  const busy = step === "draft" || step === "upload" || step === "extract";
  const order = ["draft", "upload", "extract", "done"];
  const visibleTemplates =
    familyFilter === "all"
      ? EVENT_TEMPLATE_LIST
      : EVENT_TEMPLATE_LIST.filter((t) => t.layoutFamily === familyFilter);
  const chosenDef = EVENT_TEMPLATES[selectedTemplateId];

  return (
    <div className="py-4">
      <p className="eb-kicker text-primary">Organiser Studio</p>
      <h1 className="eb-page-title mt-0.5">Create event</h1>
      <p className="mt-1.5 max-w-2xl text-[15px] text-muted-foreground">
        Start from one of 12 purpose-built event templates, extract details from an event PDF, or
        record an official ticket listing URL. Drafts remain private until reviewed and published.
      </p>

      {/* 1. Upload PDF (kept first file input so automated tests & quick import work cleanly) */}
      <Section title="Import from printed PDF" id="org-create-pdf">
        <div className="eb-panel space-y-4 p-4 sm:p-5">
          <div className="flex items-start gap-3">
            <FileText size={21} className="mt-0.5 flex-none text-primary" aria-hidden />
            <div className="min-w-0">
              <p className="text-[16px] font-bold">Lineup, programme or info sheet</p>
              <p className="text-[14px] text-muted-foreground">
                PDF only, up to 50 MB. Missing fields stay marked “Not found” for human review.
              </p>
            </div>
          </div>

          {offline && (
            <p role="status" className="text-[14px] text-muted-foreground">
              You’re offline. PDF upload requires a connection.
            </p>
          )}

          <div className="flex flex-wrap gap-2.5">
            <label
              className={`eb-press inline-flex min-h-12 flex-1 items-center justify-center rounded-full bg-primary px-5 text-[15px] font-semibold text-primary-foreground ${
                busy || offline ? "pointer-events-none opacity-50" : "cursor-pointer"
              }`}
            >
              {busy ? "Working on PDF…" : "Choose PDF file"}
              <input
                type="file"
                accept="application/pdf,.pdf"
                disabled={busy || offline}
                className="sr-only"
                onChange={(e) => {
                  const chosen = e.currentTarget.files?.[0];
                  e.currentTarget.value = "";
                  if (chosen) void processPdf(chosen);
                }}
              />
            </label>
            <SecondaryButton
              className="w-auto px-5"
              disabled={busy || manualBusy || offline}
              onClick={() => void createBlankDraft()}
            >
              {manualBusy ? "Creating…" : "Blank custom draft"}
            </SecondaryButton>
          </div>

          {fileName && step !== "idle" && (
            <div className="space-y-2 border-t border-separator pt-3">
              <p className="truncate text-[14px] font-semibold">{fileName}</p>
              <ul className="space-y-1.5 text-[14px]">
                {CHECKLIST.map((item) => {
                  const done = order.indexOf(step) > order.indexOf(item.key) || step === "done";
                  const active = step === item.key;
                  return (
                    <li key={item.key} className="flex items-center gap-2">
                      {done ? (
                        <CheckCircle2 size={16} className="text-success" aria-hidden />
                      ) : (
                        <CircleDashed
                          size={16}
                          className={active ? "text-primary" : "text-muted-foreground"}
                          aria-hidden
                        />
                      )}
                      <span className={active ? "font-semibold" : "text-muted-foreground"}>
                        {item.label}
                      </span>
                    </li>
                  );
                })}
              </ul>
              {busy && (
                <button
                  type="button"
                  className="min-h-11 text-[14px] font-semibold text-destructive"
                  onClick={() => {
                    cancelledRef.current = true;
                    setStep("idle");
                    setError(
                      "PDF upload cancelled. Reopen Drafts if the draft was already created.",
                    );
                  }}
                >
                  Cancel
                </button>
              )}
            </div>
          )}

          {step === "done" && createdId && (
            <div role="status" className="space-y-3 border-t border-separator pt-3">
              <p className="text-[15px] font-semibold">Draft ready for human review.</p>
              {missing.length > 0 && (
                <p className="text-[14px] text-muted-foreground">
                  Not found in document: {missing.join(", ")}.
                </p>
              )}
              <PrimaryButton onClick={() => ctx.go("events", createdId)}>
                Review extracted draft
              </PrimaryButton>
            </div>
          )}

          {error && (
            <div
              role="alert"
              className="space-y-2 rounded-xl border border-warning/40 bg-warning-soft p-3 text-[14px]"
            >
              <p>{error}</p>
              {createdId && (
                <button
                  type="button"
                  className="min-h-11 font-semibold text-primary"
                  onClick={() => ctx.go("events", createdId)}
                >
                  Open saved draft
                </button>
              )}
            </div>
          )}
        </div>
      </Section>

      {/* 2. Visual 12-Template Event Studio Setup */}
      <Section title="Choose a template & create draft" id="org-create-manual">
        <div className="space-y-4">
          <div
            className="scrollbar-none flex gap-2 overflow-x-auto py-0.5"
            role="group"
            aria-label="Filter templates by layout family"
          >
            <button
              type="button"
              className="eb-chip text-[13px]"
              aria-pressed={familyFilter === "all"}
              onClick={() => setFamilyFilter("all")}
            >
              All 12 templates
            </button>
            {LAYOUT_FAMILIES.map((fam) => (
              <button
                key={fam}
                type="button"
                className="eb-chip text-[13px]"
                aria-pressed={familyFilter === fam}
                onClick={() => setFamilyFilter(fam)}
              >
                {LAYOUT_FAMILY_META[fam].name}
              </button>
            ))}
          </div>

          <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
            {visibleTemplates.map((tpl) => {
              const selected = selectedTemplateId === tpl.id;
              const accent =
                tpl.defaultSurface === "dark"
                  ? PALETTE_PRESET_META[tpl.defaultPalette].darkHex
                  : PALETTE_PRESET_META[tpl.defaultPalette].lightHex;
              return (
                <button
                  key={tpl.id}
                  type="button"
                  aria-pressed={selected}
                  onClick={() => pickTemplate(tpl.id)}
                  className={cn(
                    "eb-press flex flex-col justify-between rounded-xl border p-3.5 text-left transition-colors",
                    selected
                      ? "border-primary bg-favorite-soft"
                      : "border-border bg-card hover:border-foreground/30",
                  )}
                >
                  <div>
                    <div className="flex items-center justify-between gap-2">
                      <span className="inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                        <span
                          aria-hidden
                          className="size-2.5 rounded-full"
                          style={{ backgroundColor: accent }}
                        />
                        {LAYOUT_FAMILY_META[tpl.layoutFamily].name}
                      </span>
                      {selected && (
                        <span className="grid size-5 place-items-center rounded-full bg-primary text-primary-foreground">
                          <Check size={12} aria-hidden />
                        </span>
                      )}
                    </div>
                    <p className="mt-1 text-[15px] font-bold text-foreground">{tpl.name}</p>
                    <p className="mt-1 text-[12px] leading-snug text-muted-foreground">
                      {tpl.description}
                    </p>
                  </div>
                  <p className="mt-2.5 border-t border-separator pt-2 text-[11px] font-semibold text-primary">
                    {tpl.terms.programLabel} · {tpl.terms.peopleLabel} ·{" "}
                    {tpl.defaultVisibility === "private_invite" ? "Private invite" : "Public"}
                  </p>
                </button>
              );
            })}
          </div>

          <form
            onSubmit={(e) => void createGuidedDraft(e)}
            className="eb-panel space-y-3.5 p-4 sm:p-5"
          >
            <div className="flex items-start gap-2.5">
              <Sparkles size={19} className="mt-0.5 flex-none text-primary" aria-hidden />
              <div>
                <p className="text-[15px] font-bold">
                  Selected: {chosenDef.name} ({LAYOUT_FAMILY_META[chosenDef.layoutFamily].name}{" "}
                  layout)
                </p>
                <p className="text-[13px] text-muted-foreground">{chosenDef.visualNotes}</p>
              </div>
            </div>

            <label className="block text-[14px] font-semibold">
              Event template
              <select
                className="eb-field mt-1"
                value={manualType}
                onChange={(e) => handleLegacyTypeSelect(e.target.value as EventType)}
              >
                {EVENT_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {t.charAt(0).toUpperCase() + t.slice(1)}
                  </option>
                ))}
              </select>
            </label>

            <label className="block text-[14px] font-semibold">
              Event name
              <input
                className="eb-field mt-1"
                maxLength={160}
                placeholder="e.g. Windhoek Tech Summit 2026"
                value={manualName}
                onChange={(e) => setManualName(e.target.value)}
              />
            </label>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <label className="block text-[14px] font-semibold">
                Start date
                <input
                  type="date"
                  className="eb-field mt-1"
                  value={manualDate}
                  onChange={(e) => setManualDate(e.target.value)}
                />
              </label>
              <label className="block text-[14px] font-semibold">
                Venue &amp; city
                <input
                  className="eb-field mt-1"
                  maxLength={200}
                  placeholder="Safari Court, Windhoek"
                  value={manualVenue}
                  onChange={(e) => setManualVenue(e.target.value)}
                />
              </label>
            </div>

            <PrimaryButton type="submit" disabled={busy || manualBusy || offline}>
              {manualBusy ? "Creating draft…" : "Create manual draft"}
            </PrimaryButton>
          </form>
        </div>
      </Section>

      {/* 3. External URL Reviewed Import */}
      <Section title="Import from external listing URL" id="org-create-claim">
        <div className="eb-panel space-y-3 p-4 sm:p-5">
          <div className="flex items-start gap-3">
            <Link2 size={19} className="mt-0.5 flex-none text-primary" aria-hidden />
            <div>
              <p className="text-[15px] font-bold">Partner event feeds unavailable</p>
              <p className="text-[14px] text-muted-foreground">
                Authorized automated partner feeds for Webtickets, What’s On Namibia and All Things
                Swakopmund aren’t connected yet. Record an official listing URL below to start a
                reviewed draft with duplicate protection — pages are never scraped without
                authorisation.
              </p>
            </div>
          </div>
          <form onSubmit={(e) => void importExternalUrlDraft(e)} className="space-y-3 pt-1">
            <label className="block text-[14px] font-semibold">
              Official ticket or event listing URL
              <input
                type="url"
                className="eb-field mt-1"
                placeholder="https://www.webtickets.co.za/..."
                value={externalUrl}
                onChange={(e) => setExternalUrl(e.target.value)}
              />
            </label>
            <SecondaryButton
              type="submit"
              disabled={busy || manualBusy || offline || !externalUrl.trim()}
            >
              Create reviewed draft from URL
            </SecondaryButton>
          </form>
        </div>
      </Section>
    </div>
  );
}
