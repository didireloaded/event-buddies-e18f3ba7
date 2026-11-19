import { useState, type ReactNode } from "react";
import { Plus } from "lucide-react";
import { eventTime } from "@/lib/attendee/schedule";
import { initials, useCompanion } from "./context";
import { Sheet } from "./Sheet";
import { Avatar, PrimaryButton, Section } from "./ui";

/** People are drawn only from plans actually imported on this phone. */
export function CrewPeople({ action }: { action?: ReactNode } = {}) {
  const { attendee, avatar, places, openSheet, openPlace, view } = useCompanion();
  const plans = attendee.preferences.sharedPlans;
  const [selected, setSelected] = useState<number | null>(null);
  const entry = selected === null ? undefined : plans[selected];
  const meeting = entry?.plan.meeting;
  const place = places.find((point) => point.id === meeting?.pointId);
  return (
    <Section title="Your crew" id="crew-people" className="px-4" action={action}>
      <div className="ios-card scrollbar-none flex gap-4 overflow-x-auto px-4 py-4">
        <button
          type="button"
          className="flex min-w-16 flex-col items-center gap-1.5"
          onClick={() => openSheet({ kind: "profile" })}
        >
          <Avatar
            label={initials(attendee.preferences.profile.name)}
            src={avatar?.url}
            alt="Your profile photo"
            size="lg"
          />
          <span className="text-[14px] font-semibold">You</span>
        </button>
        {plans.map(({ plan, receivedAt }, index) => (
          <button
            key={`${receivedAt}-${index}`}
            type="button"
            className="flex w-20 flex-none flex-col items-center gap-1.5"
            onClick={() => setSelected(index)}
            aria-label={`View ${plan.name}’s shared plan`}
          >
            <Avatar label={initials(plan.name)} index={index} size="lg" />
            <span className="w-full truncate text-[14px] font-medium">{plan.name}</span>
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
          className="flex min-w-16 flex-col items-center gap-1.5"
          aria-label="Share with a friend"
        >
          <span className="grid size-16 place-items-center rounded-full border-2 border-dashed border-primary/35 bg-favorite-soft text-favorite">
            <Plus size={24} />
          </span>
          <span className="text-[14px] font-medium text-primary">Add</span>
        </a>
      </div>
      {plans.length > 0 && (
        <p className="mt-1.5 px-1 text-[13px] text-muted-foreground">
          Tap a friend to view their meetup plan.
        </p>
      )}
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
              This copy stays on your phone. Sign in to share expiring landmark pins with a
              connected crew.
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
