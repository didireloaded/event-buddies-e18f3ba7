import { useState } from "react";
import { useCompanion } from "./context";
import { Sheet } from "./Sheet";
import { RidePhoto } from "./RidePhoto";
import { PrimaryButton, SecondaryButton } from "./ui";

export function RideBookmark() {
  const { attendee, places, openPlace } = useCompanion();
  const [editing, setEditing] = useState(false);
  const ride = attendee.preferences.ride;
  const gates = places.filter((p) => p.type === "entrance");
  const [pointId, setPointId] = useState(gates[0]?.id ?? "");
  const [note, setNote] = useState("");
  const [kind, setKind] = useState<"car" | "shuttle">("car");
  const place = places.find((p) => p.id === ride?.pointId);
  return (
    <div className="mx-4 my-4 border-y border-border py-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-[20px] font-bold">Your ride home</h2>
          <p className="text-[15px] text-muted-foreground">
            {ride
              ? `${ride.kind === "car" ? "Car" : "Shuttle"} · ${place?.name}`
              : "Save a gate reference before heading in."}
          </p>
        </div>
        <button
          type="button"
          disabled={!attendee.ready}
          className="min-h-11 flex-none px-2 font-semibold"
          onClick={() => {
            setPointId(ride?.pointId ?? gates[0]?.id ?? "");
            setNote(ride?.note ?? "");
            setKind(ride?.kind ?? "car");
            setEditing(true);
          }}
        >
          {ride ? "Edit" : "Save ride"}
        </button>
      </div>
      {ride && (
        <>
          <p className="mt-2 whitespace-pre-wrap text-[15px]">{ride.note}</p>
          <button
            type="button"
            className="mt-2 min-h-11 font-semibold"
            onClick={() => openPlace(ride.pointId)}
          >
            Show gate on map ↗
          </button>
        </>
      )}
      {ride && <RidePhoto />}
      {editing && (
        <Sheet title="Bookmark your ride" onClose={() => setEditing(false)}>
          <form
            className="space-y-4"
            onSubmit={(event) => {
              event.preventDefault();
              if (attendee.update({ ride: { pointId, note: note.trim(), kind } })) {
                attendee.notify("Ride saved on this device");
                setEditing(false);
              }
            }}
          >
            <label className="block">
              Ride type
              <select
                className="ios-field mt-1"
                value={kind}
                onChange={(e) => setKind(e.target.value as "car" | "shuttle")}
              >
                <option value="car">Parked car</option>
                <option value="shuttle">Shuttle</option>
              </select>
            </label>
            <label className="block">
              Gate landmark
              <select
                className="ios-field mt-1"
                required
                value={pointId}
                onChange={(e) => setPointId(e.target.value)}
              >
                {gates.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="block">
              Parking or pickup note
              <textarea
                className="ios-field mt-1"
                maxLength={300}
                placeholder="Row, vehicle, landmark or pickup details"
                value={note}
                onChange={(e) => setNote(e.target.value)}
              />
            </label>
            <p className="text-[14px] text-muted-foreground">
              Your own landmark reference. Confirm your shuttle pickup with the operator.
            </p>
            <PrimaryButton type="submit">Save on this device</PrimaryButton>
            {ride && (
              <SecondaryButton
                onClick={() => {
                  if (attendee.update({ ride: null })) setEditing(false);
                }}
              >
                Remove bookmark
              </SecondaryButton>
            )}
          </form>
        </Sheet>
      )}
    </div>
  );
}
