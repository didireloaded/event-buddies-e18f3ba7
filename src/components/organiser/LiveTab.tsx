import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Json } from "@/integrations/supabase/types";
import { dbError } from "@/lib/organiser/data";
import {
  readLocalPublishedEvents,
  readStoredSitePlanZoomUrl,
  saveLocalPublishedEvent,
} from "@/lib/organiser/event-adapter";
import {
  cleanupExpiredEventData,
  getOrganiserEventAggregates,
  listEventBroadcasts,
  sendOrganiserBroadcast,
  type OrganiserBroadcast,
  type OrganiserEventAggregates,
} from "@/lib/organiser/cloud-extensions";
import {
  BROADCAST_LIMIT,
  parseProgram,
  parseZones,
  type ProgramItem,
  type ZoneItem,
} from "@/lib/organiser/schema";
import { PrimaryButton, SecondaryButton, Section } from "@/components/companion/ui";
import type { OrgCtx } from "./OrganiserApp";

type ChangeEntry = {
  at: string;
  summary: string;
  previousProgram: ProgramItem[];
};

type VenueIssue = {
  id: string;
  zone: string;
  note: string;
  resolved: boolean;
  createdAt: string;
};

function readIssues(eventId: string): VenueIssue[] {
  try {
    const raw = JSON.parse(localStorage.getItem(`event-buddies:org-issues:${eventId}`) ?? "[]");
    return Array.isArray(raw) ? (raw as VenueIssue[]) : [];
  } catch {
    return [];
  }
}

function writeIssues(eventId: string, list: VenueIssue[]) {
  try {
    localStorage.setItem(`event-buddies:org-issues:${eventId}`, JSON.stringify(list));
  } catch {
    /* Ignore quota failures. */
  }
}

