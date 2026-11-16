import { useState } from "react";
import { Cross } from "lucide-react";
import { useCompanion } from "./context";
import { Sheet } from "./Sheet";
import { SecondaryButton } from "./ui";

export function SafetyAccess() {
  const { places, openPlace, data } = useCompanion();
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        type="button"
        aria-label="Emergency and first aid"
        className="ios-press grid size-11 place-items-center rounded-full text-favorite"
        onClick={() => setOpen(true)}
      >
        <Cross size={21} />
      </button>
      {open && (
        <Sheet title="Emergency & first aid" onClose={() => setOpen(false)}>
          <p className="mb-4 text-[17px]">
            For immediate assistance, alert the nearest steward or head to a marked medical point.
          </p>
          {places
            .filter((p) => p.type === "first-aid" || p.type === "security")
            .map((p) => (
              <div key={p.id} className="mb-4">
                <SecondaryButton
                  onClick={() => {
                    setOpen(false);
                    openPlace(p.id);
                  }}
                >
                  {p.name} · show on map ↗
                </SecondaryButton>
                <p className="mt-1 text-[15px] text-muted-foreground">{p.description}</p>
              </div>
            ))}
          <p className="text-[15px] text-muted-foreground">
            On-site emergency phone, free-water locations, lifeguard and lost-property contacts are
            awaiting confirmation.
          </p>
          <img
            src={data.event.mapImageUrl}
            width={1238}
            height={1238}
            alt="Official venue plan with medical crosses marking the two first-aid points"
            className="mt-4 w-full"
          />
        </Sheet>
      )}
    </>
  );
}
