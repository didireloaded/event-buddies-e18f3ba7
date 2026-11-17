import { auth, defineMcp } from "@lovable.dev/mcp-js";
import getEventInfo from "./tools/get-event-info";
import listLineup from "./tools/list-lineup";
import searchVenuePlaces from "./tools/search-venue-places";

// Vite inlines the stable ref; the published SUPABASE_URL may be a proxy.
const projectRef = import.meta.env["VITE_SUPABASE_PROJECT_ID"] ?? "project-ref-unset";

export default defineMcp({
  name: "festival-map-meetup-buddies",
  title: "Festival Map Meetup Buddies",
  version: "0.1.0",
  instructions:
    "Read-only facts about Sound of Summer 2026 (Langstrand, Namibia): event info, announced lineup and venue-plan places. Set times and GPS are not published; never invent them.",
  auth: auth.oauth.issuer({
    issuer: `https://${projectRef}.supabase.co/auth/v1`,
    acceptedAudiences: "authenticated",
  }),
  tools: [getEventInfo, listLineup, searchVenuePlaces],
});
