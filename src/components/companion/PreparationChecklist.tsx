import { PREPARATION_ITEMS } from "@/lib/attendee/preparation";
import { useCompanion } from "./context";
import { Section } from "./ui";

export function PreparationChecklist() {
  const { attendee, openSheet } = useCompanion();
  const completed = attendee.preferences.preparation;
  return (
    <Section title="Before you leave" id="preparation-checklist">
      <p className="mb-3 text-[15px] text-muted-foreground">
        {completed.length} of {PREPARATION_ITEMS.length} ready · saved on this phone
      </p>
      <div className="ios-group divide-y divide-border">
        {PREPARATION_ITEMS.map((item) => (
          <label key={item.id} className="ios-row">
            <input
              type="checkbox"
              className="size-6 flex-none accent-favorite"
              checked={completed.includes(item.id)}
              disabled={!attendee.ready}
              onChange={(event) =>
                attendee.update({
                  preparation: event.target.checked
                    ? [...completed, item.id]
                    : completed.filter((id) => id !== item.id),
                })
              }
            />
            <span className="text-[17px]">{item.label}</span>
          </label>
        ))}
      </div>
      <div className="mt-2 flex gap-4">
        <button
          type="button"
          className="min-h-11 text-[16px] font-semibold"
          onClick={() => openSheet({ kind: "ticket" })}
        >
          Open ticket vault
        </button>
        <button
          type="button"
          className="min-h-11 text-[16px] font-semibold"
          onClick={() => openSheet({ kind: "offline" })}
        >
          Check offline copy
        </button>
      </div>
    </Section>
  );
}
