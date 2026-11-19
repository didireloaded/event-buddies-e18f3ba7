import { clearAccountCache, queuedActions } from "@/lib/account/outbox";
import { supabase } from "@/integrations/supabase/client";
import { useState } from "react";
import { photoStore } from "@/lib/attendee/ride-photo";
import { avatarStorageKey } from "@/lib/attendee/avatar";
import { clearMemories } from "@/lib/attendee/memories";
import { clearEventTickets } from "@/lib/attendee/tickets";
import { LandmarkCheckin } from "./LandmarkCheckin";
import { storageKey } from "@/lib/attendee/use-attendee";
import { useCompanion } from "./context";
import { SecondaryButton } from "./ui";

export function PrivacyPanel() {
  const { data, attendee, crew } = useCompanion();
  const [clearing, setClearing] = useState(false);
  const [error, setError] = useState("");
  return (
    <div className="space-y-4 pt-1 text-[16px] leading-relaxed">
      <LandmarkCheckin />
      <p>
        GPS location is off by default and only requested if you explicitly enable Share Live
        Location or attach coordinates inside a private connected crew. Active-session GPS runs
        while Event Buddies stays open and pauses if backgrounded. Manual landmark check-ins are
        chosen by you, expire after 60 minutes (or two hours after the event ends), and can be
        stopped immediately with Ghost Mode or from the status bar.
      </p>
      <p>
        QR codes, meetup links and quick messages share only the details you choose. Anyone who
        receives a code, link or exported card can read or forward its contents. Clearing your pin
        or device data leaves previously shared copies with their recipients.
      </p>
      <p>
        Guest favourites and meetings, your local profile, imported plans and ride notes use this
        browser’s storage. Signed-in favourites, ticket metadata and your private meeting plan also
        sync to your account. Landmark photos, ticket images/PDFs and your photo diary stay on this
        device. Clearing browser data removes those local records. Download photos you want to keep.
      </p>
      <p>
        Background locked-screen GPS tracking, public attendee discovery and open event chat are not
        enabled. Signed-in crew members see only the location you choose to share, until it expires
        or you stop. Clearing this phone signs you out. Synced favourites and meetings remain in
        your account. Sync queued changes before clearing.
      </p>
      <SecondaryButton
        disabled={clearing}
        onClick={async () => {
          setClearing(true);
          setError("");
          try {
            if (attendee.auth.user) {
              if (queuedActions(attendee.scope).length || crew.pending) {
                setError(
                  "You have changes waiting to sync. Connect and sync first, or sign out from Your account to discard them.",
                );
                setClearing(false);
                return;
              }
              const result = await supabase.auth.signOut({ scope: "local" });
              if (result.error) throw result.error;
              clearAccountCache(attendee.scope);
            }
            if ("indexedDB" in window) {
              await photoStore(data.event.id, "remove");
              await clearEventTickets(data.event.id);
              await photoStore(avatarStorageKey(data.event.id), "remove");
              await clearMemories(data.event.id);
            } else {
              await clearEventTickets(data.event.id);
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
        {clearing ? "Clearing saved data…" : "Clear saved data on this phone"}
      </SecondaryButton>
      {error && (
        <p role="alert" className="text-destructive">
          {error}
        </p>
      )}
    </div>
  );
}
