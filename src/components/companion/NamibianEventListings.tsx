import { useState } from "react";
import { Music2, MapPin, ArrowUpRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { NAMIBIAN_EVENT_LISTINGS } from "@/lib/event/sound-of-summer";
import { Sheet } from "./Sheet";

export function NamibianEventListings({ category, query }: { category: string; query: string }) {
  const [selected, setSelected] = useState<(typeof NAMIBIAN_EVENT_LISTINGS)[number] | null>(null);
  const visible = NAMIBIAN_EVENT_LISTINGS.filter(
    (event) =>
      (category === "All" || event.category === category) &&
      `${event.name} ${event.city} ${event.venue} ${event.organiser}`
        .toLowerCase()
        .includes(query.trim().toLowerCase()),
  );
  if (!visible.length) return null;
  return (
    <section className="mt-7 pb-6" aria-label="Namibian event listings">
      <h2 className="eb-section-heading">Around Namibia</h2>
      <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
        {visible.map((event) => (
          <article key={event.id} className="rounded-lg border border-border bg-card p-4">
            <div className="mb-4 flex items-center justify-between gap-3">
              <Music2 size={28} className="text-primary" aria-hidden />
              <span className="text-xs text-muted-foreground">{event.organiser}</span>
            </div>
            <p className="text-xs font-semibold text-primary">{event.date}</p>
            <h3 className="mt-1 text-lg font-bold">{event.name}</h3>
            <p className="mt-2 flex items-start gap-1 text-sm text-muted-foreground">
              <MapPin size={16} className="mt-0.5 shrink-0" aria-hidden />
              {event.venue}
            </p>
            <Button variant="ghost" className="mt-3" onClick={() => setSelected(event)}>
              View event details
            </Button>
          </article>
        ))}
      </div>
      {selected && (
        <Sheet title={selected.name} onClose={() => setSelected(null)}>
          <p className="font-semibold text-primary">{selected.date}</p>
          <p className="mt-2">
            {selected.venue} · {selected.city}
          </p>
          <p className="mt-4 text-muted-foreground">{selected.note}</p>
          <p className="mt-4 text-sm text-muted-foreground">
            Organizer: {selected.organiser}. Source checked {selected.checkedAt}. No venue map or
            event companion is available here yet.
          </p>
          <a
            href={selected.url}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-5 inline-flex min-h-11 items-center gap-2 font-semibold text-primary"
          >
            Official event website <ArrowUpRight size={16} aria-hidden />
          </a>
        </Sheet>
      )}
    </section>
  );
}
