import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }
  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ ok: false, error: "Sign in required" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
    const client = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const body = (await req.json()) as Record<string, unknown>;
    const crewId = typeof body["crewId"] === "string" ? body["crewId"].trim() : "";
    const eventId = typeof body["eventId"] === "string" ? body["eventId"].trim() : "";
    const pointId = typeof body["pointId"] === "string" ? body["pointId"].trim() : null;
    const message =
      typeof body["message"] === "string"
        ? body["message"].trim().slice(0, 200)
        : "Looking for my crew";

    if (!crewId || !eventId) {
      return new Response(JSON.stringify({ ok: false, error: "crewId and eventId required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Record the lost-someone alert in attendee_crew_activities so offline/reconnecting members see it too
    await client.rpc("crew_post_activity", {
      p_event_id: eventId,
      p_kind: "sos",
      p_message: message,
      p_point_id: pointId,
      p_meta: { alert: "lost_someone" },
    });

    return new Response(
      JSON.stringify({
        ok: true,
        delivered: "realtime_and_activity_log",
        crewId,
        message,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  } catch (err) {
    return new Response(
      JSON.stringify({
        ok: false,
        error: err instanceof Error ? err.message : "Unable to send crew alert",
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }
});
