import { useCallback, useEffect, useState } from "react";
import {
  CheckCircle2,
  Car,
  Download,
  HelpCircle,
  MessageSquare,
  Share2,
  ShieldAlert,
} from "lucide-react";
import { activeLandmarkPin } from "@/lib/attendee/lifecycle";
import { createCrewYearbookCard } from "@/lib/attendee/recap-card";
import { eventTime } from "@/lib/attendee/schedule";
import {
  crewActivitySchema,
  crewListActivities,
  crewPostActivity,
  crewVotePoll,
  type CrewActivity,
} from "@/lib/organiser/cloud-extensions";
import { useCompanion } from "./context";
import { Sheet } from "./Sheet";
import { PrimaryButton, SecondaryButton, Section } from "./ui";

const QUICK_PINGS: { label: string; kind: CrewActivity["kind"]; message: string }[] = [
  { label: "At the stage", kind: "ping", message: "At the stage" },
  { label: "Bar run", kind: "ping", message: "Heading for a bar run" },
  { label: "Toilets", kind: "ping", message: "Heading to the toilets" },
  { label: "Regroup", kind: "ping", message: "Let’s regroup at our meeting spot" },
  { label: "I’m safe", kind: "safe", message: "I’m safe and checked in" },
  { label: "Need my crew", kind: "sos", message: "Need my crew at my landmark" },
];

function localFeedKey(eventId: string) {
  return `event-buddies:${eventId}:crew-activities`;
}

function readLocalFeed(eventId: string): CrewActivity[] {
  try {
    const raw = JSON.parse(localStorage.getItem(localFeedKey(eventId)) ?? "[]");
    if (!Array.isArray(raw)) return [];
    return raw.flatMap((row) => {
      const parsed = crewActivitySchema.safeParse(row);
      return parsed.success ? [parsed.data] : [];
    });
  } catch {
    return [];
  }
}

function writeLocalFeed(eventId: string, items: CrewActivity[]) {
  try {
    localStorage.setItem(localFeedKey(eventId), JSON.stringify(items.slice(0, 30)));
  } catch {
    /* Ignore quota failures. */
  }
}

