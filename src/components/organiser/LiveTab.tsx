import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Json } from "@/integrations/supabase/types";
import { dbError } from "@/lib/organiser/data";
import { parseProgram, type ProgramItem } from "@/lib/organiser/schema";
import { PrimaryButton, SecondaryButton, Section } from "@/components/companion/ui";
import type { OrgCtx } from "./OrganiserApp";

type ChangeEntry = {
  at: string;
  summary: string;
  previousProgram: ProgramItem[];
};

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

      <Section title="Attendee broadcasts & counts" id="org-live-blocked">
        <div className="ios-card space-y-2 p-4 text-[14px] text-muted-foreground">
          <p className="font-semibold text-foreground">Push & announcement delivery unavailable</p>
          <p>
            One-way attendee broadcasts and emergency alerts require an approved push provider and
            announcement delivery table before sends can be confirmed.
          </p>
          <p>
            Aggregate attendance counts aren’t collected yet. Individual attendee profiles and
            locations are never exposed to organisers.
          </p>
        </div>
      </Section>
    </div>
  );
}
