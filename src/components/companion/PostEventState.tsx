import { eventLifecycle } from "@/lib/attendee/lifecycle";
import { dateLabel } from "@/lib/attendee/event-clock";
import { eventTime } from "@/lib/attendee/schedule";
import { useCompanion } from "./context";
import { EventRecap } from "./EventRecap";
import { RideBookmark } from "./RideBookmark";
import { QuickPings } from "./QuickPings";
import { Regroup } from "./Regroup";
import { FindMe } from "./FindMe";

export function PostEventState() {
  const { data, now } = useCompanion();
  const life = eventLifecycle(data, now);
  if (life.phase === "cancelled")
    return (
      <section className="px-4 py-6">
        <h1 className="ios-large-title">Event update</h1>
        <p className="mt-4 text-[17px]">
          This event is marked cancelled. Check the organiser for ticket guidance and the latest
          information.
        </p>
        {data.festival.officialUrl && (
          <a
            href={data.festival.officialUrl}
            target="_blank"
            rel="noreferrer"
            className="mt-4 flex min-h-12 items-center font-semibold"
          >
            Official event information ↗<span className="sr-only"> Opens in a new tab</span>
          </a>
        )}
      </section>
    );
  if (life.phase !== "afterglow") return <EventRecap />;
  return (
    <>
      <section className="mx-4 border-b border-border py-4">
        <h1 className="ios-large-title">That’s a wrap.</h1>
        <p className="mt-2 text-[15px] text-muted-foreground">
          Your recap opens{" "}
          {dateLabel(new Date(life.recapAt), data.event.timezone, {
            weekday: "short",
            day: "numeric",
            month: "short",
          })}{" "}
          at {eventTime(new Date(life.recapAt))} CAT.
        </p>
        <p className="mt-4 text-[17px]">Find your ride. Keep your people close.</p>
        <div className="mt-4 flex flex-wrap gap-2">
          <Regroup />
          <FindMe />
        </div>
      </section>
      <RideBookmark />
      <QuickPings />
    </>
  );
}
