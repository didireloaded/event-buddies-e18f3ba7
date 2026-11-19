import {
  ArrowUpRight,
  CalendarPlus,
  Check,
  Heart,
  MapPin,
  Music2,
  Plus,
  Shuffle,
  TriangleAlert,
  Trophy,
  Store,
  CalendarRange,
} from "lucide-react";
import { useEffect, useState } from "react";
import type { FestivalArtist } from "@/lib/event/sound-of-summer";
import type { PerformanceRecord } from "@/lib/event/types";
import { downloadCalendar, eventTime, scheduleClashes } from "@/lib/attendee/schedule";
import { createLineupPoster } from "@/lib/attendee/recap-card";
import { getCrewArtistOverlap } from "@/lib/organiser/cloud-extensions";
import {
  getEventCategoryTerms,
  selectFeaturedParticipants,
} from "@/lib/intelligence/event-intelligence";
import { resolveEventTemplate } from "@/lib/templates/event-templates";
import { cn } from "@/lib/utils";
import { initials, useCompanion } from "./context";
import { DayPlanPanel } from "./DayPlanPanel";
import { ArtistAvatar } from "./ArtistAvatar";
import { EventSections } from "./EventSections";
import {
  Chevron,
  EmptyState,
  IconTile,
  Notice,
  RowText,
  SearchField,
  Section,
  Segmented,
} from "./ui";

export function ArtistRow({
  artist,
  saved,
  disabled,
  crewSharedNames = [],
  onOpen,
  onSave,
}: {
  artist: FestivalArtist;
  saved: boolean;
  disabled: boolean;
  crewSharedNames?: string[];
  onOpen: () => void;
  onSave: () => void;
}) {
  const { attendee, data } = useCompanion();
  const sharedNames = [
    ...new Set([
      ...crewSharedNames,
      ...attendee.preferences.sharedPlans
        .filter((entry) => entry.plan.artists.includes(artist.id))
        .map((entry) => entry.plan.name),
    ]),
  ];
  const stageLabel = artist.stageId
    ? data.stages.find((stage) => stage.id === artist.stageId)?.name
    : null;
  return (
    <div className="eb-row gap-0 py-1">
      <button
        type="button"
        onClick={onOpen}
        className="flex min-h-14 min-w-0 flex-1 items-center gap-3.5 py-2 text-left"
      >
        <ArtistAvatar artist={artist} />
        <RowText
          title={<span className="font-semibold">{artist.name}</span>}
          subtitle={
            <>
              <span className="block">
                {artist.role === "Headliner" ? "Headliner · " : ""}
                {stageLabel ?? artist.role}
              </span>
              {sharedNames.length > 0 && (
                <span className="mt-1 flex flex-wrap items-center gap-1 text-[13px] text-primary">
                  {sharedNames.slice(0, 2).map((name) => (
                    <span
                      key={name}
                      aria-hidden
                      className="grid size-5 place-items-center rounded-full bg-favorite-soft text-[11px] font-bold"
                    >
                      {initials(name)}
                    </span>
                  ))}
                  <span>
                    {sharedNames.slice(0, 2).join(" & ")}
                    {sharedNames.length > 2 ? ` +${sharedNames.length - 2}` : ""} saved this
                  </span>
                </span>
              )}
            </>
          }
        />
      </button>
      <button
        type="button"
        disabled={disabled}
        aria-pressed={saved}
        aria-label={`${saved ? "Remove" : "Save"} ${artist.name} ${saved ? "from" : "to"} favourites`}
        onClick={onSave}
        className={cn(
          "grid size-12 flex-none place-items-center rounded-full",
          saved ? "text-primary" : "text-tertiary-foreground hover:text-foreground",
        )}
      >
        <Heart size={20} fill={saved ? "currentColor" : "none"} aria-hidden />
      </button>
    </div>
  );
}

