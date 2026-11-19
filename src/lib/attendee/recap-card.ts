import type { DemoData } from "@/lib/event/types";
import type { Preferences } from "./use-attendee";
import { dateLabel } from "./event-clock";

export async function createRecapCard(data: DemoData, preferences: Preferences): Promise<Blob> {
  const canvas = document.createElement("canvas");
  canvas.width = 1080;
  canvas.height = 1350;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Image export unavailable");
  const ink = "#111111",
    paper = "#ffffff";
  ctx.fillStyle = paper;
  ctx.fillRect(0, 0, 1080, 1350);
  ctx.fillStyle = ink;
  ctx.font = "bold 42px sans-serif";
  ctx.fillText("eventbuddies.", 64, 96);
  ctx.font = "bold 36px sans-serif";
  ctx.fillText("MY FESTIVAL RECAP", 64, 180);
  ctx.fillStyle = ink;
  const titleWords = data.event.name.toUpperCase().split(" ");
  const split = Math.ceil(titleWords.length / 2);
  for (const [index, line] of [
    titleWords.slice(0, split).join(" "),
    titleWords.slice(split).join(" "),
  ].entries()) {
    let size = 96;
    ctx.font = `bold ${size}px sans-serif`;
    while (ctx.measureText(line).width > 936 && size > 24) {
      size -= 2;
      ctx.font = `bold ${size}px sans-serif`;
    }
    ctx.fillText(line, 64, 302 + index * 103);
  }
  ctx.fillStyle = ink;
  ctx.font = "30px sans-serif";
  ctx.fillText(
    `${dateLabel(data.event.startAt, data.event.timezone, { day: "numeric", month: "short", year: "numeric" })} · ${data.event.city}`,
    64,
    470,
  );
  ctx.save();
  ctx.setLineDash([10, 10]);
  ctx.strokeStyle = ink;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(0, 520);
  ctx.lineTo(1080, 520);
  ctx.stroke();
  ctx.restore();
  const fit = (text: string, y: number, size = 38) => {
    let fontSize = size;
    ctx.font = `bold ${fontSize}px sans-serif`;
    while (ctx.measureText(text).width > 936 && fontSize > 22) {
      fontSize -= 2;
      ctx.font = `bold ${fontSize}px sans-serif`;
    }
    ctx.fillText(text, 64, y, 936);
  };
  fit(preferences.profile.name, 602, 50);
  const artists = data.festival.artists.filter((a) => preferences.savedArtists.includes(a.id));
  const people = [...new Set(preferences.sharedPlans.map((entry) => entry.plan.name))];
  ctx.font = "26px sans-serif";
  ctx.fillText("ARTISTS I SAVED", 64, 678);
  if (artists.length)
    artists.slice(0, 3).forEach((artist, index) => fit(artist.name, 738 + index * 56));
  else fit("My own festival rhythm", 738, 34);
  ctx.font = "26px sans-serif";
  ctx.fillText(
    people.length ? "PEOPLE WHO SHARED A PLAN WITH ME" : "MY FESTIVAL. MY WAY.",
    64,
    966,
  );
  fit(
    people.length ? people.slice(0, 3).join(" · ") : "A little music. A lot of memories.",
    1020,
    34,
  );
  ctx.fillStyle = ink;
  ctx.fillRect(0, 1100, 1080, 250);
  ctx.fillStyle = paper;
  ctx.font = "bold 34px sans-serif";
  ctx.fillText(
    `${artists.length} favourites · ${preferences.stamps.length} checked stops`,
    64,
    1188,
  );
  ctx.font = "28px sans-serif";
  ctx.fillText("Keep the plan. Share the memory.", 64, 1250);
  return new Promise((resolve, reject) =>
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error("Image export failed"))),
      "image/png",
    ),
  );
}

export async function createLineupPoster(data: DemoData, savedArtistIds: string[]): Promise<Blob> {
  const artists = data.festival.artists.filter((artist) => savedArtistIds.includes(artist.id));
  if (!artists.length) throw new Error("Save an artist before exporting your lineup.");
  const canvas = document.createElement("canvas");
  canvas.width = 1080;
  canvas.height = Math.max(1350, 480 + artists.length * 76);
  const context = canvas.getContext("2d");
  if (!context) throw new Error("Image export is unavailable in this browser.");
  context.fillStyle = "#111111";
  context.fillRect(0, 0, canvas.width, canvas.height);
  context.fillStyle = "#ffffff";
  context.font = "600 36px system-ui, sans-serif";
  context.fillText("eventbuddies · MY LINEUP", 64, 100);
  context.font = "700 76px system-ui, sans-serif";
  context.fillText(data.event.name, 64, 230, 952);
  context.font = "32px system-ui, sans-serif";
  context.fillText(
    dateLabel(data.event.startAt, data.event.timezone, {
      day: "numeric",
      month: "long",
      year: "numeric",
    }),
    64,
    300,
  );
  artists.forEach((artist, index) => {
    context.font = "600 44px system-ui, sans-serif";
    context.fillText(artist.name, 64, 420 + index * 76, 952);
  });
  context.font = "28px system-ui, sans-serif";
  context.fillText(
    data.festival.timetablePublished
      ? "My saved artists"
      : "My saved artists · Set times awaiting publication",
    64,
    canvas.height - 64,
    952,
  );
  return new Promise((resolve, reject) =>
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error("The lineup poster couldn’t be saved."))),
      "image/png",
    ),
  );
}

