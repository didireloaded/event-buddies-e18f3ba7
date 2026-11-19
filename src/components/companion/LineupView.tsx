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
import { cn } from "@/lib/utils";
import { initials, useCompanion } from "./context";
import { DayPlanPanel } from "./DayPlanPanel";
import { ArtistAvatar } from "./ArtistAvatar";
import { EventSections } from "./EventSections";
import { Chevron, IconTile, Notice, RowText, SearchField, Section, Segmented } from "./ui";

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
    <div className="ios-row gap-0 p-0 pl-4">
      <button
        type="button"
        onClick={onOpen}
        className="flex min-h-14 min-w-0 flex-1 items-center gap-3 py-2 text-left"
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
                <span className="mt-1 flex flex-wrap items-center gap-1 text-[14px] text-favorite">
                  {sharedNames.slice(0, 2).map((name) => (
                    <span
                      key={name}
                      aria-hidden
                      className="grid size-6 place-items-center rounded-full bg-favorite-soft font-semibold"
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
          saved ? "text-favorite" : "text-tertiary-foreground",
        )}
      >
        <Heart size={22} fill={saved ? "currentColor" : "none"} aria-hidden />
      </button>
    </div>
  );
}

function SetRow({
  performance,
  stage,
  saved,
  disabled,
  onOpen,
  onSave,
}: {
  performance: PerformanceRecord;
  stage: string;
  saved: boolean;
  disabled: boolean;
  onOpen: () => void;
  onSave: () => void;
}) {
  return (
    <div className="ios-row gap-0 p-0 pl-4">
      <button
        type="button"
        onClick={onOpen}
        className="flex min-h-14 min-w-0 flex-1 items-center gap-3 py-2 text-left"
      >
        <time className="w-12 flex-none text-[15px] font-semibold tabular-nums">
          {eventTime(performance.scheduledStart)}
        </time>
        <RowText
          title={<span className="font-semibold">{performance.artistName}</span>}
          subtitle={`${stage}${performance.genre ? ` · ${performance.genre}` : ""}${performance.status === "cancelled" ? " · Cancelled" : ""}`}
        />
      </button>
      <button
        type="button"
        disabled={disabled}
        aria-pressed={saved}
        aria-label={`${saved ? "Remove" : "Add"} ${performance.artistName} ${eventTime(performance.scheduledStart)}`}
        onClick={onSave}
        className={cn(
          "grid size-12 flex-none place-items-center",
          saved ? "text-favorite" : "text-tertiary-foreground",
        )}
      >
        {saved ? <Check size={22} /> : <Plus size={22} />}
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
  const terms = getEventCategoryTerms(data.event.category);
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

  return (
    <>
      <h1 className="ios-large-title px-4 pt-2">{terms.programLabel}</h1>
      <EventSections />

      {/* Visual Featured Headliners Header */}
      {featured.length > 0 && onlySaved === "all" && stage === "all" && !term && (
        <section className="mx-4 mb-3 space-y-2" aria-label="Featured">
          <div className="scrollbar-none flex gap-2.5 overflow-x-auto pb-1">
            {featured.map((act) => (
              <button
                key={act.id}
                type="button"
                onClick={() => openSheet({ kind: "artist", artist: act })}
                className="ios-press flex w-44 flex-none items-center gap-3 rounded-2xl bg-popover p-3 text-left ring-1 ring-border/70"
              >
                <ArtistAvatar artist={act} />
                <span className="min-w-0 flex-1">
                  <span className="block text-[11px] font-semibold uppercase tracking-wide text-primary">
                    {act.isHeadliner
                      ? terms.isConferenceLike
                        ? "Keynote"
                        : "Headliner"
                      : "Featured"}
                  </span>
                  <span className="block truncate text-[15px] font-bold">{act.name}</span>
                  <span className="block truncate text-[12px] text-muted-foreground">
                    {act.stageName ?? act.role}
                  </span>
                </span>
              </button>
            ))}
          </div>
        </section>
      )}

      <div className="space-y-2 bg-background px-4 pb-2 pt-1">
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

      {/* Horizontal visual stage/room filter pills */}
      <div
        className="scrollbar-none flex gap-2 overflow-x-auto px-4 py-2"
        role="group"
        aria-label={`Filter by ${terms.placeSingular.toLowerCase()}`}
      >
        <button
          type="button"
          className="ios-chip"
          aria-pressed={stage === "all"}
          onClick={() => setStage("all")}
        >
          All {terms.placesLabel.toLowerCase()}
        </button>
        {data.stages.map((item) => (
          <button
            key={item.id}
            type="button"
            className="ios-chip"
            aria-pressed={stage === item.id}
            onClick={() => setStage(item.id)}
          >
            {item.name}
          </button>
        ))}
        {hasUnmapped && (
          <button
            type="button"
            className="ios-chip"
            aria-pressed={stage === "tba"}
            onClick={() => setStage("tba")}
          >
            {terms.placeSingular} TBA
          </button>
        )}
      </div>

      {/* Stage detail card when a specific stage/room is selected */}
      {activeStage && (
        <section className="mx-4 mt-2 rounded-2xl bg-popover p-4 ring-1 ring-border">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-[12px] font-semibold uppercase tracking-wide text-primary">
                {terms.placeSingular}
              </p>
              <h2 className="text-[20px] font-bold">{activeStage.name}</h2>
              <p className="mt-0.5 text-[14px] text-muted-foreground">
                {artists.length}{" "}
                {artists.length === 1
                  ? terms.personSingular.toLowerCase()
                  : terms.peopleLabel.toLowerCase()}{" "}
                · {hasTimetable ? "Confirmed times below" : "Set times awaiting publication"}
              </p>
            </div>
            <button
              type="button"
              onClick={() => openPlace(activeStage.id)}
              className="ios-press inline-flex min-h-11 flex-none items-center gap-1 rounded-full bg-favorite-soft px-3.5 text-[14px] font-semibold text-primary"
            >
              <MapPin size={15} aria-hidden /> View on Map
            </button>
          </div>
        </section>
      )}

      {clashes.length > 0 && onlySaved === "saved" && (
        <div className="mt-3 px-4">
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

      <Section
        title={`${artists.length} announced ${artists.length === 1 ? terms.personSingular.toLowerCase() : terms.peopleLabel.toLowerCase()}`}
        id="lineup-artists"
        className="mt-5 px-4"
      >
        {artists.length ? (
          <div className="ios-group ios-group-indent">
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
        ) : (
          <div className="ios-card px-6 py-8 text-center">
            <Music2 size={28} className="mx-auto text-tertiary-foreground" aria-hidden />
            <p className="mt-2 text-[17px] font-semibold">
              {onlySaved === "saved" && !term
                ? "No favourites yet"
                : `No ${terms.peopleLabel.toLowerCase()} found`}
            </p>
            <p className="mt-1 text-[15px] text-muted-foreground">
              {onlySaved === "saved" && !term
                ? "Tap the heart beside any act to save them here."
                : "Try another name or clear the filters."}
            </p>
            <button
              type="button"
              className="mt-3 min-h-11 px-3 text-[17px] font-semibold text-primary"
              onClick={() => {
                setQuery("");
                setStage("all");
                setOnlySaved("all");
              }}
            >
              Show all {terms.peopleLabel.toLowerCase()}
            </button>
          </div>
        )}
      </Section>

      {hasTimetable && (
        <Section
          title={terms.isConferenceLike ? "Sessions" : "Sets"}
          id="lineup-sets"
          className="px-4"
          footer={`All times ${data.event.timezone} (CAT)`}
        >
          <div className="ios-group">
            {sets.map((p) => (
              <SetRow
                key={p.id}
                performance={p}
                stage={stageName(p.stageId)}
                saved={preferences.saved.includes(p.id)}
                disabled={!ready || p.status === "cancelled"}
                onOpen={() => openSheet({ kind: "performance", performance: p })}
                onSave={() => toggleSaved(p.id)}
              />
            ))}
          </div>
        </Section>
      )}

      <Section title="Plan" id="lineup-tools" className="px-4">
        <div className="ios-group ios-group-indent">
          <button type="button" className="ios-row" onClick={spin}>
            <IconTile icon={Shuffle} tone="bg-favorite" />
            <RowText
              title={`Discover ${/^[aeiou]/i.test(terms.personSingular) ? "an" : "a"} ${terms.personSingular.toLowerCase()}`}
              subtitle="Random pick from entries you haven’t saved"
            />
            <Chevron />
          </button>
          <button
            type="button"
            className="ios-row"
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
              title="Download my lineup poster"
              subtitle={
                preferences.savedArtists.length
                  ? "All your saved favourites, ready to share"
                  : "Save a favourite to create your poster"
              }
            />
            <Chevron />
          </button>
          <button
            type="button"
            className="ios-row disabled:opacity-100"
            disabled={mine.length === 0}
            onClick={() => downloadCalendar(data, mine)}
          >
            <IconTile icon={CalendarPlus} tone={mine.length ? "bg-pin-entrance" : "bg-pin-other"} />
            <RowText
              title={
                <span className={mine.length ? "" : "text-muted-foreground"}>
                  Add sets to calendar
                </span>
              }
              subtitle={
                hasTimetable
                  ? mine.length
                    ? `${mine.length} saved ${mine.length === 1 ? "item" : "items"}`
                    : "Save a scheduled item first"
                  : "Unavailable until set times are published"
              }
            />
            <ArrowUpRight size={17} className="text-muted-foreground" aria-hidden />
          </button>
        </div>
      </Section>
    </>
  );
}
