import { useCompanion } from "./context";
import { countdownLabel, eventPhase } from "@/lib/attendee/event-clock";
import { eventTime } from "@/lib/attendee/schedule";

export function RightNow() {
  const { data, attendee, places, now, openPlace, navigate } = useCompanion();
  const meeting = attendee.preferences.meeting;
  const place = places.find((p) => p.id === meeting?.pointId);
  const past = now !== null && meeting && Date.parse(meeting.at) < now;
  return (
    <button
      type="button"
      className="mx-4 mb-3 flex min-h-12 w-[calc(100%-2rem)] items-center justify-between gap-3 border-b border-border py-2 text-left"
      onClick={() => {
        if (place) openPlace(place.id);
        else navigate("crew");
      }}
    >
      <span className="min-w-0">
        <strong className="block text-[15px]">
          {meeting && place
            ? `${past ? "Saved meetup" : "Your next meetup"} · ${place.name}`
            : eventPhase(data, now).label}
        </strong>
        <span className="block text-[14px] text-muted-foreground">
          {meeting && place
            ? `${eventTime(meeting.at)} CAT · ${past ? "Review your meeting plan" : countdownLabel(meeting.at, now)}`
            : "Choose where your friends can find you"}
        </span>
      </span>
      <span aria-hidden>↗</span>
    </button>
  );
}
