import { useState } from "react";
import {
  Music2,
  Presentation,
  BriefcaseBusiness,
  PartyPopper,
  Trophy,
  Store,
  MapPin,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet } from "./Sheet";

const previews = [
  { name: "Windhoek Live Sessions", city: "Windhoek", category: "Music", Icon: Music2 },
  { name: "Namibia Ideas Forum", city: "Windhoek", category: "Conferences", Icon: Presentation },
  {
    name: "Walvis Bay Business Connect",
    city: "Walvis Bay",
    category: "Corporate",
    Icon: BriefcaseBusiness,
  },
  {
    name: "Swakop After Dark",
    city: "Swakopmund",
    category: "Parties/Nightlife",
    Icon: PartyPopper,
  },
  { name: "Coastal Run Club", city: "Swakopmund", category: "Sports", Icon: Trophy },
  { name: "Oshakati Makers Market", city: "Oshakati", category: "Culture/Markets", Icon: Store },
] as const;

export function NamibianEventPreviews({ category, query }: { category: string; query: string }) {
  const [selected, setSelected] = useState<(typeof previews)[number] | null>(null);
  const visible = previews.filter(
    (event) =>
      (category === "All" || event.category === category) &&
      `${event.name} ${event.city} ${event.category}`
        .toLowerCase()
        .includes(query.trim().toLowerCase()),
  );
  if (visible.length === 0) return null;
  return (
    <section className="mt-7 pb-6" aria-label="Namibian sample events">
      <h2 className="eb-section-heading">Around Namibia</h2>
      <p className="mt-1 mb-4 text-sm text-muted-foreground">
        Sample listings · not announced events
      </p>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {visible.map((event) => (
          <article key={event.name} className="rounded-lg border border-border bg-card p-4">
            <div className="mb-4 flex items-center justify-between">
              <event.Icon size={28} className="text-primary" aria-hidden />
              <span className="text-xs text-muted-foreground">Preview only</span>
            </div>
            <p className="text-xs font-semibold text-primary">{event.category}</p>
            <h3 className="mt-1 text-lg font-bold">{event.name}</h3>
            <p className="mt-2 flex items-center gap-1 text-sm text-muted-foreground">
              <MapPin size={14} aria-hidden />
              {event.city}
            </p>
            <div className="mt-3 flex items-center justify-between gap-2">
              <span className="text-sm text-muted-foreground">No confirmed date</span>
              <Button variant="ghost" onClick={() => setSelected(event)}>
                View preview
              </Button>
            </div>
          </article>
        ))}
      </div>
      {selected && (
        <Sheet title={selected.name} onClose={() => setSelected(null)}>
          <p className="text-sm font-semibold text-primary">
            {selected.category} · {selected.city}
          </p>
          <p className="mt-4 text-muted-foreground">
            This is a fictional sample listing for comparing event categories. No date, venue,
            programme or tickets have been announced.
          </p>
          <Button variant="outline" className="mt-5" onClick={() => setSelected(null)}>
            Close preview
          </Button>
        </Sheet>
      )}
    </section>
  );
}
