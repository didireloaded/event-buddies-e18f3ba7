import { defineTool, ToolError } from "@lovable.dev/mcp-js";
import { getDemoData } from "@/lib/event/demo-data";
import { buildPlaces } from "@/lib/attendee/map";
import { eventTime } from "@/lib/attendee/schedule";
import { requireCallerSupabase } from "../supabase-caller";

export default defineTool({
  name: "get_my_saved_plan",
  title: "Get my saved plan",
  description:
    "Get the signed-in attendee’s synced favourite artists and private meeting plan for Sound of Summer 2026.",
  inputSchema: {},
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async (_args, ctx) => {
    const { supabase, userId } = requireCallerSupabase(ctx);
    const data = getDemoData();
    const { data: row, error } = await supabase
      .from("attendee_event_preferences")
      .select("saved_artist_ids, meeting, updated_at")
      .eq("user_id", userId)
      .eq("event_id", data.event.id)
      .maybeSingle();
    if (error) {
      throw new ToolError("Couldn’t read your synced event preferences.");
    }

    const places = buildPlaces(data);
    const stageName = (id: string | null) =>
      id ? (data.stages.find((s) => s.id === id)?.name ?? null) : null;
    const savedIds = row?.saved_artist_ids ?? [];
    const savedArtists = data.festival.artists
      .filter((a) => savedIds.includes(a.id))
      .map((a) => ({
        id: a.id,
        name: a.name,
        billing: a.role,
        stage: stageName(a.stageId),
      }));

    const rawMeeting =
      row?.meeting && typeof row.meeting === "object" && !Array.isArray(row.meeting)
        ? (row.meeting as { pointId?: unknown; at?: unknown })
        : null;
    const meetingPlace =
      typeof rawMeeting?.pointId === "string"
        ? (places.find((p) => p.id === rawMeeting.pointId) ?? null)
        : null;
    const meeting =
      meetingPlace && typeof rawMeeting?.at === "string"
        ? {
            pointId: meetingPlace.id,
            place: meetingPlace.name,
            at: rawMeeting.at,
            timeCat: `${eventTime(rawMeeting.at)} CAT`,
          }
        : null;

    const artistSummary = savedArtists.length
      ? `Saved artists (${savedArtists.length}): ${savedArtists.map((a) => a.name).join(", ")}.`
      : "No saved artists synced to your account yet.";
    const meetingSummary = meeting
      ? `Private meeting: ${meeting.place} at ${meeting.timeCat}.`
      : "No private meeting plan synced to your account.";

    return {
      content: [
        {
          type: "text",
          text: `${artistSummary} ${meetingSummary} Set times remain unpublished.`,
        },
      ],
      structuredContent: {
        eventId: data.event.id,
        savedArtists,
        meeting,
        updatedAt: row?.updated_at ?? null,
      },
    };
  },
});
