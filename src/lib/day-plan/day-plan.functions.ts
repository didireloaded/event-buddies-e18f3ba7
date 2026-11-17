import { createServerFn } from "@tanstack/react-start";
import { GatewayError, generateResponse } from "@lovable.dev/ai-gateway";
import { getDemoData } from "@/lib/event/demo-data";
import {
  buildPlanFacts,
  dayPlanInput,
  dayPlanJsonSchema,
  dayPlanSchema,
  enforceKnownTimes,
  type DayPlan,
} from "./schema";

const INSTRUCTIONS = `You plan a festival day for one attendee of Sound of Summer 2026.
Use ONLY the JSON facts provided. Rules:
- Sound of Summer set times are NOT published. Never invent a time. For every favourite artist use exactly "Time to be announced".
- Only use a time when it appears in the facts (gates open, event end, or the saved meeting time).
- The meeting plan is private to this attendee; it has not been sent to the crew. Say so in the meeting item detail.
- No GPS, walking times, crowd levels, queues, prices or ticket purchases. Never mention them as facts.
- Only name a stage or venue place when the facts give it; otherwise use null.
- Item kinds: favourite_artist, meeting, venue_wayfinding, break. Order items sensibly; include the meeting if one exists.
- Keep summary and note short; the note must explain the unpublished timetable or other missing data.`;

type Result = { ok: true; plan: DayPlan } | { ok: false; error: string };

export const suggestDayPlan = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => dayPlanInput.parse(input))
  .handler(async ({ data }): Promise<Result> => {
    const facts = buildPlanFacts(getDemoData(), data);
    if (!facts.savedArtists.length && !facts.meeting)
      return { ok: false, error: "Save an artist or a meeting plan first." };
    try {
      const response = await generateResponse(
        {
          model: "openai/gpt-6-astra",
          instructions: INSTRUCTIONS,
          input: [{ role: "user", content: `Facts (JSON):\n${JSON.stringify(facts)}` }],
          text: {
            format: {
              type: "json_schema",
              name: "day_plan",
              strict: true,
              schema: dayPlanJsonSchema,
            },
          },
        },
        { signal: AbortSignal.timeout(8000) },
      );
      const text = response.output
        .flatMap((item) => (item.type === "message" ? item.content : []))
        .map((part) => (part.type === "output_text" ? part.text : ""))
        .join("");
      let json: unknown;
      try {
        json = JSON.parse(text);
      } catch {
        return { ok: false, error: "The plan came back unreadable. Try again." };
      }
      const parsed = dayPlanSchema.safeParse(json);
      if (!parsed.success) return { ok: false, error: "The plan didn’t pass checks. Try again." };
      return { ok: true, plan: enforceKnownTimes(parsed.data, facts) };
    } catch (error) {
      if (error instanceof GatewayError) {
        if (error.httpStatus === 402) return { ok: false, error: "AI credits have run out." };
        if (error.httpStatus === 429)
          return { ok: false, error: "Too many requests right now. Try again in a minute." };
      }
      return { ok: false, error: "Couldn’t reach the planning service. Try again." };
    }
  });
