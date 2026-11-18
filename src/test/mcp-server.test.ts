import { describe, expect, it, vi } from "vitest";
import { defineMcp, ToolError } from "@lovable.dev/mcp-js";
import { createMcpProtocolHandler } from "@lovable.dev/mcp-js/protocols/mcp";
import { createOAuthProtectedResourceMetadataHandler } from "@lovable.dev/mcp-js/protocols/oauth-metadata";
import { assertToolResult } from "@lovable.dev/mcp-js/testing";
import { checkMcpServer, withMcpClient } from "@lovable.dev/mcp-js/testing/server";
import mcpServer from "@/lib/mcp";
import getEventInfo from "@/lib/mcp/tools/get-event-info";
import listLineup from "@/lib/mcp/tools/list-lineup";
import searchVenuePlaces from "@/lib/mcp/tools/search-venue-places";
import getMySavedPlan from "@/lib/mcp/tools/get-my-saved-plan";
import getMyCrew from "@/lib/mcp/tools/get-my-crew";
import * as callerModule from "@/lib/mcp/supabase-caller";
import { getDemoData } from "@/lib/event/demo-data";

const demo = getDemoData();

const publicTestServer = defineMcp({
  name: "festival-map-meetup-buddies",
  title: "Festival Map Meetup Buddies",
  version: "0.1.0",
  instructions:
    "Read-only facts about Sound of Summer 2026 (Langstrand, Namibia) plus the signed-in attendee’s synced saved artists, meeting plan and private crew. Set times and GPS are not published; never invent them.",
  tools: [getEventInfo, listLineup, searchVenuePlaces, getMySavedPlan, getMyCrew],
  metrics: false,
});

const publicHandler = createMcpProtocolHandler(publicTestServer);

function makeCtx(): never {
  return {
    signal: new AbortController().signal,
    client: { protocol: "2026-07-28" },
    progress: async () => {},
    isAuthenticated: () => false,
    getUserId: () => undefined,
    getUserEmail: () => undefined,
    getClientId: () => undefined,
    getScopes: () => [],
    getIssuer: () => undefined,
    getClaims: () => undefined,
    getToken: () => undefined,
  } as never;
}

describe("MCP tool handlers", () => {
  it("get_event_info returns verified Sound of Summer facts with unpublished timetable and GPS", async () => {
    const result = await getEventInfo.handler({}, makeCtx());
    await assertToolResult(result);
    const structured = result.structuredContent as {
      event: {
        name: string;
        venue: string;
        timetablePublished: boolean;
        mapGeoreferenced: boolean;
        stages: string[];
      };
    };
    expect(structured.event.name).toBe(demo.event.name);
    expect(structured.event.venue).toContain("Tidal Pools & Jetty Beach");
    expect(structured.event.timetablePublished).toBe(false);
    expect(structured.event.mapGeoreferenced).toBe(false);
    expect(structured.event.stages).toHaveLength(3);
    expect(result.content?.[0]).toMatchObject({
      type: "text",
      text: expect.stringContaining("Set times are not published yet"),
    });
  });

  it("list_lineup returns all 25 announced artists without fabricated set times", async () => {
    const result = await listLineup.handler({}, makeCtx());
    await assertToolResult(result);
    const structured = result.structuredContent as {
      artists: { id: string; name: string; billing: string; stage: string | null }[];
      timetablePublished: boolean;
    };
    expect(structured.artists).toHaveLength(25);
    expect(structured.timetablePublished).toBe(false);
    expect(structured.artists.find((a) => a.id === "shimza")?.stage).toBe("Main Stage");
    expect(structured.artists.find((a) => a.id === "xduppy")?.stage).toBeNull();
  });

  it("search_venue_places filters real places and handles empty or unknown queries", async () => {
    const allResult = await searchVenuePlaces.handler({ query: undefined }, makeCtx());
    await assertToolResult(allResult);
    expect((allResult.structuredContent as { places: unknown[] }).places).toHaveLength(41);

    const bathroomResult = await searchVenuePlaces.handler({ query: "bathroom" }, makeCtx());
    await assertToolResult(bathroomResult);
    const toilets = (bathroomResult.structuredContent as { places: { type: string }[] }).places;
    expect(toilets).toHaveLength(5);
    expect(toilets.every((p) => p.type === "toilet")).toBe(true);

    const medicalResult = await searchVenuePlaces.handler({ query: "medical" }, makeCtx());
    await assertToolResult(medicalResult);
    expect((medicalResult.structuredContent as { places: unknown[] }).places).toHaveLength(2);

    const artistStage = await searchVenuePlaces.handler({ query: "shimza" }, makeCtx());
    await assertToolResult(artistStage);
    expect((artistStage.structuredContent as { places: { id: string }[] }).places).toMatchObject([
      { id: "sos-main" },
    ]);

    const missingResult = await searchVenuePlaces.handler({ query: "helicopter pad" }, makeCtx());
    await assertToolResult(missingResult);
    expect((missingResult.structuredContent as { places: unknown[] }).places).toEqual([]);
    expect(missingResult.content?.[0]).toMatchObject({
      type: "text",
      text: expect.stringContaining("No matching places"),
    });
  });

  it("get_my_saved_plan and get_my_crew require OAuth and resolve synced account data", async () => {
    await expect(getMySavedPlan.handler({}, makeCtx())).rejects.toThrow(ToolError);
    await expect(getMyCrew.handler({}, makeCtx())).rejects.toThrow(ToolError);

    const spy = vi.spyOn(callerModule, "requireCallerSupabase").mockReturnValue({
      userId: "u-1",
      supabase: {
        from: () => ({
          select: () => ({
            eq: () => ({
              eq: () => ({
                maybeSingle: async () => ({
                  data: {
                    saved_artist_ids: ["shimza"],
                    meeting: { pointId: "sos-main", at: "2026-12-28T17:30:00+02:00" },
                    updated_at: "2026-11-18T12:00:00Z",
                  },
                  error: null,
                }),
              }),
            }),
          }),
        }),
        rpc: async () => ({
          data: {
            id: "d2222222-2222-4222-8222-222222222222",
            name: "Coast Crew",
            revision: 1,
            meeting: { pointId: "sos-jetty", at: "2026-12-28T18:00:00+02:00" },
            members: [
              {
                id: "d1111111-1111-4111-8111-111111111111",
                name: "Maya",
                owner: true,
                generation: 1,
                pointId: "sos-main",
                expiresAt: new Date(Date.now() + 3600000).toISOString(),
              },
            ],
          },
          error: null,
        }),
      } as never,
    });

    const planResult = await getMySavedPlan.handler({}, makeCtx());
    await assertToolResult(planResult);
    expect(planResult.content?.[0]).toMatchObject({
      type: "text",
      text: expect.stringContaining("Shimza"),
    });

    const crewResult = await getMyCrew.handler({}, makeCtx());
    await assertToolResult(crewResult);
    expect(crewResult.content?.[0]).toMatchObject({
      type: "text",
      text: expect.stringContaining("Coast Crew"),
    });

    spy.mockRestore();
  });
});

