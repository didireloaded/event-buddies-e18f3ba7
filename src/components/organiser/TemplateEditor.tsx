import { useMemo, useState } from "react";
import {
  ArrowDown,
  ArrowUp,
  Camera,
  Check,
  Eye,
  Globe,
  Lock,
  MapPin,
  Monitor,
  Palette,
  Smartphone,
  Sparkles,
  Tablet,
  Ticket,
  Trash2,
  Type,
  Users,
} from "lucide-react";
import {
  buildTemplateCssVars,
  EVENT_MODULES,
  EVENT_TEMPLATE_LIST,
  EVENT_TEMPLATES,
  FONT_PRESET_META,
  FONT_PRESETS,
  LAYOUT_FAMILIES,
  LAYOUT_FAMILY_META,
  MODULE_META,
  PALETTE_PRESET_META,
  PALETTE_PRESETS,
  switchTemplatePreservingData,
  type DisplayFontPreset,
  type EventModuleId,
  type EventTemplateConfig,
  type EventVisibility,
  type LayoutFamily,
  type TemplateHomeSectionId,
} from "@/lib/templates/event-templates";
import { organiserEventToDemoData } from "@/lib/organiser/event-adapter";
import {
  IMAGE_TYPES,
  validateImageFile,
  type ProgramItem,
  type ZoneItem,
} from "@/lib/organiser/schema";
import { uploadOwnFile, signedUrl } from "@/lib/organiser/data";
import { formatEventDate, formatEventHours } from "@/lib/attendee/event-clock";
import {
  getEventCategoryTerms,
  selectFeaturedParticipants,
} from "@/lib/intelligence/event-intelligence";
import { PrimaryButton } from "@/components/companion/ui";
import { cn } from "@/lib/utils";

type PreviewDevice = "mobile" | "tablet" | "desktop";
type PreviewScreen = "home" | "program" | "map" | "essentials";

const SECTION_LABELS: Record<TemplateHomeSectionId, string> = {
  featured: "Featured programme & highlights",
  crew: "Crew / networking circle",
  essentials: "Essentials, map & safety",
  upcoming: "Upcoming public events",
};

