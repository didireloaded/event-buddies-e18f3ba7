import { MessageCircle, MapPin } from "lucide-react";
import { eventTime } from "@/lib/attendee/schedule";
import { useCompanion } from "./context";
import { CrewPeople } from "./CrewPeople";
import { FestivalBump } from "./FestivalBump";
import { FindMe } from "./FindMe";
import { Regroup } from "./Regroup";
import { Chevron, IconTile, RowText } from "./ui";

export { countdownLabel } from "@/lib/attendee/event-clock";

export function CrewView() {
  const { openSheet, attendee, places } = useCompanion();
  const meeting = attendee.preferences.meeting;
  const place = places.find((point) => point.id === meeting?.pointId);
  return (
    <>
      <h1 className="ios-large-title px-4 pt-2">Crew</h1>
      <CrewPeople />
      <div className="mx-4 mt-5">
        <h2 className="ios-section-title">Find each other</h2>
        <div className="mt-3 flex flex-wrap gap-2">
          <Regroup />
          <FindMe />
        </div>
      </div>
      <FestivalBump />
      <div className="ios-group ios-group-indent mx-4 mt-6">
        <button type="button" className="ios-row" onClick={() => openSheet({ kind: "pings" })}>
          <IconTile icon={MessageCircle} />
          <RowText title="Where are you?" subtitle="Share a quick message with your friend" />
          <Chevron />
        </button>
        <button type="button" className="ios-row" onClick={() => openSheet({ kind: "meeting" })}>
          <IconTile icon={MapPin} />
          <RowText
            title={place ? `Meet at ${place.name}` : "Choose a meetup spot"}
            subtitle={meeting ? `${eventTime(meeting.at)} CAT · saved on this phone` : undefined}
          />
          <Chevron />
        </button>
      </div>
      <p className="px-4 pt-4 text-[14px] text-muted-foreground">
        QR and link sharing work with saved plans. Live crew locations need the Cloud connection.
      </p>
    </>
  );
}
