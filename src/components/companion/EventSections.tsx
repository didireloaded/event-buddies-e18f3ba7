import { getEventCategoryTerms } from "@/lib/intelligence/event-intelligence";
import { useCompanion } from "./context";

export function EventSections() {
  const { view, data } = useCompanion();
  const terms = getEventCategoryTerms(data.event.category, data.event.templateConfig);
  return (
    <nav className="mx-4 mb-5 mt-3 flex border-b border-separator" aria-label="Event sections">
      {(
        [
          { id: "lineup", label: terms.programLabel },
          { id: "map", label: "Map" },
          { id: "info", label: "Essentials" },
        ] as const
      ).map(({ id, label }) => {
        const active = view === id;
        return (
          <a
            key={id}
            href={`#${id}`}
            aria-current={active ? "page" : undefined}
            className={`relative flex min-h-11 flex-1 items-center justify-center px-3 text-[15px] transition-colors ${
              active
                ? "font-semibold text-foreground after:absolute after:inset-x-3 after:bottom-0 after:h-[2.5px] after:rounded-full after:bg-primary"
                : "font-medium text-muted-foreground hover:text-foreground"
            }`}
          >
            {label}
          </a>
        );
      })}
    </nav>
  );
}
