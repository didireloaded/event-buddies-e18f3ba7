import type { DemoData } from "@/lib/event/types";

export type Performance = DemoData["performances"][number];

export function eventTime(value: Date | string, timezone = "Africa/Windhoek") {
  return new Intl.DateTimeFormat("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: timezone,
  }).format(new Date(value));
}

export function scheduleClashes(performances: Performance[]) {
  return performances.flatMap((first, index) =>
    performances
      .slice(index + 1)
      .filter(
        (second) =>
          first.status !== "cancelled" &&
          second.status !== "cancelled" &&
          new Date(first.scheduledStart) < new Date(second.scheduledEnd) &&
          new Date(second.scheduledStart) < new Date(first.scheduledEnd),
      )
      .map((second) => [first, second] as const),
  );
}

const escape = (value: string) =>
  value.replace(/\\/g, "\\\\").replace(/\r?\n/g, "\\n").replace(/,/g, "\\,").replace(/;/g, "\\;");
const utc = (date: Date | string) =>
  new Date(date)
    .toISOString()
    .replace(/[-:]/g, "")
    .replace(/\.\d{3}/, "");
const calendarHeader = [
  "BEGIN:VCALENDAR",
  "VERSION:2.0",
  "PRODID:-//Event Buddies//Schedule//EN",
  "CALSCALE:GREGORIAN",
];

export function downloadCalendar(data: DemoData, performances: Performance[]) {
  const lines = [...calendarHeader];
  for (const performance of performances) {
    lines.push(
      "BEGIN:VEVENT",
      `UID:${performance.id}@event-buddies`,
      `DTSTAMP:${utc(new Date())}`,
      `DTSTART:${utc(performance.scheduledStart)}`,
      `DTEND:${utc(performance.scheduledEnd)}`,
      `SUMMARY:${escape(performance.artistName)}`,
      `LOCATION:${escape(`${data.stages.find((stage) => stage.id === performance.stageId)?.name ?? ""}, ${data.event.venueName}`)}`,
      `DESCRIPTION:${escape(data.event.name)}`,
      "END:VEVENT",
    );
  }
  downloadCalendarFile(lines, `${data.event.slug}-schedule.ics`);
}

export function downloadEventCalendar(data: DemoData) {
  downloadCalendarFile(
    [
      ...calendarHeader,
      "BEGIN:VEVENT",
      `UID:${data.event.id}@event-buddies`,
      `DTSTAMP:${utc(new Date())}`,
      `DTSTART:${utc(data.event.startAt)}`,
      `DTEND:${utc(data.event.endAt)}`,
      `SUMMARY:${escape(data.event.name)}`,
      `LOCATION:${escape(`${data.event.venueName}, ${data.event.city}`)}`,
      "END:VEVENT",
    ],
    `${data.event.slug}.ics`,
  );
}

function downloadCalendarFile(lines: string[], filename: string) {
  lines.push("END:VCALENDAR");
  const url = URL.createObjectURL(
    new Blob([lines.join("\r\n") + "\r\n"], {
      type: "text/calendar;charset=utf-8",
    }),
  );
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}
