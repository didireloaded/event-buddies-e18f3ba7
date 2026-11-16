import { useState } from "react";
import { Plus } from "lucide-react";
import { eventTime } from "@/lib/attendee/schedule";
import { initials, useCompanion } from "./context";
import { Sheet } from "./Sheet";
import { Avatar, PrimaryButton, Section } from "./ui";

/** People are drawn only from plans actually imported on this phone. */
export function CrewPeople() {
  const { attendee, places, openSheet, openPlace, view } = useCompanion();
  const plans = attendee.preferences.sharedPlans;
  const [selected, setSelected] = useState<number | null>(null);
  const entry = selected === null ? undefined : plans[selected];
  const meeting = entry?.plan.meeting;
  const place = places.find((point) => point.id === meeting?.pointId);
  return (
    <Section title="Your crew" id="crew-people" className="px-4">
      <div className="scrollbar-none flex gap-4 overflow-x-auto rounded-xl bg-popover px-4 py-4">
        <button
          type="button"
          className="flex min-w-16 flex-col items-center gap-2"
          onClick={() => openSheet({ kind: "profile" })}
        >
          <Avatar label={initials(attendee.preferences.profile.name)} size="lg" />
          <span className="text-[15px] font-medium">You</span>
        </button>
        {plans.map(({ plan, receivedAt }, index) => (
          <button
            key={`${receivedAt}-${index}`}
            type="button"
            className="flex w-20 flex-none flex-col items-center gap-2"
            onClick={() => setSelected(index)}
            aria-label={`View ${plan.name}’s shared plan`}
          >
            <Avatar label={initials(plan.name)} index={index} size="lg" />
            <span className="w-full truncate text-[15px] font-medium">{plan.name}</span>
          </button>
        ))}
        <a
          href="#crew"
          onClick={(event) => {
            if (view === "crew") {
              event.preventDefault();
              document.getElementById("crew-bump")?.scrollIntoView({ block: "center" });
            }
          }}
          className="flex min-w-16 flex-col items-center gap-2"
          aria-label="Share with a friend"
        >
          <span className="grid size-14 place-items-center rounded-full bg-favorite-soft text-favorite">
            <Plus size={24} />
          </span>
          <span className="text-[15px] font-medium">Add</span>
        </a>
      </div>
      <p className="mt-2 text-[14px] text-muted-foreground">
        {plans.length
          ? "Tap a friend to see their shared plan."
          : "Bring a friend’s plan over by QR or link."}
      </p>
      {entry && (
        <Sheet title={entry.plan.name} onClose={() => setSelected(null)}>
          <div className="space-y-4">
            <p className="text-[15px] text-muted-foreground">
              Saved copy · received {new Date(entry.receivedAt).toLocaleDateString()}
            </p>
            <p className="text-[20px] font-semibold">
              {place && meeting
                ? `${place.name} · ${eventTime(meeting.at)} CAT`
                : "No meeting point shared"}
            </p>
            {place && (
              <PrimaryButton
                onClick={() => {
                  setSelected(null);
                  openPlace(place.id);
                }}
              >
                Show meeting point
              </PrimaryButton>
            )}
            <p className="text-[15px] text-muted-foreground">
              Live location sharing awaits the crew connection.
            </p>
            <button
              type="button"
              className="min-h-11 text-[17px] text-destructive"
              onClick={() => {
                if (
                  attendee.update({ sharedPlans: plans.filter((_, index) => index !== selected) })
                )
                  setSelected(null);
              }}
            >
              Remove saved plan
            </button>
          </div>
        </Sheet>
      )}
    </Section>
  );
}
