import { Smartphone, Ticket } from "lucide-react";
import { PREPARATION_ITEMS } from "@/lib/attendee/preparation";
import { useCompanion } from "./context";
import { Section } from "./ui";

export function PreparationChecklist() {
  const { attendee, openSheet } = useCompanion();
  const completed = attendee.preferences.preparation;
  const pct = Math.round((completed.length / PREPARATION_ITEMS.length) * 100);
  return (
    <Section
      title="Before you leave"
      id="preparation-checklist"
      action={
        <span className="pb-2 text-[13px] font-semibold tabular-nums text-primary">
          {completed.length}/{PREPARATION_ITEMS.length} ready
        </span>
      }
    >
      <div className="mb-3 h-1.5 w-full overflow-hidden rounded-full bg-fill" aria-hidden>
        <div
          className="h-full rounded-full bg-primary transition-[width] duration-200"
          style={{ width: `${pct}%` }}
        />
      </div>
      <div className="eb-list">
        {PREPARATION_ITEMS.map((item) => {
          const checked = completed.includes(item.id);
          return (
            <label key={item.id} className="eb-row py-2.5">
              <input
                type="checkbox"
                className="size-5 flex-none accent-favorite"
                checked={checked}
                disabled={!attendee.ready}
                onChange={(event) =>
                  attendee.update({
                    preparation: event.target.checked
                      ? [...completed, item.id]
                      : completed.filter((id) => id !== item.id),
                  })
                }
              />
              <span
                className={
                  checked
                    ? "text-[16px] text-muted-foreground line-through"
                    : "text-[16px] font-medium"
                }
              >
                {item.label}
              </span>
            </label>
          );
        })}
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        <button
          type="button"
          className="eb-chip text-[14px] text-primary"
          onClick={() => openSheet({ kind: "ticket" })}
        >
          <Ticket size={15} aria-hidden /> Open ticket vault
        </button>
        <button
          type="button"
          className="eb-chip text-[14px]"
          onClick={() => openSheet({ kind: "offline" })}
        >
          <Smartphone size={15} aria-hidden /> Check offline copy
        </button>
      </div>
    </Section>
  );
}
