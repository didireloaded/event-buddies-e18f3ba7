import { defineTool } from "@lovable.dev/mcp-js";
import { getDemoData } from "@/lib/event/demo-data";

export default defineTool({
  name: "list_lineup",
  title: "List lineup",
  description:
    "List announced Sound of Summer artists with their billing and stage where announced. Set times are not published.",
  inputSchema: {},
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: () => {
    const data = getDemoData();
    const stageName = (id: string | null) =>
      id ? (data.stages.find((s) => s.id === id)?.name ?? null) : null;
    const artists = data.festival.artists.map((a) => ({
      id: a.id,
      name: a.name,
      billing: a.role,
      stage: stageName(a.stageId),
    }));
    const text = artists
      .map((a) => `${a.name} — ${a.billing}${a.stage ? ` (${a.stage})` : ""}`)
      .join("\n");
    return {
      content: [{ type: "text", text: `${text}\n\nSet times: not published yet.` }],
      structuredContent: { artists, timetablePublished: false },
    };
  },
});
