import { useState } from "react";
import { z } from "zod";
import { parseStoredPreferences, type Preferences } from "@/lib/attendee/use-attendee";
import { useCompanion } from "./context";
import { PrimaryButton, SecondaryButton } from "./ui";

const backupSchema = z.object({
  version: z.literal(1),
  eventId: z.string(),
  preferences: z
    .object({
      saved: z.array(z.string()).max(100),
      savedArtists: z.array(z.string()).max(100),
      profile: z.object({ name: z.string().min(1).max(50), handle: z.string().max(30) }),
      following: z.boolean(),
      status: z.string().max(50),
      meeting: z.object({ pointId: z.string(), at: z.string() }).nullable(),
    })
    .passthrough(),
});

export function PlanBackup() {
  const { data, attendee } = useCompanion();
  const [incoming, setIncoming] = useState<Preferences | null>(null);
  const [error, setError] = useState("");
  return (
    <section className="mt-5 border-t border-border pt-4" aria-labelledby="backup-title">
      <h3 id="backup-title" className="text-[17px] font-semibold">
        Keep a copy of your plan
      </h3>
      <p className="mb-3 mt-1 text-[14px] text-muted-foreground">
        Download your profile, favourites, meeting, check-in and ride notes. Photos stay on this
        phone. The file contains your personal details.
      </p>
      <SecondaryButton
        disabled={!attendee.ready}
        onClick={() => {
          const blob = new Blob(
            [
              JSON.stringify(
                { version: 1, eventId: data.event.id, preferences: attendee.preferences },
                null,
                2,
              ),
            ],
            { type: "application/json" },
          );
          const url = URL.createObjectURL(blob);
          const link = document.createElement("a");
          link.href = url;
          link.download = `${data.event.slug}-my-plan.json`;
          link.click();
          setTimeout(() => URL.revokeObjectURL(url), 1000);
        }}
      >
        Download plan backup
      </SecondaryButton>
      <label className="mt-4 block text-[15px] font-semibold">
        Restore a backup
        <input
          className="mt-2 block w-full text-[16px]"
          type="file"
          accept="application/json,.json"
          disabled={!attendee.ready}
          onChange={async (event) => {
            const file = event.target.files?.[0];
            setIncoming(null);
            setError("");
            if (!file) return;
            if (file.size > 64000) {
              setError("Choose a plan backup smaller than 64 KB.");
              return;
            }
            try {
              const backup = backupSchema.parse(JSON.parse(await file.text()));
              if (backup.eventId !== data.event.id) throw new Error("Other event");
              const meetingTime =
                backup.preferences.meeting && Date.parse(backup.preferences.meeting.at);
              if (
                meetingTime !== null &&
                (!Number.isFinite(meetingTime) ||
                  meetingTime < +data.event.startAt ||
                  meetingTime > +data.event.endAt)
              )
                throw new Error("Invalid meeting");
              setIncoming(parseStoredPreferences(backup.preferences, data));
            } catch {
              setError("Choose a valid backup for this event, with a meeting during event hours.");
            }
          }}
        />
      </label>
      {error && (
        <p role="alert" className="mt-2 text-destructive">
          {error}
        </p>
      )}
      {incoming && (
        <div className="mt-3" role="status">
          <p className="mb-2 text-[15px]">
            Restore {incoming.profile.name}’s plan with {incoming.savedArtists.length} favourite
            artists? This replaces your current plan and keeps your existing photos.
          </p>
          <div className="grid grid-cols-2 gap-2">
            <PrimaryButton
              onClick={() => {
                if (attendee.update(incoming)) {
                  setIncoming(null);
                  attendee.notify("Plan restored on this device");
                }
              }}
            >
              Restore plan
            </PrimaryButton>
            <SecondaryButton onClick={() => setIncoming(null)}>Cancel</SecondaryButton>
          </div>
        </div>
      )}
    </section>
  );
}
