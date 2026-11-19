import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function roundCoord(value: unknown, decimals: number, min: number, max: number): number | null {
  if (typeof value !== "number" || !Number.isFinite(value)) return null;
  if (value < min || value > max) return null;
  const factor = 10 ** decimals;
  return Math.round(value * factor) / factor;
}

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
    const action = body["action"] === "remove" ? "remove" : "drop";
    const crewId = typeof body["crewId"] === "string" ? body["crewId"].trim() : "";

    if (!crewId) {
      return new Response(JSON.stringify({ ok: false, error: "crewId is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "remove") {
      const { data, error } = await client.rpc("remove_pin", { p_crew_id: crewId });
      if (error) {
        return new Response(JSON.stringify({ ok: false, error: error.message }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      return new Response(JSON.stringify({ ok: true, result: data }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const eventId = typeof body["eventId"] === "string" ? body["eventId"].trim() : "";
    const pointId = typeof body["pointId"] === "string" ? body["pointId"].trim() : null;
    const x = roundCoord(body["x"], 1, 0, 100);
    const y = roundCoord(body["y"], 1, 0, 100);
    const lat = roundCoord(body["lat"], 4, -90, 90);
    const lng = roundCoord(body["lng"], 4, -180, 180);

    const { data, error } = await client.rpc("drop_pin", {
      p_event_id: eventId,
      p_crew_id: crewId,
      p_point_id: pointId,
      p_x: x,
      p_y: y,
      p_lat: lat,
      p_lng: lng,
    });

    if (error) {
      return new Response(JSON.stringify({ ok: false, error: error.message }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ ok: true, pin: data }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(
      JSON.stringify({
        ok: false,
        error: err instanceof Error ? err.message : "Unable to process pin update",
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }
});
