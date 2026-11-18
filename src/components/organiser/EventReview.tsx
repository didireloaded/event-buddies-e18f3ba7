import type { OrgCtx } from "./OrganiserApp";
import type { OrgEvent } from "@/lib/organiser/data";

export function EventReview({ ctx, event }: { ctx: OrgCtx; event: OrgEvent }) {
  return (
    <div className="py-6">
      <h1 className="text-[22px] font-semibold">{event.name || "Untitled draft"}</h1>
      <p className="mt-2 text-[16px] text-muted-foreground">Review screen isn’t finished yet.</p>
      <button type="button" className="mt-4 min-h-11 text-primary" onClick={() => ctx.go("events")}>
        Back to events
      </button>
    </div>
  );
}
