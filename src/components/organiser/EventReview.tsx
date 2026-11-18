import { useEffect, useState, type FormEvent } from "react";
import { ArrowDown, ArrowLeft, ArrowUp, MapPin, Plus, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import type { Database, Json } from "@/integrations/supabase/types";
import { dbError, signedUrl, uploadOwnFile, type OrgEvent } from "@/lib/organiser/data";
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
  "basics" | "program" | "site-plan" | "zones" | "publish" | "unpublish" | "delete" | null;

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
    verification,
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
    try {
      const path = await uploadOwnFile(ctx.userId, file, "site-plans");
      await savePatch({ site_plan_path: path });
    } catch (err) {
      setSaveState("error");
      setError(err instanceof Error ? err.message : "Couldn’t upload site plan.");
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
                  ? "Uploaded — tap to view or replace"
                  : "Required before publishing"
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
        </div>
      </Section>

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
                <option value="conference">Conference (Agenda / Speakers / Rooms)</option>
                <option value="corporate">Corporate (Program / Presenters / Rooms)</option>
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
                  { title: "", place: "", time: "", status: "scheduled" },
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
              <img
                src={sitePlanUrl}
                alt="Uploaded event site plan"
                className="w-full rounded-xl border border-border object-contain"
              />
            ) : (
              <p className="text-[15px] text-muted-foreground">
                No site plan uploaded yet. Upload a JPG, PNG or WebP map before publishing.
              </p>
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
              </div>
            ))}

            <SecondaryButton
              onClick={() =>
                setZones((prev) => [...prev, { name: "", type: "stage", x: null, y: null }])
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
                if (await savePatch({ status: "published" })) setSheet(null);
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
                if (await savePatch({ status: "draft" })) setSheet(null);
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
