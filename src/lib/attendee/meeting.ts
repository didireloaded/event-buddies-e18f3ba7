export type LocalMeeting = { pointId: string; at: string };

/** "YYYY-MM-DDTHH:mm" wall-clock time in the given zone, for datetime-local inputs. */
export function localDateTime(value: Date | string, timezone: string) {
  return new Intl.DateTimeFormat("sv-SE", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  })
    .format(new Date(value))
    .replace(" ", "T");
}

/**
 * Validates a meeting plan. `at` is a datetime-local value interpreted as CAT
 * (UTC+02:00, Namibia has no daylight saving). Returns an error message or null.
 */
export function validateMeeting(
  input: { pointId: string; at: string },
  options: { start: Date; end: Date; placeIds: string[] },
): string | null {
  if (!input.pointId || !options.placeIds.includes(input.pointId))
    return "Choose a meeting place from the venue plan.";
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(input.at))
    return "Choose a date and time.";
  const time = Date.parse(`${input.at}:00+02:00`);
  if (!Number.isFinite(time)) return "Choose a valid date and time.";
  if (time < +options.start || time > +options.end)
    return "Pick a time during event hours.";
  return null;
}

export function toMeeting(input: { pointId: string; at: string }): LocalMeeting {
  return { pointId: input.pointId, at: `${input.at}:00+02:00` };
}
