import { Link } from "@tanstack/react-router";
import { ArrowLeft, ArrowUpRight, CircleAlert, CircleCheck, CircleDashed } from "lucide-react";
import { useEffect, useState } from "react";
import { dateLabel } from "@/lib/attendee/event-clock";
import { eventTime } from "@/lib/attendee/schedule";
import type { OrganiserData } from "@/lib/event/demo-data";
import { TYPE_LABELS } from "@/components/companion/places";
import { Section } from "@/components/companion/ui";

type Check = { label: string; detail: string; state: "ok" | "pending" | "blocked" };

const DRAFT_KEY = (eventId: string) => `event-buddies:${eventId}:organiser-draft`;

export function OrganiserWorkspace({ data }: { data: OrganiserData }) {
  const [draft, setDraft] = useState({ title: "", body: "" });
  const [status, setStatus] = useState<string | null>(null);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(DRAFT_KEY(data.event.id));
      if (raw) {
        const parsed = JSON.parse(raw) as { title?: unknown; body?: unknown };
        setDraft({
          title: typeof parsed.title === "string" ? parsed.title : "",
          body: typeof parsed.body === "string" ? parsed.body : "",
        });
      }
    } catch {
      /* ignore malformed local draft */
    }
  }, [data.event.id]);

  const counts = Object.entries(
    data.points.reduce<Record<string, number>>(
      (acc, p) => ({ ...acc, [p.type]: (acc[p.type] ?? 0) + 1 }),
      {},
    ),
  ).sort((a, b) => b[1] - a[1]);

  const checks: Check[] = [
    {
      label: "Event details",
      detail: `${dateLabel(data.event.startAt, data.event.timezone, { day: "numeric", month: "short", year: "numeric" })}, ${eventTime(data.event.startAt)}–${eventTime(data.event.endAt)} CAT`,
      state: "ok",
    },
    {
      label: "Venue plan points",
      detail: `${data.points.length + data.stages.length} points (${data.stages.length} stages) placed on the supplied image`,
      state: "ok",
    },
    {
      label: "Announced artists",
      detail: `${data.festival.artists.length} artists from organiser and Howler listings`,
      state: "ok",
    },
    { label: "Timetable", detail: "Set times not published by the organiser", state: "pending" },
    {
      label: "GPS calibration",
      detail: "Plan isn’t georeferenced. Coordinates are null.",
      state: "pending",
    },
    {
      label: "Stage name match",
      detail: "Plan’s Afro Tech & Amapiano stage vs listed Coke Studio unconfirmed",
      state: "pending",
    },
    { label: "Vendors, menus & prices", detail: "Awaiting organiser data", state: "pending" },
    { label: "Accounts & roles", detail: "No authentication connected", state: "blocked" },
    {
      label: "Announcement delivery",
      detail: "No backend or push service connected",
      state: "blocked",
    },
    { label: "Ticketing integration", detail: "Tickets are sold on Howler only", state: "blocked" },
  ];

  const icon = (state: Check["state"]) =>
    state === "ok" ? (
      <CircleCheck size={20} className="text-success" aria-label="Ready" />
    ) : state === "pending" ? (
      <CircleDashed size={20} className="text-warning" aria-label="Pending" />
    ) : (
      <CircleAlert size={20} className="text-destructive" aria-label="Not connected" />
    );

  return (
    <div className="min-h-dvh pb-[max(2rem,env(safe-area-inset-bottom))]">
      <header className="ios-bar sticky top-0 z-20 pt-safe">
        <div className="mx-auto flex h-11 max-w-4xl items-center px-safe">
          <Link
            to="/"
            hash="home"
            className="-ml-2 flex min-h-11 items-center gap-1 px-2 text-[17px] text-primary"
          >
            <ArrowLeft size={20} aria-hidden /> Attendee app
          </Link>
        </div>
      </header>
      <main className="mx-auto max-w-4xl pt-2">
        <div className="px-4">
          <p className="text-[15px] font-semibold uppercase tracking-wide text-warning">
            Demo · read-only
          </p>
          <h1 className="text-[34px] font-bold tracking-tight">Organiser workspace</h1>
          <p className="text-[17px] text-muted-foreground">
            {data.event.name} 2026 · {data.organiser.name}. This preview shows the data the attendee
            app uses. Nothing here is published to attendees.
          </p>
        </div>

        <div className="md:grid md:grid-cols-2 md:gap-x-6 md:px-4">
          <Section title="Readiness" id="org-readiness" className="px-4 md:px-0">
            <ul className="ios-group">
              {checks.map((c) => (
                <li key={c.label} className="ios-row items-start py-3">
                  <span className="mt-0.5">{icon(c.state)}</span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-[17px] font-medium">{c.label}</span>
                    <span className="block text-[15px] text-muted-foreground">{c.detail}</span>
                  </span>
                </li>
              ))}
            </ul>
          </Section>

          <div>
            <Section title="Stages" id="org-stages" className="px-4 md:px-0">
              <ul className="ios-group">
                {data.stages.map((s) => (
                  <li key={s.id} className="ios-row py-3">
                    <span className="min-w-0 flex-1">
                      <span className="block text-[17px] font-medium">{s.name}</span>
                      <span className="block text-[15px] text-muted-foreground">
                        {data.festival.artists
                          .filter((a) => a.stageId === s.id)
                          .map((a) => a.name)
                          .join(", ") || "No artists assigned"}{" "}
                        · times pending
                      </span>
                    </span>
                  </li>
                ))}
              </ul>
            </Section>

            <Section title="Map points by type" id="org-points" className="px-4 md:px-0">
              <ul className="ios-group">
                {counts.map(([type, n]) => (
                  <li key={type} className="ios-row justify-between">
                    <span className="text-[17px]">{TYPE_LABELS[type] ?? type}</span>
                    <span className="text-[17px] tabular-nums text-muted-foreground">{n}</span>
                  </li>
                ))}
              </ul>
            </Section>

            <Section
              title="Announcement draft"
              id="org-draft"
              className="px-4 md:px-0"
              footer="Saved as a draft in this browser only. Sending to attendees needs a connected backend."
            >
              <form
                className="ios-card space-y-3 p-4"
                onSubmit={(event) => {
                  event.preventDefault();
                  if (!draft.title.trim()) return setStatus("Add a title before saving.");
                  localStorage.setItem(DRAFT_KEY(data.event.id), JSON.stringify(draft));
                  setStatus("Draft saved on this device. Not sent.");
                }}
              >
                <label htmlFor="draft-title" className="block text-[15px] font-semibold">
                  Title
                </label>
                <input
                  id="draft-title"
                  className="ios-field"
                  maxLength={80}
                  value={draft.title}
                  onChange={(e) => setDraft({ ...draft, title: e.target.value })}
                />
                <label htmlFor="draft-body" className="block text-[15px] font-semibold">
                  Message
                </label>
                <textarea
                  id="draft-body"
                  className="ios-field min-h-24 py-2"
                  maxLength={500}
                  value={draft.body}
                  onChange={(e) => setDraft({ ...draft, body: e.target.value })}
                />
                {status && (
                  <p role="status" className="text-[15px] text-muted-foreground">
                    {status}
                  </p>
                )}
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="submit"
                    className="min-h-11 rounded-xl bg-secondary text-[17px] font-semibold text-secondary-foreground"
                  >
                    Save draft
                  </button>
                  <button
                    type="button"
                    disabled
                    className="min-h-11 rounded-xl bg-fill text-[17px] font-semibold text-muted-foreground"
                    aria-describedby="send-unavailable"
                  >
                    Send
                  </button>
                </div>
                <p id="send-unavailable" className="text-[13px] text-muted-foreground">
                  Sending is unavailable in the demo.
                </p>
              </form>
            </Section>
          </div>
        </div>

        <div className="mt-6 flex flex-wrap gap-x-6 px-4">
          <a
            className="flex min-h-11 items-center gap-1 text-[17px] text-primary"
            href={data.festival.officialUrl}
            target="_blank"
            rel="noreferrer"
          >
            Official event page <ArrowUpRight size={16} />
          </a>
          <a
            className="flex min-h-11 items-center gap-1 text-[17px] text-primary"
            href={data.festival.ticketUrl}
            target="_blank"
            rel="noreferrer"
          >
            Howler listing <ArrowUpRight size={16} />
          </a>
        </div>
      </main>
    </div>
  );
}
