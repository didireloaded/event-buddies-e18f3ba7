import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { getDemoData } from "@/lib/event/demo-data";
import { buildPlaces, matchesMapSearch } from "@/lib/attendee/map";

export default defineTool({
  name: "search_venue_places",
  title: "Search venue places",
  description:
    "Find places on the Sound of Summer venue plan (stages, toilets, bars, water, medical, gates). Leave query empty to list all.",
  inputSchema: {
    query: z.string().max(80).optional().describe("e.g. 'toilets', 'medical', 'Main Stage'."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: ({ query }) => {
    const data = getDemoData();
    const places = buildPlaces(data)
      .filter((p) => matchesMapSearch(p, query ?? "", data))
      .map((p) => ({ id: p.id, name: p.name, type: p.type, description: p.description }));
    const text = places.length
      ? places.map((p) => `${p.name} (${p.type})${p.description ? ` — ${p.description}` : ""}`).join("\n")
      : "No matching places on the venue plan.";
    return {
      content: [{ type: "text", text: `${text}\n\nPositions are on the venue plan only; no GPS.` }],
      structuredContent: { places },
    };
  },
});