export async function createCrewYearbookCard(input: {
  data: DemoData;
  preferences: Preferences;
  crewName: string;
  memberNames: string[];
  meetingLabel: string;
}): Promise<Blob> {
  const { data, preferences, crewName, memberNames, meetingLabel } = input;
  const canvas = document.createElement("canvas");
  canvas.width = 1080;
  canvas.height = 1350;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Image export unavailable");

  ctx.fillStyle = "#0f1719";
  ctx.fillRect(0, 0, 1080, 1350);

  ctx.fillStyle = "#197b82";
  ctx.fillRect(0, 0, 1080, 16);

  ctx.fillStyle = "#7ed1d6";
  ctx.font = "600 32px system-ui, sans-serif";
  ctx.fillText("EVENT BUDDIES · CREW YEARBOOK", 64, 104);

  ctx.fillStyle = "#ffffff";
  ctx.font = "700 72px system-ui, sans-serif";
  ctx.fillText(crewName || "Our Crew", 64, 210, 952);

  ctx.fillStyle = "#a3b3b8";
  ctx.font = "32px system-ui, sans-serif";
  ctx.fillText(
    `${data.event.name} · ${dateLabel(data.event.startAt, data.event.timezone, {
      day: "numeric",
      month: "long",
      year: "numeric",
    })} · ${data.event.city}`,
    64,
    276,
    952,
  );

  ctx.fillStyle = "#7ed1d6";
  ctx.font = "600 28px system-ui, sans-serif";
  ctx.fillText("CREW ROSTER", 64, 376);

  const uniqueMembers = [
    ...new Set([preferences.profile.name, ...memberNames].filter((n) => n && n.trim().length > 0)),
  ];
  ctx.fillStyle = "#ffffff";
  uniqueMembers.slice(0, 6).forEach((name, idx) => {
    ctx.font = "600 42px system-ui, sans-serif";
    ctx.fillText(`${idx + 1}. ${name}`, 64, 444 + idx * 62, 952);
  });

  ctx.fillStyle = "#7ed1d6";
  ctx.font = "600 28px system-ui, sans-serif";
  ctx.fillText("MEETING SPOT", 64, 864);

  ctx.fillStyle = "#ffffff";
  ctx.font = "600 38px system-ui, sans-serif";
  ctx.fillText(meetingLabel || "Meeting spot saved on our phones", 64, 922, 952);

  const artists = data.festival.artists
    .filter((a) => preferences.savedArtists.includes(a.id))
    .map((a) => a.name);
  ctx.fillStyle = "#7ed1d6";
  ctx.font = "600 28px system-ui, sans-serif";
  ctx.fillText("SHARED ARTIST PICKS", 64, 1020);

  ctx.fillStyle = "#ffffff";
  ctx.font = "500 34px system-ui, sans-serif";
  ctx.fillText(
    artists.length ? artists.slice(0, 4).join(" · ") : "Exploring the stages together",
    64,
    1078,
    952,
  );

  if (preferences.badges.length > 0) {
    ctx.fillStyle = "#a3b3b8";
    ctx.font = "500 28px system-ui, sans-serif";
    ctx.fillText(`Vibe · ${preferences.badges.slice(0, 5).join(" · ")}`, 64, 1146, 952);
  }

  ctx.fillStyle = "#197b82";
  ctx.fillRect(0, 1210, 1080, 140);
  ctx.fillStyle = "#ffffff";
  ctx.font = "600 30px system-ui, sans-serif";
  ctx.fillText(
    `${uniqueMembers.length} crew ${uniqueMembers.length === 1 ? "member" : "members"} · ${preferences.stamps.length} passport stops checked`,
    64,
    1290,
    952,
  );

  return new Promise((resolve, reject) =>
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error("Crew yearbook card export failed"))),
      "image/png",
    ),
  );
}
