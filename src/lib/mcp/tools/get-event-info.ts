import { defineTool } from "@lovable.dev/mcp-js";
import { getDemoData } from "@/lib/event/demo-data";
import { SOUND_OF_SUMMER } from "@/lib/event/sound-of-summer";

export default defineTool({
  name: "get_event_info",
  title: "Get event info",
  description:
    "Get Sound of Summer 2026 facts: date, hours, venue, organiser, ticket link and what is still unpublished.",
  inputSchema: {},
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: () => {
    const { event, stages } = getDemoData();
    const info = {
      name: event.name,
      venue: `${event.venueName}, ${event.city}, ${event.country}`,
      timezone: event.timezone,
      doorsOpenAt: event.doorsOpenAt.toISOString(),
      startAt: event.startAt.toISOString(),
      endAt: event.endAt.toISOString(),
      organiser: SOUND_OF_SUMMER.organiser,
      officialUrl: SOUND_OF_SUMMER.officialUrl,
      ticketUrl: SOUND_OF_SUMMER.ticketUrl,
      timetablePublished: SOUND_OF_SUMMER.timetablePublished,
      mapGeoreferenced: SOUND_OF_SUMMER.mapGeoreferenced,
      stages: stages.map((s) => s.name),
    };
    const text = `${info.name} at ${info.venue}. ${info.startAt} to ${info.endAt} (${info.timezone}). Organiser: ${info.organiser}. Tickets: ${info.ticketUrl}. Set times are not published yet; GPS is not available.`;
    return { content: [{ type: "text", text }], structuredContent: { event: info } };
  },
});
