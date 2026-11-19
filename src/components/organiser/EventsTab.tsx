import { useState } from "react";
import { CalendarDays, FilePlus2 } from "lucide-react";
import {
  publishBlockers,
  groupEventsBySection,
  TYPE_TERMS,
  type EventType,
} from "@/lib/organiser/schema";
import { Chevron, PrimaryButton, RowText, SearchField, Section } from "@/components/companion/ui";
import type { OrgEvent } from "@/lib/organiser/data";
import type { OrgCtx } from "./OrganiserApp";

function eventSubtitle(
  event: OrgEvent,
  verification: OrgCtx["profile"] extends infer P
    ? P extends { verification_status: string }
      ? string
      : string
    : string,
) {
  const terms =
    TYPE_TERMS[
      (event.event_type as EventType) in TYPE_TERMS ? (event.event_type as EventType) : "festival"
    ];
  const datePart = event.start_date || "Date needed";
  const venuePart = event.venue || "Venue needed";
  if (event.status === "published") return `${terms.program} · ${datePart} · ${venuePart}`;
  const blockers = publishBlockers({
    name: event.name,
    start_date: event.start_date,
    site_plan_path: event.site_plan_path,
    event_type: event.event_type,
    venue: event.venue,
    verification: verification as "unverified" | "pending" | "verified" | "rejected" | null,
  });
  return `${datePart} · ${venuePart} · ${blockers.length} step${blockers.length === 1 ? "" : "s"} before publish`;
}

export function EventsTab({ ctx }: { ctx: OrgCtx }) {
  const [query, setQuery] = useState("");
  const todayIso = new Date().toISOString().slice(0, 10);
  const verification = ctx.profile?.verification_status ?? "unverified";

  if (ctx.events.length === 0) {
    return (
      <div className="py-10">
        <h1 className="ios-large-title">Events</h1>
        <div className="ios-card mt-5 space-y-4 p-6 text-center">
          <CalendarDays size={32} className="mx-auto text-muted-foreground" aria-hidden />
          <h2 className="text-[20px] font-semibold">No organiser events yet</h2>
          <p className="text-[15px] text-muted-foreground">
            Upload a printed event PDF or start a draft. Drafts stay private until reviewed and
            published.
          </p>
          <PrimaryButton onClick={() => ctx.go("create")}>
            <FilePlus2 size={18} /> Create from PDF or draft
          </PrimaryButton>
        </div>
      </div>
    );
  }

  const term = query.trim().toLowerCase();
  const filtered = term
    ? ctx.events.filter((e) =>
        `${e.name} ${e.venue} ${e.start_date ?? ""}`.toLowerCase().includes(term),
      )
    : ctx.events;
  const groups = groupEventsBySection(filtered, todayIso);
  const sections: { id: string; title: string; items: OrgEvent[] }[] = [
    { id: "org-live", title: "Live", items: groups.live },
    { id: "org-drafts", title: "Drafts", items: groups.drafts },
    { id: "org-imported", title: "Imported", items: groups.imported },
    { id: "org-past", title: "Past", items: groups.past },
  ];

  const allGroups = groupEventsBySection(ctx.events, todayIso);
  const needsAttentionCount = ctx.events.filter((ev) => {
    if (ev.status === "published") return false;
    return (
      publishBlockers({
        name: ev.name,
        start_date: ev.start_date,
        site_plan_path: ev.site_plan_path,
        event_type: ev.event_type,
        venue: ev.venue,
        verification: verification as "unverified" | "pending" | "verified" | "rejected" | null,
      }).length > 0
    );
  }).length;

  return (
    <div className="py-4">
      <h1 className="ios-large-title">Events</h1>

      {/* Operational summary bar (concise, real metrics — no decorative charts) */}
      <div className="mt-4 grid grid-cols-2 gap-2.5 sm:grid-cols-4">
        <div className="ios-card p-3.5">
          <p className="text-[12px] font-semibold uppercase tracking-wide text-muted-foreground">
            Live
          </p>
          <p className="mt-1 text-[24px] font-bold tabular-nums">{allGroups.live.length}</p>
        </div>
        <div className="ios-card p-3.5">
          <p className="text-[12px] font-semibold uppercase tracking-wide text-muted-foreground">
            Drafts
          </p>
          <p className="mt-1 text-[24px] font-bold tabular-nums">{allGroups.drafts.length}</p>
        </div>
        <div className="ios-card p-3.5">
          <p className="text-[12px] font-semibold uppercase tracking-wide text-muted-foreground">
            Needs attention
          </p>
          <p className="mt-1 text-[24px] font-bold tabular-nums">{needsAttentionCount}</p>
        </div>
        <div className="ios-card p-3.5">
          <p className="text-[12px] font-semibold uppercase tracking-wide text-muted-foreground">
            Verification
          </p>
          <p className="mt-1 text-[16px] font-bold capitalize">{verification}</p>
        </div>
      </div>

      {ctx.events.length > 3 && (
        <div className="mt-4">
          <SearchField
            id="org-event-search"
            label="Search your events"
            placeholder="Event, venue or date"
            value={query}
            onChange={setQuery}
          />
        </div>
      )}

      {filtered.length === 0 ? (
        <div className="ios-card mt-5 p-6 text-center">
          <p className="text-[17px] font-semibold">No matching events</p>
          <button
            type="button"
            className="mt-2 min-h-11 font-semibold text-primary"
            onClick={() => setQuery("")}
          >
            Clear search
          </button>
        </div>
      ) : (
        sections
          .filter((section) => section.items.length > 0)
          .map((section) => (
            <Section key={section.id} id={section.id} title={section.title}>
              <div className="ios-group">
                {section.items.map((event) => (
                  <button
                    key={event.id}
                    type="button"
                    className="ios-row w-full text-left"
                    onClick={() => ctx.go("events", event.id)}
                  >
                    <RowText
                      title={event.name || "Untitled draft"}
                      subtitle={eventSubtitle(event, verification)}
                    />
                    <Chevron />
                  </button>
                ))}
              </div>
            </Section>
          ))
      )}
    </div>
  );
}