function SetRow({
  performance,
  stage,
  saved,
  disabled,
  layoutFamily,
  onOpen,
  onSave,
}: {
  performance: PerformanceRecord;
  stage: string;
  saved: boolean;
  disabled: boolean;
  layoutFamily: string;
  onOpen: () => void;
  onSave: () => void;
}) {
  return (
    <div className="eb-row gap-2 py-2">
      <button
        type="button"
        onClick={onOpen}
        className="flex min-h-14 min-w-0 flex-1 items-center gap-3.5 text-left"
      >
        <div
          className={cn(
            "w-14 flex-none",
            layoutFamily === "competition" && "border-l-2 border-primary pl-2.5",
          )}
        >
          <time className="block text-[15px] font-bold tabular-nums text-foreground">
            {eventTime(performance.scheduledStart)}
          </time>
          <span className="block text-[11px] font-medium uppercase text-muted-foreground">CAT</span>
        </div>
        <RowText
          title={<span className="font-bold">{performance.artistName}</span>}
          subtitle={
            <span className="flex flex-wrap items-center gap-1.5">
              <span>{stage}</span>
              {performance.status !== "scheduled" && (
                <span className="rounded-full bg-warning-soft px-2 py-0.5 text-[11px] font-semibold uppercase text-warning">
                  {performance.status}
                </span>
              )}
            </span>
          }
        />
      </button>
      <button
        type="button"
        disabled={disabled}
        aria-pressed={saved}
        aria-label={`${saved ? "Remove" : "Add"} ${performance.artistName} ${eventTime(performance.scheduledStart)}`}
        onClick={onSave}
        className={cn(
          "grid size-11 flex-none place-items-center rounded-full border",
          saved
            ? "border-primary bg-primary text-primary-foreground"
            : "border-border bg-card text-foreground",
        )}
      >
        {saved ? <Check size={18} /> : <Plus size={18} />}
      </button>
    </div>
  );
}

