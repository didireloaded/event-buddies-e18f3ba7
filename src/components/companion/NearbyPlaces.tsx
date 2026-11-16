import { useState } from "react";
import { useCompanion } from "./context";
import { SecondaryButton } from "./ui";

export function NearbyPlaces() {
  const { places, map } = useCompanion();
  const [originId, setOriginId] = useState(places.find((p) => p.type === "stage")?.id ?? "");
  const [category, setCategory] = useState("");
  const origin = places.find((p) => p.id === originId);
  const nearest = origin
    ? places
        .filter((p) => p.type === category)
        .sort(
          (a, b) =>
            Math.hypot(a.x - origin.x, a.y - origin.y) - Math.hypot(b.x - origin.x, b.y - origin.y),
        )
        .slice(0, 3)
    : [];
  return (
    <section aria-label="Find nearby on the plan" className="mx-4 my-4 border-y border-border py-4">
      <h2 className="text-[20px] font-bold">Find nearby</h2>
      <label className="mt-3 block text-[15px]">
        I’m at
        <select
          className="ios-field mt-1"
          value={originId}
          onChange={(e) => setOriginId(e.target.value)}
        >
          {places
            .filter((p) => p.type === "stage" || p.type === "entrance")
            .map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
        </select>
      </label>
      <div className="mt-3 flex flex-wrap gap-2">
        {[
          { type: "water", label: "Water" },
          { type: "toilet", label: "Toilets" },
          { type: "first-aid", label: "Medical" },
          { type: "bar", label: "Bars" },
        ].map(({ type, label }) => (
          <button
            key={type}
            type="button"
            className="ios-chip"
            aria-pressed={category === type}
            onClick={() => {
              setCategory(type);
              map.setSelected(null);
              map.setQuery("");
              map.setFilter(type as "water" | "toilet" | "first-aid" | "bar");
            }}
          >
            {label}
          </button>
        ))}
      </div>
      {category && (
        <div className="mt-3" aria-live="polite">
          <p className="mb-2 text-[14px] text-muted-foreground">
            Ordered by proximity on the supplied image. Walking distance, opening status and queues
            are pending.
          </p>
          {nearest.length ? (
            nearest.map((p) => (
              <SecondaryButton key={p.id} className="mb-2" onClick={() => map.setSelected(p.id)}>
                {p.name} ↗
              </SecondaryButton>
            ))
          ) : (
            <p>No verified {category} points are listed on this plan. Ask the on-site team.</p>
          )}
        </div>
      )}
    </section>
  );
}
