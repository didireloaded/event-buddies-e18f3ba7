import { useCompanion } from "./context";
import { ProfileForm } from "./forms";
import { PrivacyPanel } from "./PrivacyPanel";
import { PlanBackup } from "./PlanBackup";
import { Section } from "./ui";
import { AfterEventData } from "./AfterEventData";
import { OfflineReadiness } from "./OfflineReadiness";
import { TicketVault } from "./TicketVault";

export function YouView() {
  const { attendee } = useCompanion();
  return (
    <div className="px-4">
      <h1 className="ios-large-title pt-2">You</h1>
      <Section title="Your festival name" id="you-name">
        <ProfileForm
          initial={attendee.preferences.profile}
          disabled={!attendee.ready}
          savedCount={attendee.preferences.savedArtists.length}
          onSave={(profile) => {
            if (attendee.update({ profile, hasName: true })) attendee.notify("Your name is saved");
          }}
        />
      </Section>
      <label className="mt-6 block font-semibold">
        Festival mode
        <select
          className="ios-field mt-2"
          value={attendee.preferences.festivalMode ?? ""}
          onChange={(e) => {
            const mode = e.target.value;
            if (mode === "music" || mode === "friends" || mode === "both")
              attendee.update({ festivalMode: mode });
          }}
        >
          <option value="" disabled>
            Choose your mode
          </option>
          <option value="music">Here for the music</option>
          <option value="friends">Here to meet people</option>
          <option value="both">A bit of both</option>
        </select>
      </label>
      <details className="mt-6 border-y border-border py-2">
        <summary className="min-h-12 cursor-pointer content-center text-[17px] font-semibold">
          Location, privacy & saved data
        </summary>
        <PrivacyPanel />
      </details>
      <PlanBackup />
      <TicketVault />
      <OfflineReadiness />
      <AfterEventData />
    </div>
  );
}