export function LiveTab({ ctx }: { ctx: OrgCtx }) {
  const published = ctx.events.filter((e) => e.status === "published");
  const [selectedId, setSelectedId] = useState(published[0]?.id ?? "");
  const active = published.find((e) => e.id === selectedId) ?? published[0] ?? null;
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [draftTime, setDraftTime] = useState("");
  const [draftPlace, setDraftPlace] = useState("");
  const [draftStatus, setDraftStatus] = useState<ProgramItem["status"]>("scheduled");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [changelog, setChangelog] = useState<ChangeEntry[]>([]);

  const [broadcasts, setBroadcasts] = useState<OrganiserBroadcast[]>([]);
  const [broadcastKind, setBroadcastKind] = useState<"update" | "emergency">("update");
  const [broadcastText, setBroadcastText] = useState("");
  const [confirmEmergency, setConfirmEmergency] = useState(false);
  const [broadcastBusy, setBroadcastBusy] = useState(false);
  const [broadcastNotice, setBroadcastNotice] = useState("");
  const [aggregates, setAggregates] = useState<OrganiserEventAggregates | null>(null);
  const [issues, setIssues] = useState<VenueIssue[]>(() => (active ? readIssues(active.id) : []));
  const [issueZone, setIssueZone] = useState("");
  const [issueNote, setIssueNote] = useState("");
  const [cleanupBusy, setCleanupBusy] = useState(false);
  const [cleanupNotice, setCleanupNotice] = useState("");

  useEffect(() => {
    if (!active) return;
    setIssues(readIssues(active.id));
    let mounted = true;
    void Promise.all([listEventBroadcasts(active.id), getOrganiserEventAggregates(active.id)]).then(
      ([bList, aggs]) => {
        if (!mounted) return;
        setBroadcasts(bList);
        setAggregates(aggs);
      },
    );
    return () => {
      mounted = false;
    };
  }, [active]);

  if (!active) {
    return (
      <div className="py-10">
        <h1 className="ios-large-title">Live event</h1>
        <div className="ios-card mt-5 space-y-4 p-6 text-center">
          <h2 className="text-[20px] font-semibold">No live published events</h2>
          <p className="text-[15px] text-muted-foreground">
            Publish an event from Events first to manage day-of schedule updates.
          </p>
          <PrimaryButton onClick={() => ctx.go("events")}>Go to Events</PrimaryButton>
        </div>
      </div>
    );
  }

  const program = parseProgram(active.program);
  const timed = program
    .map((item, index) => ({ item, index }))
    .filter(({ item }) => /^\d{2}:\d{2}$/.test(item.time))
    .sort((a, b) => a.item.time.localeCompare(b.item.time));
  const untimed = program
    .map((item, index) => ({ item, index }))
    .filter(({ item }) => !/^\d{2}:\d{2}$/.test(item.time));

  async function saveProgram(nextProgram: ProgramItem[], summary: string, recordUndo = true) {
    if (!active || busy) return;
    setBusy(true);
    setError("");
    const previousProgram = program;
    const { error: updErr } = await supabase
      .from("organiser_events")
      .update({ program: nextProgram as unknown as Json })
      .eq("id", active.id);
    setBusy(false);
    if (updErr) {
      setError(dbError(updErr.message));
      return;
    }
    const cached = readLocalPublishedEvents().find((ev) => ev.id === active.id);
    saveLocalPublishedEvent({
      id: active.id,
      eventType: active.event_type,
      name: active.name,
      startDate: active.start_date,
      endDate: active.end_date,
      venue: active.venue,
      gatesOpen: active.gates_open,
      entryRules: active.entry_rules,
      program: nextProgram,
      zones: parseZones(active.zones),
      sitePlanPath: active.site_plan_path,
      sitePlanUrl: cached?.sitePlanUrl ?? null,
      sitePlanZoomUrl: cached?.sitePlanZoomUrl ?? readStoredSitePlanZoomUrl(active.id),
      publishedAt: cached?.publishedAt ?? new Date().toISOString(),
    });
    if (recordUndo) {
      setChangelog((prev) => [
        {
          at: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
          summary,
          previousProgram,
        },
        ...prev.slice(0, 9),
      ]);
    }
    setEditingIndex(null);
    await ctx.reload();
  }

  async function handleSendBroadcast() {
    if (!active || broadcastBusy) return;
    if (broadcastKind === "emergency" && !confirmEmergency) {
      setError("Confirm the emergency alert checkbox before sending.");
      return;
    }
    setBroadcastBusy(true);
    setError("");
    setBroadcastNotice("");
    const result = await sendOrganiserBroadcast({
      eventId: active.id,
      kind: broadcastKind,
      message: broadcastText,
    });
    setBroadcastBusy(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setBroadcasts((prev) => [result.broadcast, ...prev]);
    setBroadcastText("");
    setConfirmEmergency(false);
    setBroadcastNotice(
      "Published to the in-app Event updates feed. Browser push notifications remain disabled until a push provider is configured.",
    );
  }

  function escapeCsvCell(value: string) {
    const safe = /^[=+\-@\t\r]/.test(value) ? `'${value}` : value;
    return `"${safe.replace(/"/g, '""')}"`;
  }

  function exportAggregatesCsv() {
    if (!active || !aggregates) return;
    const csv = [
      "event_id,event_name,saved_plans_count,crews_count,crew_members_count,active_pins_count",
      `${escapeCsvCell(active.id)},${escapeCsvCell(active.name)},${aggregates.savedPlansCount},${aggregates.crewsCount},${aggregates.crewMembersCount},${aggregates.activePinsCount}`,
    ].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${(active.name || "event").toLowerCase().replace(/[^a-z0-9]+/g, "-")}-counts.csv`;
    link.click();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  return (
    <div className="py-4">
      <h1 className="ios-large-title">Live event</h1>
      {published.length > 1 && (
        <label className="mt-3 block text-[15px] font-semibold">
          Event
          <select
            className="ios-field mt-1"
            value={active.id}
            onChange={(e) => setSelectedId(e.target.value)}
          >
            {published.map((e) => (
              <option key={e.id} value={e.id}>
                {e.name}
              </option>
            ))}
          </select>
        </label>
      )}
      <p className="mt-1 text-[16px] text-muted-foreground">
        {active.name} · {active.venue || "Venue pending"}
      </p>

      {error && (
        <p role="alert" className="mt-3 rounded-xl bg-warning-soft px-4 py-3 text-[15px]">
          {error}
        </p>
      )}

      {timed.length > 0 && (
        <Section title="Verified schedule" id="org-live-timed">
          <div className="ios-group">
            {timed.map(({ item, index }) => (
              <div key={index} className="ios-row items-center justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <p className="text-[16px] font-semibold">
                    <span className="tabular-nums">{item.time}</span> · {item.title}
                  </p>
                  <p className="text-[14px] text-muted-foreground">
                    {item.place || "Place pending"} · {item.status}
                  </p>
                </div>
                <button
                  type="button"
                  className="min-h-11 px-2 text-[15px] font-semibold text-primary"
                  onClick={() => {
                    setEditingIndex(index);
                    setDraftTime(item.time);
                    setDraftPlace(item.place);
                    setDraftStatus(item.status);
                  }}
                >
                  Update
                </button>
              </div>
            ))}
          </div>
        </Section>
      )}

      {untimed.length > 0 && (
        <Section title="Unscheduled items" id="org-live-untimed">
          <div className="ios-group">
            {untimed.map(({ item, index }) => (
              <div key={index} className="ios-row items-center justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <p className="text-[16px] font-semibold">{item.title}</p>
                  <p className="text-[14px] text-muted-foreground">
                    Time pending · {item.place || "Place pending"} · {item.status}
                  </p>
                </div>
                <button
                  type="button"
                  className="min-h-11 px-2 text-[15px] font-semibold text-primary"
                  onClick={() => {
                    setEditingIndex(index);
                    setDraftTime(item.time);
                    setDraftPlace(item.place);
                    setDraftStatus(item.status);
                  }}
                >
                  Update
                </button>
              </div>
            ))}
          </div>
        </Section>
      )}

      {editingIndex !== null && program[editingIndex] && (
        <Section title={`Update ${program[editingIndex]!.title}`} id="org-live-edit">
          <div className="ios-card space-y-3 p-4">
            <div className="grid grid-cols-2 gap-2">
              <label className="block text-[14px] font-semibold">
                Time (HH:MM)
                <input
                  className="ios-field mt-1"
                  value={draftTime}
                  placeholder="18:30"
                  onChange={(e) => setDraftTime(e.target.value)}
                />
              </label>
              <label className="block text-[14px] font-semibold">
                Place
                <input
                  className="ios-field mt-1"
                  value={draftPlace}
                  onChange={(e) => setDraftPlace(e.target.value)}
                />
              </label>
            </div>
            <label className="block text-[14px] font-semibold">
              Status
              <select
                className="ios-field mt-1"
                value={draftStatus}
                onChange={(e) => setDraftStatus(e.target.value as ProgramItem["status"])}
              >
                <option value="scheduled">Scheduled</option>
                <option value="delayed">Delayed</option>
                <option value="moved">Moved</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </label>
            <div className="flex gap-2">
              <PrimaryButton
                disabled={busy}
                onClick={() => {
                  const next = program.map((row, i) =>
                    i === editingIndex
                      ? {
                          ...row,
                          time: draftTime.trim(),
                          place: draftPlace.trim(),
                          status: draftStatus,
                        }
                      : row,
                  );
                  void saveProgram(
                    next,
                    `${program[editingIndex]!.title} → ${draftStatus}${draftTime.trim() ? ` (${draftTime.trim()})` : ""}`,
                  );
                }}
              >
                Save update
              </PrimaryButton>
              <SecondaryButton onClick={() => setEditingIndex(null)}>Cancel</SecondaryButton>
            </div>
          </div>
        </Section>
      )}

      {changelog.length > 0 && (
        <Section title="Recent session updates" id="org-live-changelog">
          <ul className="ios-card divide-y divide-border p-4 text-[14px]">
            {changelog.map((entry, idx) => (
              <li key={idx} className="flex items-center justify-between gap-2 py-2">
                <span>
                  <strong>{entry.at}</strong> — {entry.summary}
                </span>
                {idx === 0 && (
                  <button
                    type="button"
                    disabled={busy}
                    className="min-h-11 font-semibold text-primary"
                    onClick={() => {
                      const prev = entry.previousProgram;
                      setChangelog((list) => list.slice(1));
                      void saveProgram(prev, "Reverted last update", false);
                    }}
                  >
                    Undo
                  </button>
                )}
              </li>
            ))}
          </ul>
        </Section>
      )}

      <Section title="One-way attendee broadcast" id="org-live-broadcast">
        <div className="ios-card space-y-3 p-4">
          <p className="text-[14px] text-muted-foreground">
            Posts to the in-app Event updates sheet for this event. Push notifications require a
            push provider before background delivery is available.
          </p>
          <label className="block text-[14px] font-semibold">
            Broadcast type
            <select
              className="ios-field mt-1"
              value={broadcastKind}
              onChange={(e) => {
                setBroadcastKind(e.target.value as "update" | "emergency");
                setConfirmEmergency(false);
              }}
            >
              <option value="update">Event update</option>
              <option value="emergency">Emergency / safety alert</option>
            </select>
          </label>
          <label className="block text-[14px] font-semibold">
            Message ({broadcastText.length}/{BROADCAST_LIMIT})
            <textarea
              rows={3}
              maxLength={BROADCAST_LIMIT}
              className="ios-field mt-1"
              value={broadcastText}
              placeholder="Stage delay, gate advice or safety notice…"
              onChange={(e) => setBroadcastText(e.target.value)}
            />
          </label>
          {broadcastKind === "emergency" && (
            <label className="flex min-h-11 items-center gap-3 text-[14px] font-medium">
              <input
                type="checkbox"
                className="size-5 accent-primary"
                checked={confirmEmergency}
                onChange={(e) => setConfirmEmergency(e.target.checked)}
              />
              Confirm this is an urgent safety alert for attendees of {active.name}
            </label>
          )}
          <PrimaryButton
            disabled={
              broadcastBusy ||
              !broadcastText.trim() ||
              (broadcastKind === "emergency" && !confirmEmergency)
            }
            onClick={() => void handleSendBroadcast()}
          >
            {broadcastBusy
              ? "Publishing…"
              : broadcastKind === "emergency"
                ? "Publish emergency alert"
                : "Publish event update"}
          </PrimaryButton>
          {broadcastNotice && (
            <p role="status" className="text-[14px] text-muted-foreground">
              {broadcastNotice}
            </p>
          )}
          {broadcasts.length > 0 && (
            <ul className="divide-y divide-border border-t border-border pt-2 text-[14px]">
              {broadcasts.map((b) => (
                <li key={b.id} className="py-2">
                  <span className="font-semibold uppercase text-primary">{b.kind}</span> ·{" "}
                  <span className="text-muted-foreground">
                    {new Date(b.createdAt).toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </span>
                  <p className="mt-0.5">{b.message}</p>
                </li>
              ))}
            </ul>
          )}
        </div>
      </Section>

      <Section title="Aggregate attendance counts" id="org-live-aggregates">
        <div className="ios-card space-y-3 p-4 text-[14px]">
          {aggregates ? (
            <>
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-xl bg-secondary p-3">
                  <p className="text-[22px] font-bold tabular-nums">{aggregates.savedPlansCount}</p>
                  <p className="text-muted-foreground">Saved plans</p>
                </div>
                <div className="rounded-xl bg-secondary p-3">
                  <p className="text-[22px] font-bold tabular-nums">{aggregates.crewsCount}</p>
                  <p className="text-muted-foreground">Private crews</p>
                </div>
                <div className="rounded-xl bg-secondary p-3">
                  <p className="text-[22px] font-bold tabular-nums">
                    {aggregates.crewMembersCount}
                  </p>
                  <p className="text-muted-foreground">Crew members</p>
                </div>
                <div className="rounded-xl bg-secondary p-3">
                  <p className="text-[22px] font-bold tabular-nums">{aggregates.activePinsCount}</p>
                  <p className="text-muted-foreground">Active landmark pins</p>
                </div>
              </div>
              <SecondaryButton onClick={exportAggregatesCsv}>
                Download counts-only CSV
              </SecondaryButton>
            </>
          ) : (
            <p className="text-muted-foreground">
              Aggregate attendance counts aren’t available yet. Apply{" "}
              <code>backend/cloud/organiser-and-crew-extensions.sql</code> in Lovable Cloud to
              enable counts-only summaries. Individual attendee profiles and locations are never
              exposed to organisers.
            </p>
          )}
          <div className="border-t border-border pt-3">
            <SecondaryButton
              disabled={cleanupBusy}
              onClick={async () => {
                if (cleanupBusy) return;
                setCleanupBusy(true);
                setCleanupNotice("");
                try {
                  const res = await cleanupExpiredEventData();
                  if (!res) {
                    setCleanupNotice(
                      "Expired pins and invites are filtered automatically on read.",
                    );
                  } else {
                    setCleanupNotice(
                      `Cleared ${res.clearedPins} expired landmark pins and ${res.clearedInvites} expired invites.`,
                    );
                  }
                } finally {
                  setCleanupBusy(false);
                }
              }}
            >
              {cleanupBusy ? "Purging expired records…" : "Purge expired landmark pins & invites"}
            </SecondaryButton>
            {cleanupNotice && (
              <p role="status" className="mt-2 text-[13px] text-muted-foreground">
                {cleanupNotice}
              </p>
            )}
          </div>
        </div>
      </Section>

      <Section title="Venue operations & issue log" id="org-live-issues">
        <div className="ios-card space-y-3 p-4">
          {parseZones(active.zones).length > 0 && (
            <div className="space-y-2 border-b border-border pb-3">
              <p className="text-[14px] font-semibold">Live zone status</p>
              {parseZones(active.zones).map((z, idx) => (
                <div key={idx} className="flex items-center justify-between gap-2 text-[14px]">
                  <span className="min-w-0 flex-1 break-words font-medium">
                    {z.name} <span className="text-muted-foreground">({z.type})</span>
                  </span>
                  <select
                    aria-label={`${z.name} live status`}
                    disabled={busy}
                    className="ios-field w-auto py-1"
                    value={z.status}
                    onChange={async (e) => {
                      if (busy) return;
                      const nextStatus = e.target.value as ZoneItem["status"];
                      const nextZones = parseZones(active.zones).map((item, i) =>
                        i === idx ? { ...item, status: nextStatus } : item,
                      );
                      setBusy(true);
                      setError("");
                      try {
                        const { error: updErr } = await supabase
                          .from("organiser_events")
                          .update({ zones: nextZones as unknown as Json })
                          .eq("id", active.id);
                        if (updErr) {
                          setError(dbError(updErr.message));
                          return;
                        }
                        const cached = readLocalPublishedEvents().find((ev) => ev.id === active.id);
                        saveLocalPublishedEvent({
                          id: active.id,
                          eventType: active.event_type,
                          name: active.name,
                          startDate: active.start_date,
                          endDate: active.end_date,
                          venue: active.venue,
                          gatesOpen: active.gates_open,
                          entryRules: active.entry_rules,
                          program: parseProgram(active.program),
                          zones: nextZones,
                          sitePlanPath: active.site_plan_path,
                          sitePlanUrl: cached?.sitePlanUrl ?? null,
                          sitePlanZoomUrl:
                            cached?.sitePlanZoomUrl ?? readStoredSitePlanZoomUrl(active.id),
                          publishedAt: cached?.publishedAt ?? new Date().toISOString(),
                        });
                        await ctx.reload();
                      } finally {
                        setBusy(false);
                      }
                    }}
                  >
                    <option value="open">Open</option>
                    <option value="busy">Busy</option>
                    <option value="closed">Closed</option>
                  </select>
                </div>
              ))}
            </div>
          )}

          <form
            className="space-y-2"
            onSubmit={(e) => {
              e.preventDefault();
              if (!issueNote.trim()) return;
              const entry: VenueIssue = {
                id: crypto.randomUUID(),
                zone: issueZone.trim() || "General venue",
                note: issueNote.trim(),
                resolved: false,
                createdAt: new Date().toLocaleTimeString([], {
                  hour: "2-digit",
                  minute: "2-digit",
                }),
              };
              const next = [entry, ...issues];
              setIssues(next);
              writeIssues(active.id, next);
              setIssueZone("");
              setIssueNote("");
            }}
          >
            <div className="grid grid-cols-2 gap-2">
              <input
                aria-label="Issue zone or point"
                className="ios-field"
                maxLength={60}
                placeholder="Zone (e.g. North Gate, Bar 2)"
                value={issueZone}
                onChange={(e) => setIssueZone(e.target.value)}
              />
              <input
                aria-label="Operational issue description"
                className="ios-field"
                maxLength={140}
                placeholder="Restock ice, queue support…"
                value={issueNote}
                onChange={(e) => setIssueNote(e.target.value)}
              />
            </div>
            <SecondaryButton type="submit" disabled={!issueNote.trim()}>
              Log venue issue
            </SecondaryButton>
          </form>

          {issues.length > 0 && (
            <ul className="divide-y divide-border pt-2 text-[14px]">
              {issues.map((item) => (
                <li key={item.id} className="flex items-center justify-between gap-2 py-2">
                  <span
                    className={`min-w-0 flex-1 break-words ${item.resolved ? "line-through text-muted-foreground" : ""}`}
                  >
                    <strong>{item.zone}</strong> · {item.note}{" "}
                    <span className="text-[12px] text-muted-foreground">({item.createdAt})</span>
                  </span>
                  <button
                    type="button"
                    className="min-h-11 flex-none px-2 text-[13px] font-semibold text-primary"
                    onClick={() => {
                      const next = issues.map((row) =>
                        row.id === item.id ? { ...row, resolved: !row.resolved } : row,
                      );
                      setIssues(next);
                      writeIssues(active.id, next);
                    }}
                  >
                    {item.resolved ? "Reopen" : "Resolve"}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </Section>
    </div>
  );
}