describe("MCP HTTP protocol and OAuth boundary", () => {
  it("lists and executes read-only tools and enforces closed input schemas", async () => {
    const report = await checkMcpServer({
      endpoint: "http://localhost/mcp",
      handler: publicHandler,
      calls: [
        { name: "get_event_info", arguments: {} },
        { name: "list_lineup", arguments: {} },
        { name: "search_venue_places", arguments: { query: "medical" } },
        { name: "get_my_saved_plan", arguments: {}, isError: true },
        { name: "get_my_crew", arguments: {}, isError: true },
        { name: "search_venue_places", arguments: { query: "x".repeat(81) }, isError: true },
        { name: "get_event_info", arguments: { unknownKey: true }, isError: true },
      ],
    });
    expect(report.passed).toBe(true);

    await withMcpClient(
      { endpoint: "http://localhost/mcp", handler: publicHandler },
      async (client) => {
        const listed = await client.listTools();
        expect(listed.tools.map((t) => t.name).sort()).toEqual([
          "get_event_info",
          "get_my_crew",
          "get_my_saved_plan",
          "list_lineup",
          "search_venue_places",
        ]);
        for (const tool of listed.tools) {
          expect(tool.annotations?.readOnlyHint).toBe(true);
        }
      },
    );
  });

  it("rejects unauthenticated and invalid-bearer MCP requests with RFC 9728 challenge", async () => {
    const protectedHandler = createMcpProtocolHandler(mcpServer, {
      resourcePath: "/mcp",
      metadataPath: "/.well-known/oauth-protected-resource",
      trustForwardedHost: true,
      trustForwardedProto: true,
    });
    const metadataHandler = createOAuthProtectedResourceMetadataHandler(mcpServer, {
      resourcePath: "/mcp",
      metadataPath: "/.well-known/oauth-protected-resource",
      trustForwardedHost: true,
      forwardedHostTrustedByPlatform: true,
      trustForwardedProto: true,
    });

    const unauth = await protectedHandler(
      new Request("https://eventbudides.lovable.app/mcp", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          accept: "application/json, text/event-stream",
        },
        body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "tools/list" }),
      }),
    );
    expect(unauth.status).toBe(401);
    expect(unauth.headers.get("cache-control")).toBe("no-store");
    expect(unauth.headers.get("www-authenticate")).toContain(
      'resource_metadata="https://eventbudides.lovable.app/.well-known/oauth-protected-resource"',
    );

    const forged = await protectedHandler(
      new Request("https://eventbudides.lovable.app/mcp", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          accept: "application/json, text/event-stream",
          authorization: "Bearer not-a-real-jwt",
        },
        body: JSON.stringify({ jsonrpc: "2.0", id: 2, method: "tools/list" }),
      }),
    );
    expect(forged.status).toBe(401);

    const metadata = await metadataHandler(
      new Request("https://eventbudides.lovable.app/.well-known/oauth-protected-resource"),
    );
    expect(metadata.status).toBe(200);
    const json = (await metadata.json()) as {
      resource: string;
      authorization_servers: string[];
      bearer_methods_supported: string[];
      resource_name: string;
    };
    expect(json.resource).toBe("https://eventbudides.lovable.app/mcp");
    expect(json.authorization_servers[0]).toMatch(/^https:\/\/.*\.supabase\.co\/auth\/v1$/);
    expect(json.bearer_methods_supported).toEqual(["header"]);
    expect(json.resource_name).toBe("Festival Map Meetup Buddies");
  });
});
