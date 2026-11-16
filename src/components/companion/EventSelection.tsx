import { useState } from "react";
import { dateLabel } from "@/lib/attendee/event-clock";
import { eventTime } from "@/lib/attendee/schedule";
import { useCompanion } from "./context";
import { Sheet } from "./Sheet";
import { Button } from "konsta/react";

export function EventSelection() {
  const { data, attendee, navigate, now } = useCompanion();
  const [preview, setPreview] = useState(false);
  const ended = now !== null && now > +data.event.endAt;
  return (
    <div className="px-4 pt-4">
      <h1 className="ios-large-title">Your next event</h1>
      <p className="mt-2 text-[17px] text-muted-foreground">Where are we meeting?</p>
      <h2 className="mt-7 mb-3 text-[20px] font-bold">{ended ? "Past events" : "Coming up"}</h2>
      <button
        type="button"
        className="ios-press flex w-full items-center gap-3 overflow-hidden rounded-xl bg-popover p-3 text-left"
        onClick={() => setPreview(true)}
        aria-label={`Preview ${data.event.name}`}
      >
        <img
          src={data.event.heroImageUrl}
          alt="Sound of Summer festival crowd"
          width={1200}
          height={800}
          className="size-20 flex-none rounded-[10px] object-cover"
        />
        <span className="block min-w-0">
          <span className="block text-[20px] font-semibold">{data.event.name}</span>
          <span className="mt-1 block text-[16px] text-muted-foreground">
            {dateLabel(data.event.startAt, data.event.timezone, {
              day: "numeric",
              month: "long",
              year: "numeric",
            })}{" "}
            · {data.event.city}
          </span>
        </span>
      </button>
      {preview && (
        <Sheet title={data.event.name} onClose={() => setPreview(false)}>
          <p className="text-[20px] font-semibold">{data.event.venueName}</p>
          <p className="mt-2 text-[17px] text-muted-foreground">
            {eventTime(data.event.startAt)}–{eventTime(data.event.endAt)} CAT · 18+
          </p>
          <Button
            large
            rounded
            className="mt-6 min-h-12 bg-primary text-primary-foreground focus-visible:outline-2 focus-visible:outline-offset-2"
            onClick={() => {
              if (attendee.update({ selectedEventId: data.event.id })) {
                setPreview(false);
                navigate("home");
              }
            }}
          >
            {ended ? "View recap" : "I’m going"}
          </Button>
        </Sheet>
      )}
    </div>
  );
}