export function LineupView({ searchRef }: { searchRef: React.Ref<HTMLInputElement> }) {
  const { data, attendee, crew, openSheet, openPlace, spin } = useCompanion();
  const { preferences, ready, toggleArtist, toggleSaved } = attendee;
  const [query, setQuery] = useState("");
  const [onlySaved, setOnlySaved] = useState<"all" | "saved">("all");
  const [stage, setStage] = useState("all");
  const [exportingPoster, setExportingPoster] = useState(false);
  const [crewOverlap, setCrewOverlap] = useState<Record<string, string[]>>({});
  const { config: templateConfig } = resolveEventTemplate({
    category: data.event.category,
    templateConfig: data.event.templateConfig,
  });
  const family = templateConfig.layoutFamily;
  const terms = getEventCategoryTerms(data.event.category, templateConfig);
  const featured = selectFeaturedParticipants(data);

  useEffect(() => {
    setStage("all");
  }, [data.event.id]);

  useEffect(() => {
    if (!attendee.auth.user || !crew?.crew) {
      setCrewOverlap({});
      return;
    }
    let active = true;
    void getCrewArtistOverlap(data.event.id).then((map) => {
      if (active) setCrewOverlap(map);
    });
    return () => {
      active = false;
    };
  }, [attendee.auth.user, crew?.crew, data.event.id]);

  const term = query.trim().toLowerCase();
  const stageName = (id: string) =>
    data.stages.find((s) => s.id === id)?.name ?? terms.placeSingular;
  const activeStage =
    stage !== "all" && stage !== "tba" ? data.stages.find((s) => s.id === stage) : null;
  const hasUnmapped = data.festival.artists.some((a) => !a.stageId);

  const artists = data.festival.artists.filter(
    (artist) =>
      (onlySaved === "all" || preferences.savedArtists.includes(artist.id)) &&
      (stage === "all" || (stage === "tba" ? !artist.stageId : artist.stageId === stage)) &&
      artist.name.toLowerCase().includes(term),
  );
  const sorted = [...data.performances].sort(
    (a, b) => +new Date(a.scheduledStart) - +new Date(b.scheduledStart),
  );
  const mine = sorted.filter((p) => preferences.saved.includes(p.id));
  const clashes = scheduleClashes(mine);
  const sets = sorted.filter(
    (p) =>
      (onlySaved === "all" || preferences.saved.includes(p.id)) &&
      (stage === "all" || p.stageId === stage) &&
      `${p.artistName} ${p.genre ?? ""} ${stageName(p.stageId)}`.toLowerCase().includes(term),
  );
  const savedCount = preferences.savedArtists.length + mine.length;
  const hasTimetable = data.performances.length > 0;

  // Experience & Social use an editorial 2-col portrait grid when multiple artist photos exist;
  // Professional, Competition & Discovery use structured architectural rows tailored to their domain.
  const useEditorialPortraitGrid =
    (family === "experience" || family === "social") && artists.some((a) => Boolean(a.avatarUrl));

  const EmptyIcon =
    family === "professional"
      ? CalendarRange
      : family === "competition"
        ? Trophy
        : family === "discovery"
          ? Store
          : Music2;

  return (
    <div className="pb-6">
      <div className="px-4 pt-4">
        <p className="eb-kicker text-primary">{data.event.name}</p>
        <h1 className="eb-page-title mt-1">{terms.programLabel}</h1>
      </div>

      <EventSections />

      {/* Headliner / Keynote / Featured Lead Band */}
      {featured.length > 0 && onlySaved === "all" && stage === "all" && !term && (
        <section className="mx-4 mb-5" aria-label="Featured">
          {family === "experience" && featured[0] ? (
            <button
              type="button"
              onClick={() => openSheet({ kind: "artist", artist: featured[0]! })}
              className="eb-press flex w-full items-center gap-4 rounded-2xl border border-border bg-card p-4 text-left"
            >
              <ArtistAvatar artist={featured[0]!} large />
              <span className="min-w-0 flex-1">
                <span className="eb-kicker text-primary">{terms.headlinerBadge}</span>
                <span className="eb-display mt-0.5 block truncate text-[26px] text-foreground">
                  {featured[0]!.name}
                </span>
                <span className="block truncate text-[14px] text-muted-foreground">
                  {featured[0]!.stageName ?? featured[0]!.role}
                </span>
              </span>
              <ArrowUpRight size={18} className="flex-none text-muted-foreground" aria-hidden />
            </button>
          ) : (
            <div className="scrollbar-none flex gap-2.5 overflow-x-auto pb-1">
              {featured.map((act) => (
                <button
                  key={act.id}
                  type="button"
                  onClick={() => openSheet({ kind: "artist", artist: act })}
                  className="eb-press eb-panel flex w-56 flex-none items-center gap-3 p-3 text-left"
                >
                  <ArtistAvatar artist={act} />
                  <span className="min-w-0 flex-1">
                    <span className="block text-[11px] font-bold uppercase tracking-wide text-primary">
                      {act.isHeadliner ? terms.headlinerBadge : "Featured"}
                    </span>
                    <span className="block truncate text-[15px] font-bold">{act.name}</span>
                    <span className="block truncate text-[13px] text-muted-foreground">
                      {act.stageName ?? act.role}
                    </span>
                  </span>
                </button>
              ))}
            </div>
          )}
        </section>
      )}

      <div className="space-y-3 px-4">
        <SearchField
          id="lineup-search"
          label={`Search ${terms.peopleLabel.toLowerCase()}`}
          placeholder={`Search ${terms.peopleLabel.toLowerCase()}`}
          value={query}
          onChange={setQuery}
          inputRef={searchRef}
        />
        <Segmented
          label="Show"
          value={onlySaved}
          onChange={setOnlySaved}
          options={[
            { value: "all", label: `All ${terms.peopleLabel.toLowerCase()}` },
            { value: "saved", label: `Favourites (${savedCount})` },
          ]}
        />
      </div>

      {/* Stage / Room / Pitch / Booth Filter Pills (hidden cleanly if single venue with no stages) */}
      {(data.stages.length > 0 || hasUnmapped) && (
        <div
          className="scrollbar-none mt-3 flex gap-2 overflow-x-auto px-4 py-1"
          role="group"
          aria-label={`Filter by ${terms.placeSingular.toLowerCase()}`}
        >
          <button
            type="button"
            className="eb-chip"
            aria-pressed={stage === "all"}
            onClick={() => setStage("all")}
          >
            All {terms.placesLabel.toLowerCase()}
          </button>
          {data.stages.map((item) => (
            <button
              key={item.id}
              type="button"
              className="eb-chip"
              aria-pressed={stage === item.id}
              onClick={() => setStage(item.id)}
            >
              {item.name}
            </button>
          ))}
          {hasUnmapped && (
            <button
              type="button"
              className="eb-chip"
              aria-pressed={stage === "tba"}
              onClick={() => setStage("tba")}
            >
              {terms.placeSingular} TBA
            </button>
          )}
        </div>
      )}

      {/* Selected Stage / Room Header */}
      {activeStage && (
        <section className="mx-4 mt-3 border-y border-separator py-3.5">
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="eb-kicker text-primary">{terms.placeSingular}</p>
              <h2 className="eb-display mt-0.5 text-[21px]">{activeStage.name}</h2>
              <p className="mt-0.5 text-[14px] text-muted-foreground">
                {artists.length}{" "}
                {artists.length === 1
                  ? terms.personSingular.toLowerCase()
                  : terms.peopleLabel.toLowerCase()}{" "}
                · {hasTimetable ? "Confirmed times below" : "Times awaiting publication"}
              </p>
            </div>
            <button
              type="button"
              onClick={() => openPlace(activeStage.id)}
              className="eb-press inline-flex min-h-11 flex-none items-center gap-1.5 rounded-full bg-primary px-4 text-[14px] font-semibold text-primary-foreground"
            >
              <MapPin size={15} aria-hidden /> View on Map
            </button>
          </div>
        </section>
      )}

      {clashes.length > 0 && onlySaved === "saved" && (
        <div className="mt-4 px-4">
          <Notice icon={TriangleAlert} tone="warning">
            <strong className="font-semibold">
              {clashes.length} {clashes.length === 1 ? "clash" : "clashes"} in your{" "}
              {terms.programLabel.toLowerCase()}
            </strong>
            {clashes.map(([a, b]) => (
              <span key={`${a.id}-${b.id}`} className="block">
                {a.artistName} &amp; {b.artistName} overlap
              </span>
            ))}
          </Notice>
        </div>
      )}

      <DayPlanPanel key={attendee.scope} />

      {/* For Professional & Competition events with confirmed times, place the Timed Schedule FIRST */}
      {hasTimetable && (family === "professional" || family === "competition") && (
        <Section
          title={family === "competition" ? "Confirmed fixtures" : "Confirmed schedule"}
          id="lineup-sets"
          className="px-4"
          footer={`All times ${data.event.timezone} (CAT)`}
        >
          <div className="eb-list">
            {sets.map((p) => (
              <SetRow
                key={p.id}
                performance={p}
                stage={stageName(p.stageId)}
                saved={preferences.saved.includes(p.id)}
                disabled={!ready || p.status === "cancelled"}
                layoutFamily={family}
                onOpen={() => openSheet({ kind: "performance", performance: p })}
                onSave={() => toggleSaved(p.id)}
              />
            ))}
          </div>
        </Section>
      )}

      <Section
        title={`${artists.length} announced ${artists.length === 1 ? terms.personSingular.toLowerCase() : terms.peopleLabel.toLowerCase()}`}
        id="lineup-artists"
        className="px-4"
      >
        {artists.length ? (
          useEditorialPortraitGrid ? (
            <div className="grid grid-cols-2 gap-x-3.5 gap-y-5 sm:grid-cols-3">
              {artists.map((artist) => {
                const saved = preferences.savedArtists.includes(artist.id);
                const stageLabel = artist.stageId
                  ? data.stages.find((s) => s.id === artist.stageId)?.name
                  : null;
                const sharedNames = [
                  ...new Set([
                    ...(crewOverlap[artist.id] ?? []),
                    ...attendee.preferences.sharedPlans
                      .filter((entry) => entry.plan.artists.includes(artist.id))
                      .map((entry) => entry.plan.name),
                  ]),
                ];
                return (
                  <article key={artist.id} className="group relative">
                    <button
                      type="button"
                      onClick={() => openSheet({ kind: "artist", artist })}
                      className="eb-press block w-full text-left"
                    >
                      <ArtistAvatar artist={artist} variant="portrait" />
                      <p className="mt-2 truncate text-[16px] font-bold leading-snug text-foreground">
                        {artist.name}
                      </p>
                      <p className="truncate text-[13px] text-muted-foreground">
                        {stageLabel ?? artist.role}
                      </p>
                      {sharedNames.length > 0 && (
                        <p className="mt-0.5 truncate text-[12px] font-semibold text-primary">
                          {sharedNames.slice(0, 2).join(" & ")} saved
                        </p>
                      )}
                    </button>
                    <button
                      type="button"
                      disabled={!ready}
                      aria-pressed={saved}
                      aria-label={`${saved ? "Remove" : "Save"} ${artist.name} ${saved ? "from" : "to"} favourites`}
                      onClick={() => toggleArtist(artist.id)}
                      className={cn(
                        "eb-press absolute right-2 top-2 grid size-11 place-items-center rounded-full backdrop-blur-md",
                        saved
                          ? "bg-primary text-primary-foreground"
                          : "bg-black/55 text-white hover:bg-black/75",
                      )}
                    >
                      <Heart size={18} fill={saved ? "currentColor" : "none"} aria-hidden />
                    </button>
                  </article>
                );
              })}
            </div>
          ) : (
            <div className="eb-list">
              {artists.map((artist) => (
                <ArtistRow
                  key={artist.id}
                  artist={artist}
                  saved={preferences.savedArtists.includes(artist.id)}
                  disabled={!ready}
                  crewSharedNames={crewOverlap[artist.id] ?? []}
                  onOpen={() => openSheet({ kind: "artist", artist })}
                  onSave={() => toggleArtist(artist.id)}
                />
              ))}
            </div>
          )
        ) : (
          <EmptyState
            icon={EmptyIcon}
            title={
              onlySaved === "saved" && !term
                ? "No favourites yet"
                : `No ${terms.peopleLabel.toLowerCase()} found`
            }
            detail={
              onlySaved === "saved" && !term
                ? `Tap the heart beside any ${terms.personSingular.toLowerCase()} to save them here.`
                : "Try another search term or reset your active filters."
            }
            action={
              <button
                type="button"
                className="min-h-11 rounded-full bg-primary px-5 text-[14px] font-semibold text-primary-foreground"
                onClick={() => {
                  setQuery("");
                  setStage("all");
                  setOnlySaved("all");
                }}
              >
                Show all {terms.peopleLabel.toLowerCase()}
              </button>
            }
          />
        )}
      </Section>

      {hasTimetable && family !== "professional" && family !== "competition" && (
        <Section
          title="Confirmed schedule"
          id="lineup-sets"
          className="px-4"
          footer={`All times ${data.event.timezone} (CAT)`}
        >
          <div className="eb-list">
            {sets.map((p) => (
              <SetRow
                key={p.id}
                performance={p}
                stage={stageName(p.stageId)}
                saved={preferences.saved.includes(p.id)}
                disabled={!ready || p.status === "cancelled"}
                layoutFamily={family}
                onOpen={() => openSheet({ kind: "performance", performance: p })}
                onSave={() => toggleSaved(p.id)}
              />
            ))}
          </div>
        </Section>
      )}

      <Section title="Tools & export" id="lineup-tools" className="px-4">
        <div className="eb-list">
          <button type="button" className="eb-row" onClick={spin}>
            <IconTile icon={Shuffle} />
            <RowText
              title={`Discover ${/^[aeiou]/i.test(terms.personSingular) ? "an" : "a"} ${terms.personSingular.toLowerCase()}`}
              subtitle="Pick someone new from the published list"
            />
            <Chevron />
          </button>
          <button
            type="button"
            className="eb-row"
            disabled={!preferences.savedArtists.length || exportingPoster}
            onClick={async () => {
              setExportingPoster(true);
              try {
                const blob = await createLineupPoster(data, preferences.savedArtists);
                const url = URL.createObjectURL(blob);
                const link = document.createElement("a");
                link.href = url;
                link.download = `${data.event.slug}-my-lineup.png`;
                link.click();
                window.setTimeout(() => URL.revokeObjectURL(url), 1000);
              } catch {
                attendee.notify("Couldn’t export your lineup poster. Try again.", true);
              } finally {
                setExportingPoster(false);
              }
            }}
          >
            <IconTile icon={Music2} />
            <RowText
              title={
                terms.programLabel === "Lineup"
                  ? "Download my lineup poster"
                  : `Download my ${terms.programLabel.toLowerCase()} card`
              }
              subtitle={
                preferences.savedArtists.length ? "Shareable PNG card" : "Save favourites first"
              }
            />
            <Chevron />
          </button>
          <button
            type="button"
            className="eb-row disabled:opacity-100"
            disabled={mine.length === 0}
            onClick={() => downloadCalendar(data, mine)}
          >
            <IconTile icon={CalendarPlus} />
            <RowText
              title={
                <span className={mine.length ? "" : "text-muted-foreground"}>
                  Add {terms.isConferenceLike ? "sessions" : "sets"} to calendar
                </span>
              }
              subtitle={
                hasTimetable
                  ? mine.length
                    ? `${mine.length} saved`
                    : "Save scheduled items first"
                  : "Set times pending"
              }
            />
            <ArrowUpRight size={17} className="text-muted-foreground" aria-hidden />
          </button>
        </div>
      </Section>
    </div>
  );
}
