import type { DemoData } from "@/lib/event/types";
import type { EventMemory } from "./memories";
import { dateLabel } from "./event-clock";

export async function memoryCard(data: DemoData, memory: EventMemory): Promise<Blob> {
  const source = URL.createObjectURL(memory.photo);
  try {
    const photo = new Image();
    photo.src = source;
    await photo.decode();
    const canvas = document.createElement("canvas");
    canvas.width = 1080;
    canvas.height = 1440;
    const context = canvas.getContext("2d");
    if (!context) throw new Error("This browser couldn’t create the photo card.");
    context.fillStyle = "#111111";
    context.fillRect(0, 0, 1080, 1440);
    context.fillStyle = "#ffffff";
    context.font = "600 40px system-ui, sans-serif";
    context.fillText("eventbuddies", 48, 90);
    // Centre-crop the attendee’s actual photo into the story frame.
    const ratio = Math.max(984 / photo.naturalWidth, 900 / photo.naturalHeight);
    const width = 984 / ratio;
    const height = 900 / ratio;
    context.drawImage(
      photo,
      (photo.naturalWidth - width) / 2,
      (photo.naturalHeight - height) / 2,
      width,
      height,
      48,
      144,
      984,
      900,
    );
    context.font = "700 48px system-ui, sans-serif";
    context.fillText(data.event.name, 48, 1120, 984);
    context.font = "28px system-ui, sans-serif";
    let line = "";
    let y = 1180;
    for (const character of memory.caption) {
      if (context.measureText(line + character).width > 984 && line) {
        context.fillText(line.trim(), 48, y);
        y += 36;
        line = character;
      } else line += character;
    }
    context.fillText(line, 48, y, 984);
    context.font = "28px system-ui, sans-serif";
    context.fillText(
      dateLabel(data.event.startAt, data.event.timezone, {
        day: "numeric",
        month: "long",
        year: "numeric",
      }),
      48,
      1370,
    );
    return await new Promise<Blob>((resolve, reject) =>
      canvas.toBlob(
        (blob) => (blob ? resolve(blob) : reject(new Error("The photo card couldn’t be saved."))),
        "image/png",
      ),
    );
  } finally {
    URL.revokeObjectURL(source);
  }
}