export function TemplateEditor({
  eventId,
  userId,
  eventName,
  startDate,
  endDate,
  venue,
  gatesOpen,
  entryRules,
  program,
  zones,
  sitePlanUrl,
  config,
  onChange,
  onSave,
  saving,
  saveNotice,
}: {
  eventId: string;
  userId: string;
  eventName: string;
  startDate: string;
  endDate: string;
  venue: string;
  gatesOpen: string;
  entryRules: string;
  program: ProgramItem[];
  zones: ZoneItem[];
  sitePlanUrl: string | null;
  config: EventTemplateConfig;
  onChange: (next: EventTemplateConfig) => void;
  onSave: (next: EventTemplateConfig) => Promise<void>;
  saving: boolean;
  saveNotice: string;
}) {
  const [device, setDevice] = useState<PreviewDevice>("mobile");
  const [screen, setScreen] = useState<PreviewScreen>("home");
  const [familyFilter, setFamilyFilter] = useState<LayoutFamily | "all">("all");
  const [mediaBusy, setMediaBusy] = useState<"logo" | "hero" | null>(null);
  const [mediaError, setMediaError] = useState("");

  const activeDef = EVENT_TEMPLATES[config.templateId];
  const terms = getEventCategoryTerms(activeDef.categoryLabel, config);
  const cssVars = useMemo(() => buildTemplateCssVars(config) as React.CSSProperties, [config]);

  // Build REAL attendee DemoData directly from the organiser's current unsaved/saved event fields
  const previewData = useMemo(
    () =>
      organiserEventToDemoData({
        id: eventId,
        eventType: activeDef.legacyEventType,
        name: eventName.trim() || "Untitled Event",
        startDate: startDate || null,
        endDate: endDate || null,
        venue: venue.trim() || "Venue TBC",
        gatesOpen: gatesOpen.trim(),
        entryRules: entryRules.trim(),
        program,
        zones,
        sitePlanPath: sitePlanUrl ? "preview" : null,
        sitePlanUrl,
        templateConfig: config,
        visibility: config.visibility,
        publishedAt: new Date().toISOString(),
      }),
    [
      activeDef.legacyEventType,
      config,
      endDate,
      entryRules,
      eventId,
      eventName,
      gatesOpen,
      program,
      sitePlanUrl,
      startDate,
      venue,
      zones,
    ],
  );

  const previewFeatured = useMemo(() => selectFeaturedParticipants(previewData), [previewData]);

  async function uploadBrandMedia(kind: "logo" | "hero", file: File) {
    const problem = validateImageFile(file, 8 * 1024 * 1024);
    if (problem) {
      setMediaError(problem);
      return;
    }
    setMediaError("");
    setMediaBusy(kind);
    const localPreviewUrl = URL.createObjectURL(file);
    try {
      const folder = kind === "logo" ? "event-logos" : "event-heroes";
      const path = await uploadOwnFile(userId, file, folder);
      const signed = await signedUrl(path);
      const finalUrl = signed || localPreviewUrl;
      onChange(
        kind === "logo" ? { ...config, logoUrl: finalUrl } : { ...config, heroImageUrl: finalUrl },
      );
    } catch {
      // Allow local preview in offline/mocked sessions while signalling upload warning cleanly
      onChange(
        kind === "logo"
          ? { ...config, logoUrl: localPreviewUrl }
          : { ...config, heroImageUrl: localPreviewUrl },
      );
      setMediaError("Preview updated locally. Connect to Cloud to persist uploaded artwork.");
    } finally {
      setMediaBusy(null);
    }
  }

  const toggleModule = (mod: EventModuleId) => {
    const exists = config.enabledModules.includes(mod);
    const next = exists
      ? config.enabledModules.filter((m) => m !== mod)
      : [...config.enabledModules, mod];
    onChange({ ...config, enabledModules: next });
  };

  const moveSection = (idx: number, dir: -1 | 1) => {
    const target = idx + dir;
    if (target < 0 || target >= config.homeSectionOrder.length) return;
    const copy = [...config.homeSectionOrder];
    [copy[idx], copy[target]] = [copy[target]!, copy[idx]!];
    onChange({ ...config, homeSectionOrder: copy });
  };

  const visibleTemplates =
    familyFilter === "all"
      ? EVENT_TEMPLATE_LIST
      : EVENT_TEMPLATE_LIST.filter((t) => t.layoutFamily === familyFilter);

  const previewWidthClass =
    device === "mobile" ? "max-w-[390px]" : device === "tablet" ? "max-w-[640px]" : "max-w-full";

  return (
    <div
      className="grid grid-cols-1 gap-8 xl:grid-cols-[minmax(0,1.05fr)_minmax(390px,0.95fr)]"
      data-testid="organiser-template-editor"
    >
      {/* LEFT COLUMN: Controlled Visual Configuration Studio */}
      <div className="space-y-7">
        {/* 1. Template Library Selector (12 Templates across 5 Layout Families) */}
        <section aria-labelledby="tpl-gallery-heading" className="space-y-3">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <div>
              <p className="eb-kicker text-primary">Step 1 · Experience Template</p>
              <h2 id="tpl-gallery-heading" className="eb-section-heading mt-0.5">
                Choose event template ({EVENT_TEMPLATE_LIST.length})
              </h2>
            </div>
            <span className="text-[13px] text-muted-foreground">
              Switching templates keeps all schedule, zones, tickets &amp; crews intact.
            </span>
          </div>

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
              All families
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

          <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
            {visibleTemplates.map((tpl) => {
              const selected = config.templateId === tpl.id;
              const swatch =
                tpl.defaultSurface === "dark"
                  ? PALETTE_PRESET_META[tpl.defaultPalette].darkHex
                  : PALETTE_PRESET_META[tpl.defaultPalette].lightHex;
              return (
                <button
                  key={tpl.id}
                  type="button"
                  aria-pressed={selected}
                  data-template-option={tpl.id}
                  onClick={() => onChange(switchTemplatePreservingData(config, tpl.id))}
                  className={cn(
                    "eb-press flex flex-col justify-between rounded-xl border p-3.5 text-left transition-colors",
                    selected
                      ? "border-primary bg-favorite-soft"
                      : "border-border bg-card hover:border-foreground/30",
                  )}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <span className="inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                        <span
                          aria-hidden
                          className="size-2.5 rounded-full"
                          style={{ backgroundColor: swatch }}
                        />
                        {LAYOUT_FAMILY_META[tpl.layoutFamily].name}
                      </span>
                      <p className="mt-0.5 text-[15px] font-bold text-foreground">{tpl.name}</p>
                    </div>
                    {selected && (
                      <span className="grid size-6 flex-none place-items-center rounded-full bg-primary text-primary-foreground">
                        <Check size={14} aria-hidden />
                      </span>
                    )}
                  </div>
                  <p className="mt-1.5 text-[13px] leading-snug text-muted-foreground">
                    {tpl.description}
                  </p>
                </button>
              );
            })}
          </div>
        </section>

        {/* 2. Layout Family, Surface Mode, Colour Palette & Display Typography */}
        <section aria-labelledby="tpl-brand-heading" className="eb-panel space-y-5 p-4 sm:p-5">
          <div>
            <p className="eb-kicker text-primary">Step 2 · Layout &amp; Brand Tokens</p>
            <h2 id="tpl-brand-heading" className="eb-section-heading mt-0.5">
              Composition, palette &amp; typography
            </h2>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <label className="block text-[14px] font-semibold">
              Layout family
              <select
                aria-label="Layout family"
                className="eb-field mt-1.5"
                value={config.layoutFamily}
                onChange={(e) => {
                  const fam = e.target.value as LayoutFamily;
                  onChange({
                    ...config,
                    layoutFamily: fam,
                    surfaceMode: LAYOUT_FAMILY_META[fam].defaultSurface,
                  });
                }}
              >
                {LAYOUT_FAMILIES.map((fam) => (
                  <option key={fam} value={fam}>
                    {LAYOUT_FAMILY_META[fam].name} — {LAYOUT_FAMILY_META[fam].bestFor}
                  </option>
                ))}
              </select>
            </label>

            <div>
              <p className="text-[14px] font-semibold">Surface mood</p>
              <div className="mt-1.5 grid grid-cols-2 gap-2" role="group" aria-label="Surface mood">
                {(["light", "dark"] as const).map((surf) => (
                  <button
                    key={surf}
                    type="button"
                    aria-pressed={config.surfaceMode === surf}
                    onClick={() => onChange({ ...config, surfaceMode: surf })}
                    className={cn(
                      "min-h-11 rounded-lg border px-3 text-[14px] font-semibold capitalize",
                      config.surfaceMode === surf
                        ? "border-primary bg-primary text-primary-foreground"
                        : "border-border bg-background text-foreground",
                    )}
                  >
                    {surf === "dark" ? "Dark immersive" : "Light editorial"}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Controlled WCAG-verified Accent Palette */}
          <div>
            <p className="flex items-center gap-1.5 text-[14px] font-semibold">
              <Palette size={15} className="text-primary" aria-hidden /> Brand accent preset
            </p>
            <div
              className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-4"
              role="group"
              aria-label="Brand colour palette"
            >
              {PALETTE_PRESETS.map((presetId) => {
                const meta = PALETTE_PRESET_META[presetId];
                const swatch = config.surfaceMode === "dark" ? meta.darkHex : meta.lightHex;
                const active = config.palettePreset === presetId;
                return (
                  <button
                    key={presetId}
                    type="button"
                    aria-pressed={active}
                    onClick={() => onChange({ ...config, palettePreset: presetId })}
                    className={cn(
                      "flex min-h-11 items-center gap-2 rounded-lg border px-2.5 text-left text-[13px] font-semibold",
                      active
                        ? "border-primary bg-favorite-soft text-foreground"
                        : "border-border bg-background text-foreground",
                    )}
                  >
                    <span
                      aria-hidden
                      className="size-4 flex-none rounded-full ring-1 ring-black/15"
                      style={{ backgroundColor: swatch }}
                    />
                    <span className="truncate">{meta.name}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Curated Display Typography Preset */}
          <div>
            <p className="flex items-center gap-1.5 text-[14px] font-semibold">
              <Type size={15} className="text-primary" aria-hidden /> Display typography
            </p>
            <div
              className="mt-2 grid grid-cols-2 gap-2"
              role="group"
              aria-label="Display typography preset"
            >
              {FONT_PRESETS.map((fId: DisplayFontPreset) => {
                const meta = FONT_PRESET_META[fId];
                const active = config.fontPreset === fId;
                return (
                  <button
                    key={fId}
                    type="button"
                    aria-pressed={active}
                    onClick={() => onChange({ ...config, fontPreset: fId })}
                    className={cn(
                      "min-h-14 rounded-lg border px-3 py-2 text-left",
                      active ? "border-primary bg-favorite-soft" : "border-border bg-background",
                    )}
                  >
                    <span
                      className="block text-[16px] font-extrabold leading-tight"
                      style={{ fontFamily: meta.stack }}
                    >
                      {meta.name}
                    </span>
                    <span className="block text-[12px] text-muted-foreground">{meta.sample}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Approved Organiser Media: Event Logo + Hero Photo */}
          <div className="grid grid-cols-1 gap-4 border-t border-separator pt-4 sm:grid-cols-2">
            <div className="space-y-2">
              <p className="text-[14px] font-semibold">Event logo (optional)</p>
              <div className="flex items-center gap-3">
                <div className="grid size-12 flex-none place-items-center overflow-hidden rounded-lg border border-border bg-secondary text-[12px] font-semibold text-muted-foreground">
                  {config.logoUrl ? (
                    <img
                      src={config.logoUrl}
                      alt="Event logo preview"
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    "Logo"
                  )}
                </div>
                <label className="eb-press inline-flex min-h-11 cursor-pointer items-center gap-1.5 rounded-full border border-border bg-background px-3.5 text-[13px] font-semibold">
                  <Camera size={14} aria-hidden />
                  {mediaBusy === "logo" ? "Uploading…" : config.logoUrl ? "Replace" : "Upload logo"}
                  <input
                    type="file"
                    aria-label="Upload event logo"
                    accept={IMAGE_TYPES.join(",")}
                    disabled={mediaBusy !== null}
                    className="sr-only"
                    onChange={(e) => {
                      const f = e.currentTarget.files?.[0];
                      e.currentTarget.value = "";
                      if (f) void uploadBrandMedia("logo", f);
                    }}
                  />
                </label>
                {config.logoUrl && (
                  <button
                    type="button"
                    aria-label="Remove event logo"
                    onClick={() => onChange({ ...config, logoUrl: null })}
                    className="grid size-11 place-items-center text-destructive"
                  >
                    <Trash2 size={16} aria-hidden />
                  </button>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <p className="text-[14px] font-semibold">Featured hero photo (optional)</p>
              <div className="flex items-center gap-3">
                <div className="grid h-12 w-16 flex-none place-items-center overflow-hidden rounded-lg border border-border bg-secondary text-[12px] font-semibold text-muted-foreground">
                  {config.heroImageUrl ? (
                    <img
                      src={config.heroImageUrl}
                      alt="Hero photo preview"
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    "Hero"
                  )}
                </div>
                <label className="eb-press inline-flex min-h-11 cursor-pointer items-center gap-1.5 rounded-full border border-border bg-background px-3.5 text-[13px] font-semibold">
                  <Camera size={14} aria-hidden />
                  {mediaBusy === "hero"
                    ? "Uploading…"
                    : config.heroImageUrl
                      ? "Replace"
                      : "Upload hero"}
                  <input
                    type="file"
                    aria-label="Upload hero photo"
                    accept={IMAGE_TYPES.join(",")}
                    disabled={mediaBusy !== null}
                    className="sr-only"
                    onChange={(e) => {
                      const f = e.currentTarget.files?.[0];
                      e.currentTarget.value = "";
                      if (f) void uploadBrandMedia("hero", f);
                    }}
                  />
                </label>
                {config.heroImageUrl && (
                  <button
                    type="button"
                    aria-label="Remove hero photo"
                    onClick={() => onChange({ ...config, heroImageUrl: null })}
                    className="grid size-11 place-items-center text-destructive"
                  >
                    <Trash2 size={16} aria-hidden />
                  </button>
                )}
              </div>
            </div>
          </div>
          {mediaError && (
            <p role="alert" className="text-[13px] font-medium text-warning">
              {mediaError}
            </p>
          )}

          {/* Tagline, RSVP Note & Visibility */}
          <div className="space-y-3 border-t border-separator pt-4">
            <label className="block text-[14px] font-semibold">
              Short event tagline (optional)
              <input
                className="eb-field mt-1"
                maxLength={140}
                placeholder="e.g. Two days of FinTech keynotes, product demos and live workshops."
                value={config.tagline}
                onChange={(e) => onChange({ ...config, tagline: e.target.value })}
              />
            </label>
            {config.layoutFamily === "social" && (
              <label className="block text-[14px] font-semibold">
                Guest invitation / RSVP note (optional)
                <input
                  className="eb-field mt-1"
                  maxLength={240}
                  placeholder="e.g. Dress code: coastal linen. Rooftop doors open at 19:00."
                  value={config.rsvpNote}
                  onChange={(e) => onChange({ ...config, rsvpNote: e.target.value })}
                />
              </label>
            )}
            <div>
              <p className="text-[14px] font-semibold">Discovery visibility</p>
              <div
                className="mt-1.5 grid grid-cols-1 gap-2 sm:grid-cols-2"
                role="group"
                aria-label="Event visibility"
              >
                {(
                  [
                    {
                      value: "public",
                      label: "Public discovery",
                      hint: "Listed in Discover, Search & Calendar",
                      icon: Globe,
                    },
                    {
                      value: "private_invite",
                      label: "Private / Invite-only",
                      hint: "Hidden from public Discover; direct link only",
                      icon: Lock,
                    },
                  ] as { value: EventVisibility; label: string; hint: string; icon: typeof Globe }[]
                ).map(({ value, label, hint, icon: Icon }) => {
                  const active = config.visibility === value;
                  return (
                    <button
                      key={value}
                      type="button"
                      aria-pressed={active}
                      onClick={() => onChange({ ...config, visibility: value })}
                      className={cn(
                        "flex min-h-14 items-start gap-2.5 rounded-lg border p-3 text-left",
                        active ? "border-primary bg-favorite-soft" : "border-border bg-background",
                      )}
                    >
                      <Icon size={17} className="mt-0.5 flex-none text-primary" aria-hidden />
                      <span className="min-w-0">
                        <span className="block text-[14px] font-bold">{label}</span>
                        <span className="block text-[12px] text-muted-foreground">{hint}</span>
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </section>

        {/* 3. Attendee Feature Modules & Homepage Section Ordering */}
        <section aria-labelledby="tpl-modules-heading" className="eb-panel space-y-5 p-4 sm:p-5">
          <div>
            <p className="eb-kicker text-primary">Step 3 · Modules &amp; Home Hierarchy</p>
            <h2 id="tpl-modules-heading" className="eb-section-heading mt-0.5">
              Enable features &amp; arrange sections
            </h2>
          </div>

          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {EVENT_MODULES.map((modId) => {
              const meta = MODULE_META[modId];
              const enabled = config.enabledModules.includes(modId);
              return (
                <label
                  key={modId}
                  className={cn(
                    "flex min-h-12 cursor-pointer items-start gap-2.5 rounded-lg border px-3 py-2.5",
                    enabled
                      ? "border-primary/45 bg-favorite-soft/60"
                      : "border-border bg-background",
                  )}
                >
                  <input
                    type="checkbox"
                    className="mt-0.5 size-5 flex-none accent-primary"
                    checked={enabled}
                    onChange={() => toggleModule(modId)}
                  />
                  <span className="min-w-0">
                    <span className="block text-[14px] font-semibold text-foreground">
                      {meta.label}
                    </span>
                    <span className="block text-[12px] text-muted-foreground">{meta.hint}</span>
                  </span>
                </label>
              );
            })}
          </div>

          <div className="border-t border-separator pt-4">
            <p className="mb-2 text-[14px] font-semibold">Homepage section order</p>
            <div className="eb-list">
              {config.homeSectionOrder.map((secId, idx) => (
                <div key={secId} className="eb-row justify-between py-2">
                  <span className="text-[14px] font-medium">
                    <span className="mr-2 font-bold tabular-nums text-primary">{idx + 1}.</span>
                    {SECTION_LABELS[secId]}
                  </span>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      aria-label={`Move ${SECTION_LABELS[secId]} up`}
                      disabled={idx === 0}
                      onClick={() => moveSection(idx, -1)}
                      className="grid size-10 place-items-center rounded-lg border border-border disabled:opacity-30"
                    >
                      <ArrowUp size={15} />
                    </button>
                    <button
                      type="button"
                      aria-label={`Move ${SECTION_LABELS[secId]} down`}
                      disabled={idx === config.homeSectionOrder.length - 1}
                      onClick={() => moveSection(idx, 1)}
                      className="grid size-10 place-items-center rounded-lg border border-border disabled:opacity-30"
                    >
                      <ArrowDown size={15} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-2 border-t border-separator pt-4">
            <PrimaryButton disabled={saving} onClick={() => void onSave(config)}>
              {saving ? "Saving template design…" : "Save template & branding"}
            </PrimaryButton>
            {saveNotice && (
              <p role="status" className="text-[14px] text-muted-foreground">
                {saveNotice}
              </p>
            )}
          </div>
        </section>
      </div>

      {/* RIGHT COLUMN: Live Interactive Attendee Preview (Mobile / Tablet / Desktop) */}
      <aside className="xl:sticky xl:top-20 xl:self-start" aria-label="Live attendee preview">
        <div className="eb-panel overflow-hidden">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-separator bg-secondary/50 px-4 py-3">
            <div className="flex items-center gap-2">
              <Eye size={16} className="text-primary" aria-hidden />
              <span className="text-[14px] font-bold text-foreground">Live Attendee Preview</span>
            </div>
            <div
              className="flex items-center gap-1"
              role="group"
              aria-label="Preview viewport size"
            >
              {(
                [
                  { id: "mobile", label: "Mobile", icon: Smartphone },
                  { id: "tablet", label: "Tablet", icon: Tablet },
                  { id: "desktop", label: "Desktop", icon: Monitor },
                ] as const
              ).map(({ id, label, icon: Icon }) => (
                <button
                  key={id}
                  type="button"
                  aria-label={`${label} preview`}
                  aria-pressed={device === id}
                  onClick={() => setDevice(id)}
                  className={cn(
                    "inline-flex min-h-9 items-center gap-1 rounded-full px-2.5 text-[12px] font-semibold",
                    device === id
                      ? "bg-primary text-primary-foreground"
                      : "bg-card text-muted-foreground hover:text-foreground",
                  )}
                >
                  <Icon size={14} aria-hidden />
                  <span className="hidden sm:inline">{label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Preview Screen Tabs */}
          <div
            className="flex border-b border-separator bg-card px-2"
            role="group"
            aria-label="Preview attendee screen"
          >
            {(
              [
                { id: "home", label: "Home" },
                { id: "program", label: terms.programLabel },
                { id: "map", label: "Map" },
                { id: "essentials", label: "Essentials" },
              ] as const
            ).map((tab) => (
              <button
                key={tab.id}
                type="button"
                aria-pressed={screen === tab.id}
                onClick={() => setScreen(tab.id)}
                className={cn(
                  "min-h-10 flex-1 border-b-2 px-2 text-[13px] font-semibold transition-colors",
                  screen === tab.id
                    ? "border-primary text-foreground"
                    : "border-transparent text-muted-foreground",
                )}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Live Rendered Attendee Canvas (Real Event Data + Real Template Tokens) */}
          <div className="bg-secondary/40 p-3 sm:p-4">
            <div
              data-testid="live-attendee-preview-frame"
              data-surface-mode={config.surfaceMode}
              data-layout-family={config.layoutFamily}
              data-preview-device={device}
              style={cssVars}
              className={cn(
                "mx-auto overflow-hidden rounded-2xl border border-border bg-background text-foreground shadow-float transition-all duration-200",
                previewWidthClass,
              )}
            >
              {/* Simulated Attendee Top Chrome */}
              <div className="flex items-center justify-between border-b border-separator bg-bar px-3.5 py-2.5 text-[13px]">
                <span className="truncate font-semibold text-muted-foreground">‹ Discover</span>
                <span className="rounded-full bg-favorite-soft px-2 py-0.5 text-[11px] font-bold text-primary">
                  {activeDef.shortLabel} · {LAYOUT_FAMILY_META[config.layoutFamily].name}
                </span>
              </div>

              <div className="max-h-[540px] overflow-y-auto">
                {screen === "home" && (
                  <div className="pb-4">
                    {/* Layout-family accurate preview hero */}
                    {config.layoutFamily === "professional" ? (
                      <div className="border-b border-separator p-4">
                        <div className="flex items-center gap-2.5">
                          {config.logoUrl && (
                            <img
                              src={config.logoUrl}
                              alt="Event logo"
                              className="size-9 rounded-lg border border-border object-cover"
                            />
                          )}
                          <p className="eb-kicker text-[11px] text-primary">
                            {activeDef.categoryLabel}
                          </p>
                        </div>
                        <h3 className="eb-display mt-2 text-[24px]">{previewData.event.name}</h3>
                        <p className="mt-1 text-[13px] text-muted-foreground">
                          {formatEventDate(previewData.event, {
                            day: "numeric",
                            month: "long",
                            year: "numeric",
                          })}{" "}
                          · {formatEventHours(previewData.event)} · {previewData.event.venueName}
                        </p>
                        {config.heroImageUrl && (
                          <img
                            src={config.heroImageUrl}
                            alt=""
                            className="mt-3 h-32 w-full rounded-lg object-cover"
                          />
                        )}
                      </div>
                    ) : config.layoutFamily === "social" ? (
                      <div className="p-4">
                        <div className="eb-panel overflow-hidden">
                          {config.heroImageUrl && (
                            <img
                              src={config.heroImageUrl}
                              alt=""
                              className="h-32 w-full object-cover"
                            />
                          )}
                          <div className="p-4">
                            <span className="inline-flex items-center gap-1 rounded-full bg-favorite-soft px-2.5 py-0.5 text-[11px] font-bold text-primary">
                              {config.visibility === "private_invite" ? (
                                <Lock size={11} />
                              ) : (
                                <Sparkles size={11} />
                              )}
                              {config.visibility === "private_invite"
                                ? "Private invitation"
                                : activeDef.categoryLabel}
                            </span>
                            <h3 className="eb-display mt-2 text-[23px]">
                              {previewData.event.name}
                            </h3>
                            <p className="mt-1 text-[13px] text-muted-foreground">
                              {previewData.event.venueName} ·{" "}
                              {formatEventDate(previewData.event, {
                                day: "numeric",
                                month: "short",
                              })}
                            </p>
                            {config.rsvpNote && (
                              <p className="mt-2 border-l-2 border-primary pl-2.5 text-[12px]">
                                {config.rsvpNote}
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="relative h-44 w-full overflow-hidden bg-gradient-to-br from-[#132229] via-[#112e36] to-[#0d0f12] p-4 text-white">
                        {config.heroImageUrl && (
                          <img
                            src={config.heroImageUrl}
                            alt=""
                            className="absolute inset-0 h-full w-full object-cover"
                          />
                        )}
                        <div
                          aria-hidden
                          className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/40 to-black/20"
                        />
                        <div className="relative flex h-full flex-col justify-between">
                          <div className="flex items-center gap-2">
                            {config.logoUrl && (
                              <img
                                src={config.logoUrl}
                                alt="Event logo"
                                className="size-8 rounded-md border border-white/25 object-cover"
                              />
                            )}
                            <span className="rounded-full bg-black/60 px-2.5 py-0.5 text-[11px] font-semibold">
                              {activeDef.categoryLabel}
                            </span>
                          </div>
                          <div>
                            <h3 className="eb-display text-[24px] leading-tight text-white">
                              {previewData.event.name}
                            </h3>
                            <p className="mt-0.5 truncate text-[12px] text-white/85">
                              {formatEventDate(previewData.event, {
                                day: "numeric",
                                month: "short",
                                year: "numeric",
                              })}{" "}
                              · {previewData.event.venueName}
                            </p>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Preview Sections in Organiser's Exact Order */}
                    <div className="space-y-4 px-4 pt-4">
                      {config.homeSectionOrder.map((sec) => {
                        if (sec === "featured") {
                          const list =
                            previewFeatured.length > 0
                              ? previewFeatured
                              : previewData.festival.artists.slice(0, 3);
                          return (
                            <div key={sec}>
                              <p className="eb-section-heading text-[15px]">
                                {terms.featuredHeading}
                              </p>
                              {list.length > 0 ? (
                                <div className="eb-list mt-2">
                                  {list.map((item) => (
                                    <div key={item.id} className="eb-row py-2 text-[14px]">
                                      <span className="grid size-8 flex-none place-items-center rounded-full bg-primary text-[11px] font-bold text-primary-foreground">
                                        {item.name.slice(0, 2).toUpperCase()}
                                      </span>
                                      <div className="min-w-0 flex-1">
                                        <p className="truncate font-semibold">{item.name}</p>
                                        <p className="truncate text-[12px] text-muted-foreground">
                                          {item.role}
                                        </p>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              ) : (
                                <p className="mt-1 text-[13px] text-muted-foreground">
                                  Add {terms.peopleLabel.toLowerCase()} in {terms.programLabel} to
                                  preview them here.
                                </p>
                              )}
                            </div>
                          );
                        }
                        if (sec === "crew") {
                          if (
                            !config.enabledModules.includes("crew") &&
                            !config.enabledModules.includes("networking")
                          ) {
                            return null;
                          }
                          return (
                            <div key={sec} className="border-t border-separator pt-3">
                              <div className="flex items-center justify-between">
                                <p className="eb-section-heading text-[15px]">{terms.crewLabel}</p>
                                <span className="inline-flex items-center gap-1 rounded-full bg-primary px-3 py-1 text-[12px] font-semibold text-primary-foreground">
                                  <Users size={12} /> Open
                                </span>
                              </div>
                            </div>
                          );
                        }
                        if (sec === "essentials") {
                          return (
                            <div key={sec} className="border-t border-separator pt-3">
                              <p className="eb-section-heading text-[15px]">
                                {terms.essentialsHeading}
                              </p>
                              <p className="mt-1 text-[12px] text-muted-foreground">
                                {terms.entryRulesLabel} · Transport · Safety
                                {config.enabledModules.includes("map") ? " · Venue map" : ""}
                              </p>
                            </div>
                          );
                        }
                        return null;
                      })}

                      {config.enabledModules.includes("tickets") && (
                        <div className="flex items-center justify-between rounded-xl border border-border bg-card px-3.5 py-2.5 text-[13px]">
                          <span className="text-muted-foreground">Tickets &amp; gate pass</span>
                          <span className="inline-flex items-center gap-1 rounded-full bg-primary px-3 py-1 font-semibold text-primary-foreground">
                            <Ticket size={13} /> Pass
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {screen === "program" && (
                  <div className="p-4">
                    <p className="eb-kicker text-[11px] text-primary">{previewData.event.name}</p>
                    <h3 className="eb-display mt-0.5 text-[22px]">{terms.programLabel}</h3>
                    {program.length > 0 ? (
                      <div className="eb-list mt-3">
                        {program.map((item, i) => (
                          <div key={i} className="eb-row py-2.5">
                            {item.time && (
                              <span className="w-12 flex-none text-[13px] font-bold tabular-nums text-primary">
                                {item.time}
                              </span>
                            )}
                            <div className="min-w-0 flex-1">
                              <p className="truncate text-[14px] font-bold">
                                {item.title}
                                {item.headliner && (
                                  <span className="ml-1.5 rounded-full bg-favorite-soft px-2 py-0.5 text-[10px] font-bold uppercase text-primary">
                                    {terms.headlinerBadge}
                                  </span>
                                )}
                              </p>
                              <p className="truncate text-[12px] text-muted-foreground">
                                {item.place || terms.placeSingular} · {item.status}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="mt-3 text-[13px] text-muted-foreground">
                        No {terms.peopleLabel.toLowerCase()} added yet. Add entries in{" "}
                        {terms.programLabel} to see them live here.
                      </p>
                    )}
                  </div>
                )}

                {screen === "map" && (
                  <div className="p-4">
                    <p className="eb-kicker text-[11px] text-primary">
                      {previewData.event.venueName}
                    </p>
                    <h3 className="eb-display mt-0.5 text-[22px]">Map</h3>
                    {sitePlanUrl ? (
                      <div className="relative mt-3 overflow-hidden rounded-xl border border-border bg-white">
                        <img
                          src={sitePlanUrl}
                          alt="Site plan preview"
                          className="max-h-64 w-full object-contain"
                        />
                        {zones
                          .filter((z) => z.x !== null && z.y !== null)
                          .map((z, idx) => (
                            <span
                              key={idx}
                              style={{ left: `${z.x}%`, top: `${z.y}%` }}
                              className="absolute -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary px-2 py-0.5 text-[10px] font-bold text-primary-foreground shadow"
                            >
                              {z.name}
                            </span>
                          ))}
                      </div>
                    ) : (
                      <div className="mt-3 rounded-xl border border-dashed border-border p-6 text-center text-[13px] text-muted-foreground">
                        <MapPin size={20} className="mx-auto mb-1.5 text-primary" />
                        Map coming soon for {previewData.event.name} ({zones.length} locations
                        listed).
                      </div>
                    )}
                  </div>
                )}

                {screen === "essentials" && (
                  <div className="p-4">
                    <p className="eb-kicker text-[11px] text-primary">{previewData.event.name}</p>
                    <h3 className="eb-display mt-0.5 text-[22px]">Essentials</h3>
                    <div className="eb-list mt-3 text-[14px]">
                      <div className="eb-row py-2.5 font-semibold">{terms.entryRulesLabel}</div>
                      <div className="eb-row py-2.5 font-semibold">Transport &amp; Parking</div>
                      <div className="eb-row py-2.5 font-semibold">Safety &amp; Support</div>
                      <div className="eb-row py-2.5 font-semibold">{terms.askLabel}</div>
                    </div>
                    {previewData.festival.rules.length > 0 && (
                      <p className="mt-3 text-[13px] text-muted-foreground">
                        {previewData.festival.rules[0]}
                      </p>
                    )}
                  </div>
                )}
              </div>

              {/* Simulated Bottom Nav */}
              <div className="grid grid-cols-4 border-t border-separator bg-nav py-2 text-center text-[11px] font-semibold text-nav-foreground">
                <span className={screen === "home" ? "text-primary" : ""}>Events</span>
                <span className={screen === "program" ? "text-primary" : ""}>
                  {terms.programLabel}
                </span>
                <span className={screen === "map" ? "text-primary" : ""}>Map</span>
                <span>{terms.crewLabel}</span>
              </div>
            </div>
          </div>
        </div>
      </aside>
    </div>
  );
}
