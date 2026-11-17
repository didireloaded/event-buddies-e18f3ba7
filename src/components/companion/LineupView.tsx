import { CalendarPlus, Check, Heart, Music2, Plus, Shuffle, TriangleAlert } from "lucide-react";
import { useState } from "react";
import type { FestivalArtist } from "@/lib/event/sound-of-summer";
import type { PerformanceRecord } from "@/lib/event/types";
import { downloadCalendar, eventTime, scheduleClashes } from "@/lib/attendee/schedule";
import { createLineupPoster } from "@/lib/attendee/recap-card";
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
  onOpen,
  onSave,
}: {
  artist: FestivalArtist;
  saved: boolean;
  disabled: boolean;
  onOpen: () => void;
  onSave: () => void;
}) {
  const { attendee, data } = useCompanion();
  const sharedNames = [
    ...new Set(
      attendee.preferences.sharedPlans
        .filter((entry) => entry.plan.artists.includes(artist.id))
        .map((entry) => entry.plan.name),
    ),
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
                    {sharedNames.length > 2 ? ` +${sharedNames.length - 2}` : ""} saved this artist
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
  const { data, attendee, openSheet, spin } = useCompanion();
  const { preferences, ready, toggleArtist, toggleSaved } = attendee;
  const [query, setQuery] = useState("");
  const [onlySaved, setOnlySaved] = useState<"all" | "saved">("all");
  const [stage, setStage] = useState("all");
  const [exportingPoster, setExportingPoster] = useState(false);
  const term = query.trim().toLowerCase();
  const stageName = (id: string) => data.stages.find((s) => s.id === id)?.name ?? "Stage";

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
      <h1 className="ios-large-title px-4 pt-2">Lineup</h1>
      <EventSections />
      <div className="space-y-2 bg-background px-4 pb-2 pt-2">
        <SearchField
          id="lineup-search"
          label="Search artists"
          placeholder="Search artists"
          value={query}
          onChange={setQuery}
          inputRef={searchRef}
        />
        <Segmented
          label="Show"
          value={onlySaved}
          onChange={setOnlySaved}
          options={[
            { value: "all", label: "All artists" },
            { value: "saved", label: `Favourites (${savedCount})` },
          ]}
        />
      </div>
      <div
        className="flex items-center justify-between gap-3 px-4 py-1"
        role="group"
        aria-label="Filter by stage"
      >
        <span className="text-[13px] text-muted-foreground">
          {hasTimetable ? "Stage schedule" : "Set times pending"}
        </span>
        <label className="min-w-0 max-w-[60%]">
          <span className="sr-only">Stage</span>
          <select
            className="min-h-11 w-full bg-transparent text-[15px] font-semibold"
            value={stage}
            onChange={(event) => setStage(event.target.value)}
          >
            <option value="all">All stages</option>
            {data.stages.map((item) => (
              <option key={item.id} value={item.id}>
                {item.name}
              </option>
            ))}
            <option value="tba">Stage not mapped</option>
          </select>
        </label>
      </div>

      {clashes.length > 0 && onlySaved === "saved" && (
        <div className="mt-3 px-4">
          <Notice icon={TriangleAlert} tone="warning">
            <strong className="font-semibold">
              {clashes.length} {clashes.length === 1 ? "clash" : "clashes"} in your lineup
            </strong>
            {clashes.map(([a, b]) => (
              <span key={`${a.id}-${b.id}`} className="block">
                {a.artistName} & {b.artistName} overlap
              </span>
            ))}
          </Notice>
        </div>
      )}

      <DayPlanPanel key={attendee.scope} />

      <Section
        title={`${artists.length} announced ${artists.length === 1 ? "artist" : "artists"}`}
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
                onOpen={() => openSheet({ kind: "artist", artist })}
                onSave={() => toggleArtist(artist.id)}
              />
            ))}
          </div>
        ) : (
          <div className="ios-card px-6 py-8 text-center">
            <Music2 size={28} className="mx-auto text-tertiary-foreground" aria-hidden />
            <p className="mt-2 text-[17px] font-semibold">
              {onlySaved === "saved" && !term ? "No favourites yet" : "No artists found"}
            </p>
            <p className="mt-1 text-[15px] text-muted-foreground">
              {onlySaved === "saved" && !term
                ? "Tap the heart beside an artist to save them here."
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
              Show all artists
            </button>
          </div>
        )}
      </Section>

      {hasTimetable && (
        <Section
          title="Sets"
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
              title="Discover an artist"
              subtitle="Random pick from artists you haven’t saved"
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
                  ? "All your saved artists, ready to share"
                  : "Save an artist to create your poster"
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
                    ? `${mine.length} saved ${mine.length === 1 ? "set" : "sets"}`
                    : "Save a set first"
                  : "Unavailable until set times are published"
              }
            />
          </button>
        </div>
      </Section>
    </>
  );
}
