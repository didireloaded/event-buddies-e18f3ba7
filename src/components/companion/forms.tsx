import { useState } from "react";
import {
  localDateTime,
  toMeeting,
  validateMeeting,
  type LocalMeeting,
} from "@/lib/attendee/meeting";
import { eventTime } from "@/lib/attendee/schedule";
import type { Place } from "@/lib/attendee/map";
import { PrimaryButton } from "./ui";

export function MeetingForm({
  eventStart,
  eventEnd,
  timezone,
  places,
  initial,
  selectedId,
  disabled,
  onSave,
  account = false,
  shared = false,
}: {
  eventStart: Date;
  eventEnd: Date;
  timezone: string;
  places: Place[];
  initial: LocalMeeting | null;
  selectedId: string | null;
  disabled: boolean;
  onSave: (meeting: LocalMeeting | null) => void;
  account?: boolean;
  shared?: boolean;
}) {
  const [pointId, setPointId] = useState(initial?.pointId ?? selectedId ?? places[0]?.id ?? "");
  const [at, setAt] = useState(
    initial
      ? localDateTime(initial.at, timezone)
      : localDateTime(new Date(+eventStart + 6 * 3600000), timezone),
  );
  const [error, setError] = useState<string | null>(null);
  const field = error?.includes("place") ? "place" : error ? "time" : null;
  return (
    <form
      noValidate
      onSubmit={(event) => {
        event.preventDefault();
        const problem = validateMeeting(
          { pointId, at },
          { start: eventStart, end: eventEnd, placeIds: places.map((p) => p.id) },
        );
        setError(problem);
        if (!problem) onSave(toMeeting({ pointId, at }));
      }}
      className="space-y-4 pt-1"
    >
      <p className="text-[15px] text-muted-foreground">
        Pick a landmark and a time between {eventTime(eventStart)} and {eventTime(eventEnd)} CAT.
        {shared
          ? "This meeting is shared with every crew member after sync."
          : account
            ? "Your private plan will sync to your account when connected."
            : "Your plan is saved on this device."}
      </p>
      <div>
        <label htmlFor="meeting-place" className="mb-1.5 block text-[15px] font-semibold">
          Meeting place
        </label>
        <select
          id="meeting-place"
          className="ios-field"
          value={pointId}
          aria-invalid={field === "place"}
          aria-describedby={field === "place" ? "meeting-error" : undefined}
          onChange={(event) => setPointId(event.target.value)}
        >
          {places.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label htmlFor="meeting-at" className="mb-1.5 block text-[15px] font-semibold">
          Date & time (CAT)
        </label>
        <input
          id="meeting-at"
          type="datetime-local"
          className="ios-field"
          value={at}
          min={localDateTime(eventStart, timezone)}
          max={localDateTime(eventEnd, timezone)}
          aria-invalid={field === "time"}
          aria-describedby={field === "time" ? "meeting-error" : undefined}
          onChange={(event) => setAt(event.target.value)}
        />
      </div>
      {error && (
        <p id="meeting-error" role="alert" className="text-[15px] font-medium text-destructive">
          {error}
        </p>
      )}
      <PrimaryButton type="submit" disabled={disabled}>
        Save meeting plan
      </PrimaryButton>
      {initial && (
        <button
          type="button"
          disabled={disabled}
          onClick={() => onSave(null)}
          className="min-h-11 w-full text-[17px] font-semibold text-destructive"
        >
          Remove meeting plan
        </button>
      )}
    </form>
  );
}

export function validateProfile(name: string, handle: string) {
  if (!name.trim()) return { field: "name", message: "Enter a display name." } as const;
  if (name.trim().length > 50)
    return { field: "name", message: "Use 50 characters or fewer." } as const;
  if (!/^[A-Za-z0-9_]{3,30}$/.test(handle.trim()))
    return { field: "handle", message: "Use 3–30 letters, numbers or underscores." } as const;
  return null;
}

export function ProfileForm({
  initial,
  disabled,
  savedCount,
  onSave,
}: {
  initial: { name: string; handle: string };
  disabled: boolean;
  savedCount: number;
  onSave: (profile: { name: string; handle: string }) => void;
}) {
  const [name, setName] = useState(initial.name);
  const [error, setError] = useState<string | null>(null);
  return (
    <form
      noValidate
      className="space-y-4 pt-1"
      onSubmit={(event) => {
        event.preventDefault();
        const problem =
          name.trim().length < 2
            ? "Use at least two characters for your name."
            : name.trim().length > 50
              ? "Use 50 characters or fewer."
              : null;
        setError(problem);
        if (!problem) onSave({ ...initial, name: name.trim() });
      }}
    >
      <p className="text-[15px] text-muted-foreground">
        {savedCount} saved {savedCount === 1 ? "favourite" : "favourites"}. This is the name shown
        on your shared plans.
      </p>
      <div>
        <label htmlFor="profile-name" className="mb-1.5 block text-[15px] font-semibold">
          Display name
        </label>
        <input
          id="profile-name"
          className="ios-field"
          value={name}
          maxLength={50}
          autoComplete="nickname"
          aria-invalid={Boolean(error)}
          aria-describedby={error ? "profile-error" : undefined}
          onChange={(event) => setName(event.target.value)}
        />
      </div>
      {error && (
        <p id="profile-error" role="alert" className="text-[15px] font-medium text-destructive">
          {error}
        </p>
      )}
      <PrimaryButton type="submit" disabled={disabled}>
        Save profile
      </PrimaryButton>
    </form>
  );
}
