import { useCompanion } from "./context";

export function EventSections() {
  const { view } = useCompanion();
  return (
    <nav className="mx-4 mb-4 mt-3 flex rounded-xl bg-muted p-1" aria-label="Event sections">
      {(
        [
          { id: "lineup", label: "Lineup" },
          { id: "map", label: "Map" },
          { id: "info", label: "Info" },
        ] as const
      ).map(({ id, label }) => (
        <a
          key={id}
          href={`#${id}`}
          aria-current={view === id ? "page" : undefined}
          className="flex min-h-11 flex-1 items-center justify-center rounded-lg px-3 text-[15px] font-semibold aria-[current=page]:bg-popover aria-[current=page]:shadow-sm"
        >
          {label}
        </a>
      ))}
    </nav>
  );
}
