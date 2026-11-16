import { eventTime } from "@/lib/attendee/schedule";
import { initials, useCompanion } from "./context";
import { Avatar, Section, SecondaryButton } from "./ui";

export function SharedPlans() {
  const { attendee, data, places, openPlace } = useCompanion();
  if (!attendee.preferences.sharedPlans.length) return null;
  return (
    <Section title="Plans from your people" id="crew-shared" className="px-4">
      <p className="mb-3 text-[14px] text-muted-foreground">
        Copies received by QR or link. Ask your friend to share again when their plan changes.
      </p>
      <div className="divide-y divide-border">
        {attendee.preferences.sharedPlans.map(({ plan, receivedAt }, index) => {
          const place = places.find((p) => p.id === plan.meeting?.pointId);
          const common = plan.artists.filter((id) =>
            attendee.preferences.savedArtists.includes(id),
          );
          return (
            <article key={`${receivedAt}-${index}`} className="py-4">
              <div className="flex items-center gap-3">
                <Avatar index={index} label={initials(plan.name)} />
                <h3 className="flex-1 text-[18px] font-semibold">{plan.name}’s plan</h3>
                <button
                  type="button"
                  className="min-h-11 px-2 text-[14px] font-semibold"
                  aria-label={`Remove ${plan.name}’s shared plan`}
                  onClick={() =>
                    attendee.update({
                      sharedPlans: attendee.preferences.sharedPlans.filter(
                        (_, entryIndex) => entryIndex !== index,
                      ),
                    })
                  }
                >
                  Remove
                </button>
              </div>
              <p className="mt-2 text-[15px]">
                {place && plan.meeting
                  ? `${place.name} · ${eventTime(plan.meeting.at)} CAT`
                  : "No meeting included"}
              </p>
              <p className="mt-1 text-[14px] text-muted-foreground">
                {common.length
                  ? `${common.length} ${common.length === 1 ? "artist" : "artists"} in common · ${common.map((id) => data.festival.artists.find((a) => a.id === id)?.name).join(", ")}`
                  : "No saved artists in common yet"}
              </p>
              {place && (
                <SecondaryButton className="mt-3" onClick={() => openPlace(place.id)}>
                  Find the meeting point ↗
                </SecondaryButton>
              )}
            </article>
          );
        })}
      </div>
    </Section>
  );
}
