import { useState } from "react";
import { photoStore } from "@/lib/attendee/ride-photo";
import { storageKey } from "@/lib/attendee/use-attendee";
import { useCompanion } from "./context";
import { SecondaryButton } from "./ui";

export function PrivacyPanel() {
  const { data, attendee } = useCompanion();
  const [clearing, setClearing] = useState(false);
  const [error, setError] = useState("");
  return (
    <div className="space-y-4 pt-1 text-[16px] leading-relaxed">
      <p>
        Your phone’s GPS location is never requested. Landmark check-ins are chosen by you and stay
        on this device. Pins expire after 60 minutes or two hours after the event ends, whichever
        comes first. Expired pins are cleared when the app is open. Clear your pin from the status
        bar at any time.
      </p>
      <p>
        QR codes, meetup links and quick messages share only the details you choose. Anyone who
        receives a code, link or exported card can read or forward its contents. Clearing your pin
        or device data leaves previously shared copies with their recipients.
      </p>
      <p>
        Your profile, favourites, meetings, imported plans and ride notes use this browser’s
        storage. Landmark photos and ticket copies use local photo storage. Clearing browser data
        removes those records. You can download a plan backup from Crew. Photos stay on this device.
      </p>
      <p>
        Accounts, live crew location, attendee discovery and in-app message delivery are awaiting a
        Cloud connection.
      </p>
      <SecondaryButton
        disabled={clearing}
        onClick={async () => {
          setClearing(true);
          setError("");
          try {
            if ("indexedDB" in window) {
              await photoStore(data.event.id, "remove");
              await photoStore(`ticket:${data.event.id}`, "remove");
            }
            localStorage.removeItem(storageKey(data.event.id));
            attendee.notify(
              "Saved plans, profile, ticket and landmark photo cleared on this device",
            );
            window.location.reload();
          } catch {
            setError(
              "Couldn’t clear all saved data. Try again, or use your browser’s site-storage controls.",
            );
            setClearing(false);
          }
        }}
      >
        {clearing ? "Clearing saved data…" : "Clear my plans, profile, ticket and photo"}
      </SecondaryButton>
      {error && (
        <p role="alert" className="text-destructive">
          {error}
        </p>
      )}
    </div>
  );
}
