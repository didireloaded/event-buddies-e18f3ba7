import {
  CalendarPlus,
  Check,
  Heart,
  Info,
  Music2,
  Plus,
  Shuffle,
  TriangleAlert,
} from "lucide-react";
import { useState } from "react";
import { suggestDayPlan } from "@/lib/day-plan/day-plan.functions";
import type { DayPlan } from "@/lib/day-plan/schema";
import type { FestivalArtist } from "@/lib/event/sound-of-summer";
import type { PerformanceRecord } from "@/lib/event/types";
import { downloadCalendar, eventTime, scheduleClashes } from "@/lib/attendee/schedule";
import { cn } from "@/lib/utils";
import { initials, useCompanion } from "./context";
import { ArtistAvatar } from "./ArtistAvatar";
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
      <a
        href={`https://open.spotify.com/search/${encodeURIComponent(artist.name)}`}
        target="_blank"
        rel="noreferrer"
        aria-label={`Find ${artist.name} on Spotify, opens in a new tab`}
        className="grid min-h-11 flex-none place-items-center px-2 text-[13px] font-semibold"
      >
        Spotify ↗
      </a>
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
  const [plan, setPlan] = useState<DayPlan | null>(null);
  const [planState, setPlanState] = useState<"idle" | "loading" | "error">("idle");
  const [planError, setPlanError] = useState<string | null>(null);
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
  const suggestPlan = async () => {
    setPlanState("loading");
    setPlanError(null);
    try {
      const result = await suggestDayPlan({
        data: {
          savedArtistIds: preferences.savedArtists,
          meeting: preferences.meeting,
        },
      });
      if (!result.ok) {
        setPlanState("error");
        setPlanError(result.error);
        return;
      }
      setPlan(result.plan);
      setPlanState("idle");
    } catch {
      setPlanState("error");
      setPlanError("Couldn’t reach the planning service. Try again.");
    }
  };

  return (
    <>
      <h1 className="ios-large-title px-4 pt-2">Lineup</h1>
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
        className="scrollbar-none flex gap-2 overflow-x-auto px-4 py-1"
        role="group"
        aria-label="Filter by stage"
      >
        {[
          { id: "all", label: "All stages" },
          ...data.stages.map((s) => ({ id: s.id, label: s.name.replace(" Stage", "") })),
          { id: "tba", label: "Stage TBA" },
        ].map((option) => (
          <button
            key={option.id}
            type="button"
            className="ios-chip"
            aria-pressed={stage === option.id}
            onClick={() => setStage(option.id)}
          >
            {option.label}
          </button>
        ))}
      </div>

      {!hasTimetable && (
        <div className="mt-3 px-4">
          <Notice icon={Info} tone="warning">
            <strong className="font-semibold">Timetable not published yet.</strong> These are the
            announced artists. Stage billing follows the supplied announcement posts. Set times are
            awaiting publication.
          </Notice>
        </div>
      )}

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
          <button
            type="button"
            className="ios-row"
            onClick={suggestPlan}
            disabled={planState === "loading"}
          >
            <IconTile icon={CalendarPlus} tone="bg-favorite" />
            <RowText
              title="Suggest my day plan"
              subtitle={
                planState === "loading"
                  ? "Building a plan from your saved artists…"
                  : "Use favourites and your saved meeting time"
              }
            />
            <Chevron />
          </button>
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
        {planError && (
          <Notice icon={Info} tone="warning">
            <strong className="font-semibold">Couldn’t build a plan.</strong> {planError}
            <button type="button" className="ml-2 font-semibold underline" onClick={suggestPlan}>
              Try again
            </button>
          </Notice>
        )}
        {plan && (
          <div className="mt-3 ios-group ios-group-indent" aria-live="polite">
            <div className="px-4 py-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 className="text-[20px] font-bold">Your suggested day</h2>
                  <p className="mt-1 text-[15px] text-muted-foreground">{plan.summary}</p>
                </div>
                <button
                  type="button"
                  className="text-[15px] font-semibold text-primary"
                  onClick={() => setPlan(null)}
                >
                  Clear
                </button>
              </div>
              <ol className="mt-4 divide-y divide-border">
                {plan.items.map((item, index) => (
                  <li key={`${item.kind}-${index}`} className="py-3 first:pt-0 last:pb-0">
                    <div className="flex gap-3">
                      <time className="w-20 flex-none text-[15px] font-semibold tabular-nums">
                        {item.time}
                      </time>
                      <div className="min-w-0">
                        <p className="font-semibold">{item.title}</p>
                        {item.place && (
                          <p className="text-[15px] text-muted-foreground">{item.place}</p>
                        )}
                        <p className="mt-0.5 text-[15px] text-muted-foreground">{item.detail}</p>
                      </div>
                    </div>
                  </li>
                ))}
              </ol>
              <p className="mt-4 text-[14px] text-muted-foreground">
                {plan.note} This plan is saved on this device only.
              </p>
            </div>
          </div>
        )}
      </Section>
    </>
  );
}