export function CrewCoordination() {
  const { data, attendee, crew: sync, places, openPlace, now } = useCompanion();
  const eventId = data.event.id;
  const here = attendee.preferences.here;
  const activeHere = activeLandmarkPin(data, here, now)?.pointId ?? null;
  const [pointId, setPointId] = useState(
    activeHere ??
      sync.crew?.meeting?.pointId ??
      attendee.preferences.meeting?.pointId ??
      places[0]?.id ??
      "",
  );
  const [activities, setActivities] = useState<CrewActivity[]>(() => readLocalFeed(eventId));
  const [sheet, setSheet] = useState<"poll" | "travel" | "note" | null>(null);
  const [pollQuestion, setPollQuestion] = useState("Which stage next?");
  const [pollOptionA, setPollOptionA] = useState(data.stages[0]?.name ?? "Main Stage");
  const [pollOptionB, setPollOptionB] = useState(data.stages[1]?.name ?? "House & Techno Stage");
  const [pollOptionC, setPollOptionC] = useState(
    data.stages[2]?.name ?? "Amapiano & Afro Tech Stage",
  );
  const [travelKind, setTravelKind] = useState<"car" | "shuttle" | "taxi">("car");
  const [travelTime, setTravelTime] = useState("01:00");
  const [travelNote, setTravelNote] = useState("");
  const [noteText, setNoteText] = useState("");
  const [exportingCard, setExportingCard] = useState(false);

  const voterId = attendee.auth.user?.id ?? "self";

  const refreshFeed = useCallback(async () => {
    const local = readLocalFeed(eventId);
    if (!attendee.auth.user || !sync.crew) {
      setActivities(local);
      return;
    }
    const remote = await crewListActivities(eventId);
    if (!remote.length) {
      setActivities(local);
      return;
    }
    const seen = new Set(remote.map((r) => r.id));
    const merged = [...remote, ...local.filter((l) => !seen.has(l.id))].sort(
      (a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt),
    );
    writeLocalFeed(eventId, merged);
    setActivities(merged);
  }, [attendee.auth.user, eventId, sync.crew]);

  useEffect(() => {
    void refreshFeed();
  }, [refreshFeed]);

  async function postActivity(
    kind: CrewActivity["kind"],
    message: string,
    chosenPointId: string | null,
    meta: Record<string, unknown> = {},
  ) {
    const authorName = attendee.preferences.profile.name || "Attendee";
    const localItem: CrewActivity = {
      id: crypto.randomUUID(),
      eventId,
      crewId: sync.crew?.id ?? "local",
      authorId: voterId,
      authorName,
      kind,
      message,
      pointId: chosenPointId,
      meta,
      createdAt: new Date().toISOString(),
    };
    const nextLocal = [localItem, ...readLocalFeed(eventId)].slice(0, 30);
    writeLocalFeed(eventId, nextLocal);
    setActivities(nextLocal);

    if (attendee.auth.user && sync.crew) {
      const res = await crewPostActivity({
        eventId,
        kind,
        message,
        pointId: chosenPointId,
        meta,
      });
      if (res.ok) {
        const replaced = [res.activity, ...nextLocal.filter((a) => a.id !== localItem.id)];
        writeLocalFeed(eventId, replaced);
        setActivities(replaced);
        attendee.notify("Posted to your connected crew");
        return;
      }
    }
    attendee.notify("Saved to your crew board on this phone");
  }

  async function voteOnPoll(activity: CrewActivity, optionIndex: number) {
    const options = Array.isArray(activity.meta["options"])
      ? (activity.meta["options"] as string[])
      : [];
    if (optionIndex < 0 || optionIndex >= options.length) return;
    const prevVotes =
      activity.meta["votes"] && typeof activity.meta["votes"] === "object"
        ? (activity.meta["votes"] as Record<string, number>)
        : {};
    const nextMeta = {
      ...activity.meta,
      options,
      votes: { ...prevVotes, [voterId]: optionIndex },
    };
    const updated = activities.map((item) =>
      item.id === activity.id ? { ...item, meta: nextMeta } : item,
    );
    writeLocalFeed(eventId, updated);
    setActivities(updated);

    if (attendee.auth.user && sync.crew) {
      const res = await crewVotePoll({
        eventId,
        activityId: activity.id,
        optionIndex,
      });
      if (res.ok) {
        const synced = updated.map((item) =>
          item.id === activity.id ? { ...item, meta: res.meta } : item,
        );
        writeLocalFeed(eventId, synced);
        setActivities(synced);
      }
    }
  }

  async function shareActivity(activity: CrewActivity) {
    const place = activity.pointId ? places.find((p) => p.id === activity.pointId) : null;
    const prefix =
      activity.kind === "sos"
        ? "[Crew help needed]"
        : activity.kind === "safe"
          ? "[Safe check-in]"
          : activity.kind === "poll"
            ? "[Crew poll]"
            : activity.kind === "travel"
              ? "[Shared travel]"
              : "[Crew update]";
    const text = `${prefix} ${activity.authorName}: ${activity.message}${place ? ` @ ${place.name}` : ""}`;
    try {
      if (navigator.share) await navigator.share({ title: "Event Buddies crew", text });
      else {
        await navigator.clipboard.writeText(text);
        attendee.notify("Crew update copied");
      }
    } catch {
      /* Ignore share cancellation. */
    }
  }

  async function exportYearbook() {
    setExportingCard(true);
    try {
      const crewName = sync.crew?.name ?? "Our Sound of Summer Crew";
      const memberNames = sync.crew
        ? sync.crew.members.map((m) => m.name)
        : [
            attendee.preferences.profile.name,
            ...attendee.preferences.sharedPlans.map((s) => s.plan.name),
          ];
      const activeMeeting = sync.crew?.meeting ?? attendee.preferences.meeting;
      const meetingPlace = activeMeeting
        ? places.find((p) => p.id === activeMeeting.pointId)
        : null;
      const meetingLabel =
        activeMeeting && meetingPlace
          ? `${meetingPlace.name} · ${eventTime(activeMeeting.at)} CAT`
          : "No fixed meeting time saved";
      const blob = await createCrewYearbookCard({
        data,
        preferences: attendee.preferences,
        crewName,
        memberNames,
        meetingLabel,
      });
      const file = new File([blob], "sound-of-summer-crew-yearbook.png", { type: "image/png" });
      if (navigator.canShare?.({ files: [file] }) && navigator.share) {
        await navigator.share({ files: [file], title: `${crewName} Yearbook` });
      } else {
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = file.name;
        link.click();
        window.setTimeout(() => URL.revokeObjectURL(url), 1000);
        attendee.notify("Crew yearbook card downloaded");
      }
    } catch (err) {
      if (!(err instanceof DOMException && err.name === "AbortError"))
        attendee.notify("Couldn’t create the crew yearbook card.", true);
    } finally {
      setExportingCard(false);
    }
  }

  return (
    <Section title="Crew coordination & check-in" id="crew-coordination" className="px-4">
      <div className="ios-card space-y-3 p-4">
        <label className="block text-[14px] font-semibold">
          My current or target landmark
          <select
            className="ios-field mt-1"
            value={pointId}
            onChange={(e) => setPointId(e.target.value)}
          >
            {places.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </label>

        <div className="grid grid-cols-2 gap-2" role="group" aria-label="Quick crew pings">
          {QUICK_PINGS.map((ping) => (
            <button
              key={ping.label}
              type="button"
              disabled={!attendee.ready}
              onClick={() => void postActivity(ping.kind, ping.message, pointId || null)}
              className={
                ping.kind === "sos"
                  ? "ios-press flex min-h-11 items-center justify-center gap-1.5 rounded-xl bg-destructive px-3 text-[14px] font-semibold text-destructive-foreground"
                  : ping.kind === "safe"
                    ? "ios-press flex min-h-11 items-center justify-center gap-1.5 rounded-xl bg-primary px-3 text-[14px] font-semibold text-primary-foreground"
                    : "ios-press flex min-h-11 items-center justify-center gap-1.5 rounded-xl bg-secondary px-3 text-[14px] font-semibold"
              }
            >
              {ping.kind === "sos" && <ShieldAlert size={16} aria-hidden />}
              {ping.kind === "safe" && <CheckCircle2 size={16} aria-hidden />}
              {ping.label}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-3 gap-2 pt-1">
          <SecondaryButton onClick={() => setSheet("poll")}>
            <HelpCircle size={16} /> Crew poll
          </SecondaryButton>
          <SecondaryButton onClick={() => setSheet("travel")}>
            <Car size={16} /> Travel plan
          </SecondaryButton>
          <SecondaryButton onClick={() => setSheet("note")}>
            <MessageSquare size={16} /> Crew note
          </SecondaryButton>
        </div>

        <SecondaryButton disabled={exportingCard} onClick={() => void exportYearbook()}>
          <Download size={17} />
          {exportingCard ? "Creating yearbook card…" : "Download crew yearbook card"}
        </SecondaryButton>

        {activities.length > 0 && (
          <div className="divide-y divide-border border-t border-border pt-2">
            {activities.slice(0, 8).map((act) => {
              const place = act.pointId ? places.find((p) => p.id === act.pointId) : null;
              const options =
                act.kind === "poll" && Array.isArray(act.meta["options"])
                  ? (act.meta["options"] as string[])
                  : [];
              const votes =
                act.kind === "poll" && act.meta["votes"] && typeof act.meta["votes"] === "object"
                  ? (act.meta["votes"] as Record<string, number>)
                  : {};
              const totalVotes = Object.keys(votes).length;
              return (
                <div key={act.id} className="space-y-1.5 py-2.5 text-[14px]">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <span className="font-semibold">{act.authorName}</span>
                      <span className="ml-1.5 text-[12px] uppercase text-primary">{act.kind}</span>
                      <p className="mt-0.5 text-[15px]">{act.message}</p>
                      {place && (
                        <button
                          type="button"
                          className="min-h-9 text-[13px] font-semibold text-primary"
                          onClick={() => openPlace(place.id)}
                        >
                          {place.name} · view on map ↗
                        </button>
                      )}
                    </div>
                    <button
                      type="button"
                      aria-label={`Share ${act.authorName}’s update`}
                      className="grid size-10 place-items-center rounded-full bg-secondary"
                      onClick={() => void shareActivity(act)}
                    >
                      <Share2 size={15} />
                    </button>
                  </div>
                  {act.kind === "poll" && options.length > 0 && (
                    <div className="space-y-1.5 pt-1">
                      {options.map((opt, idx) => {
                        const count = Object.values(votes).filter((v) => v === idx).length;
                        const selected = votes[voterId] === idx;
                        return (
                          <button
                            key={idx}
                            type="button"
                            aria-pressed={selected}
                            onClick={() => void voteOnPoll(act, idx)}
                            className="flex min-h-10 w-full items-center justify-between rounded-lg border border-border px-3 py-1.5 text-left text-[14px] font-medium aria-pressed:border-primary aria-pressed:bg-primary/15"
                          >
                            <span>{opt}</span>
                            <span className="tabular-nums text-[13px] text-muted-foreground">
                              {count} {count === 1 ? "vote" : "votes"}
                              {totalVotes > 0
                                ? ` (${Math.round((count / totalVotes) * 100)}%)`
                                : ""}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {sheet === "poll" && (
        <Sheet title="Start a crew poll" onClose={() => setSheet(null)}>
          <form
            className="space-y-3"
            onSubmit={(e) => {
              e.preventDefault();
              const opts = [pollOptionA, pollOptionB, pollOptionC]
                .map((s) => s.trim())
                .filter((s) => s.length > 0);
              if (!pollQuestion.trim() || opts.length < 2) return;
              void postActivity("poll", pollQuestion.trim(), pointId || null, {
                options: opts,
                votes: { [voterId]: 0 },
              });
              setSheet(null);
            }}
          >
            <label className="block text-[15px] font-semibold">
              Question
              <input
                className="ios-field mt-1"
                maxLength={120}
                required
                value={pollQuestion}
                onChange={(e) => setPollQuestion(e.target.value)}
              />
            </label>
            <label className="block text-[15px] font-semibold">
              Option 1
              <input
                className="ios-field mt-1"
                maxLength={60}
                required
                value={pollOptionA}
                onChange={(e) => setPollOptionA(e.target.value)}
              />
            </label>
            <label className="block text-[15px] font-semibold">
              Option 2
              <input
                className="ios-field mt-1"
                maxLength={60}
                required
                value={pollOptionB}
                onChange={(e) => setPollOptionB(e.target.value)}
              />
            </label>
            <label className="block text-[15px] font-semibold">
              Option 3 (optional)
              <input
                className="ios-field mt-1"
                maxLength={60}
                value={pollOptionC}
                onChange={(e) => setPollOptionC(e.target.value)}
              />
            </label>
            <PrimaryButton type="submit">Post poll</PrimaryButton>
          </form>
        </Sheet>
      )}

      {sheet === "travel" && (
        <Sheet title="Shared crew travel plan" onClose={() => setSheet(null)}>
          <form
            className="space-y-3"
            onSubmit={(e) => {
              e.preventDefault();
              const label =
                travelKind === "car" ? "Shared car" : travelKind === "shuttle" ? "Shuttle" : "Taxi";
              const msg = `${label} at ${travelTime} CAT${travelNote.trim() ? ` · ${travelNote.trim()}` : ""}`;
              attendee.update({
                ride: {
                  pointId: pointId || (places[0]?.id ?? ""),
                  note: msg,
                  kind: travelKind === "shuttle" ? "shuttle" : "car",
                },
              });
              void postActivity("travel", msg, pointId || null, {
                travelKind,
                travelTime,
              });
              setSheet(null);
            }}
          >
            <label className="block text-[15px] font-semibold">
              Transport mode
              <select
                className="ios-field mt-1"
                value={travelKind}
                onChange={(e) => setTravelKind(e.target.value as "car" | "shuttle" | "taxi")}
              >
                <option value="car">Shared car / designated driver</option>
                <option value="shuttle">Shuttle</option>
                <option value="taxi">Taxi pickup</option>
              </select>
            </label>
            <label className="block text-[15px] font-semibold">
              Departure time (CAT)
              <input
                type="time"
                className="ios-field mt-1"
                value={travelTime}
                onChange={(e) => setTravelTime(e.target.value)}
              />
            </label>
            <label className="block text-[15px] font-semibold">
              Pickup landmark
              <select
                className="ios-field mt-1"
                value={pointId}
                onChange={(e) => setPointId(e.target.value)}
              >
                {places.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="block text-[15px] font-semibold">
              Seats or note (optional)
              <input
                className="ios-field mt-1"
                maxLength={100}
                placeholder="3 seats to Swakopmund"
                value={travelNote}
                onChange={(e) => setTravelNote(e.target.value)}
              />
            </label>
            <PrimaryButton type="submit">Save & post travel plan</PrimaryButton>
          </form>
        </Sheet>
      )}

      {sheet === "note" && (
        <Sheet title="Post a crew note" onClose={() => setSheet(null)}>
          <form
            className="space-y-3"
            onSubmit={(e) => {
              e.preventDefault();
              if (!noteText.trim()) return;
              void postActivity("message", noteText.trim(), pointId || null);
              setNoteText("");
              setSheet(null);
            }}
          >
            <label className="block text-[15px] font-semibold">
              Short crew message
              <textarea
                rows={3}
                maxLength={160}
                required
                className="ios-field mt-1"
                placeholder="Heading to the sunset stage after the next set…"
                value={noteText}
                onChange={(e) => setNoteText(e.target.value)}
              />
            </label>
            <PrimaryButton type="submit">Post note</PrimaryButton>
          </form>
        </Sheet>
      )}
    </Section>
  );
}
