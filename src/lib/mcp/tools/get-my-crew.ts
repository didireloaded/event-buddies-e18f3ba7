import { defineTool, ToolError } from "@lovable.dev/mcp-js";
import { getDemoData } from "@/lib/event/demo-data";
import { buildPlaces } from "@/lib/attendee/map";
import { eventTime } from "@/lib/attendee/schedule";
import { crewSchema } from "@/lib/crew/client";
import { requireCallerSupabase } from "../supabase-caller";

export default defineTool({
  name: "get_my_crew",
  title: "Get my crew",
  description:
    "Get the signed-in attendee’s private crew, shared crew meeting, and active expiring landmark pins for Sound of Summer 2026.",
  inputSchema: {},
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async (_args, ctx) => {
    const { supabase } = requireCallerSupabase(ctx);
    const data = getDemoData();
    const { data: raw, error } = await supabase.rpc("attendee_crew_state", {
      p_event_id: data.event.id,
    });
    if (error) {
      throw new ToolError("Couldn’t read your crew state.");
    }

    const places = buildPlaces(data);
    const parsed = crewSchema.safeParse(raw);
    const crew = parsed.success ? parsed.data : null;
    if (!crew) {
      return {
        content: [
          {
            type: "text",
            text: "You aren’t in a private crew for Sound of Summer 2026 yet.",
          },
        ],
        structuredContent: { crew: null },
      };
    }

    const meetingPlace = crew.meeting
      ? (places.find((p) => p.id === crew.meeting?.pointId) ?? null)
      : null;
    const meeting =
      crew.meeting && meetingPlace
        ? {
            pointId: meetingPlace.id,
            place: meetingPlace.name,
            at: crew.meeting.at,
            timeCat: `${eventTime(crew.meeting.at)} CAT`,
          }
        : null;

    const now = Date.now();
    const members = crew.members.map((m) => {
      const activePlace =
        m.pointId && m.expiresAt && Date.parse(m.expiresAt) > now
          ? (places.find((p) => p.id === m.pointId) ?? null)
          : null;
      return {
        name: m.name,
        owner: m.owner,
        landmark: activePlace ? activePlace.name : null,
        expiresAt: activePlace ? m.expiresAt : null,
      };
    });

    const meetingLine = meeting
      ? `Crew meeting: ${meeting.place} at ${meeting.timeCat}.`
      : "No shared crew meeting set.";
    const memberLine = members
      .map((m) => `${m.name}${m.owner ? " (owner)" : ""}${m.landmark ? ` — at ${m.landmark}` : ""}`)
      .join(", ");

    return {
      content: [
        {
          type: "text",
          text: `Crew "${crew.name}" (${members.length} ${members.length === 1 ? "member" : "members"}): ${memberLine}. ${meetingLine}`,
        },
      ],
      structuredContent: {
        crew: {
          id: crew.id,
          name: crew.name,
          revision: crew.revision,
          meeting,
          members,
        },
      },
    };
  },
});
