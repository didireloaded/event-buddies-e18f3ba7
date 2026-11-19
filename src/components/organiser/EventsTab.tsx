import { useState } from "react";
import { CalendarDays, FilePlus2, Lock, Plus } from "lucide-react";
import {
  publishBlockers,
  groupEventsBySection,
  TYPE_TERMS,
  type EventType,
} from "@/lib/organiser/schema";
import {
  EVENT_TEMPLATES,
  LAYOUT_FAMILY_META,
  readStoredTemplateConfig,
  resolveEventTemplate,
} from "@/lib/templates/event-templates";
import {
  Chevron,
  EmptyState,
  PrimaryButton,
  RowText,
  SearchField,
  Section,
} from "@/components/companion/ui";
import type { OrgEvent } from "@/lib/organiser/data";
import type { OrgCtx } from "./OrganiserApp";

function eventSubtitle(event: OrgEvent, verification: string) {
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
      <div className="py-6">
        <p className="eb-kicker text-primary">Organiser Studio</p>
        <h1 className="eb-page-title mt-1">Events</h1>
        <div className="mt-6">
          <EmptyState
            icon={CalendarDays}
            title="No organiser events yet"
            detail="Choose from 12 event templates, upload a printed PDF, or start a draft. Everything stays private until reviewed and published."
            action={
              <PrimaryButton className="w-auto px-6" onClick={() => ctx.go("create")}>
                <FilePlus2 size={18} /> Create from PDF or draft
              </PrimaryButton>
            }
          />
        </div>
      </div>
    );
  }

  const term = query.trim().toLowerCase();
  const filtered = term
    ? ctx.events.filter((e) =>
        `${e.name} ${e.venue} ${e.start_date ?? ""} ${e.event_type}`.toLowerCase().includes(term),
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
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="eb-kicker text-primary">Workspace overview</p>
          <h1 className="eb-page-title mt-0.5">Events</h1>
        </div>
        <button
          type="button"
          onClick={() => ctx.go("create")}
          className="eb-press inline-flex min-h-11 items-center gap-1.5 rounded-full bg-primary px-4 text-[14px] font-semibold text-primary-foreground"
        >
          <Plus size={16} aria-hidden /> New event
        </button>
      </div>

      {/* Editorial Metric Ledger (hairline dividers — zero generic SaaS boxes) */}
      <div className="mt-6 grid grid-cols-2 gap-4 border-y border-separator py-4 sm:grid-cols-4">
        <div>
          <p className="eb-kicker text-[11px]">Live</p>
          <p className="eb-display mt-1 text-[28px] tabular-nums">{allGroups.live.length}</p>
        </div>
        <div className="border-l border-separator pl-4">
          <p className="eb-kicker text-[11px]">Drafts</p>
          <p className="eb-display mt-1 text-[28px] tabular-nums">{allGroups.drafts.length}</p>
        </div>
        <div className="sm:border-l sm:border-separator sm:pl-4">
          <p className="eb-kicker text-[11px]">Needs attention</p>
          <p className="eb-display mt-1 text-[28px] tabular-nums">{needsAttentionCount}</p>
        </div>
        <div className="border-l border-separator pl-4">
          <p className="eb-kicker text-[11px]">Verification</p>
          <p className="mt-1.5 text-[16px] font-bold capitalize text-primary">{verification}</p>
        </div>
      </div>

      {ctx.events.length > 3 && (
        <div className="mt-5">
          <SearchField
            id="org-event-search"
            label="Search your events"
            placeholder="Event, venue, type or date"
            value={query}
            onChange={setQuery}
          />
        </div>
      )}

      {filtered.length === 0 ? (
        <div className="mt-6">
          <EmptyState
            icon={CalendarDays}
            title="No matching events"
            detail="Clear your search query to view all drafts and published events."
            action={
              <button
                type="button"
                className="min-h-11 rounded-full bg-primary px-5 text-[14px] font-semibold text-primary-foreground"
                onClick={() => setQuery("")}
              >
                Clear search
              </button>
            }
          />
        </div>
      ) : (
        sections
          .filter((section) => section.items.length > 0)
          .map((section) => (
            <Section key={section.id} id={section.id} title={section.title}>
              <div className="eb-list">
                {section.items.map((event) => {
                  const storedCfg = readStoredTemplateConfig(event.id);
                  const resolved = resolveEventTemplate({
                    category: event.event_type,
                    templateConfig: storedCfg,
                  });
                  const tplDef = EVENT_TEMPLATES[resolved.config.templateId];
                  const isPrivate = resolved.config.visibility === "private_invite";
                  return (
                    <button
                      key={event.id}
                      type="button"
                      className="eb-row w-full py-3.5 text-left"
                      onClick={() => ctx.go("events", event.id)}
                    >
                      <div className="grid size-12 flex-none place-items-center overflow-hidden rounded-xl border border-border bg-secondary text-[13px] font-bold text-foreground">
                        {resolved.config.heroImageUrl ? (
                          <img
                            src={resolved.config.heroImageUrl}
                            alt=""
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <span>{(event.name || "EV").slice(0, 2).toUpperCase()}</span>
                        )}
                      </div>
                      <RowText
                        title={
                          <span className="flex flex-wrap items-center gap-2">
                            <span className="font-bold">{event.name || "Untitled draft"}</span>
                            <span className="rounded-full bg-secondary px-2 py-0.5 text-[11px] font-semibold text-foreground">
                              {tplDef.shortLabel} ·{" "}
                              {LAYOUT_FAMILY_META[resolved.config.layoutFamily].name}
                            </span>
                            {isPrivate && (
                              <span className="inline-flex items-center gap-0.5 rounded-full bg-favorite-soft px-2 py-0.5 text-[11px] font-semibold text-primary">
                                <Lock size={10} aria-hidden /> Invite only
                              </span>
                            )}
                          </span>
                        }
                        subtitle={eventSubtitle(event, verification)}
                      />
                      <Chevron />
                    </button>
                  );
                })}
              </div>
            </Section>
          ))
      )}
    </div>
  );
}
