import { auth, defineMcp } from "@lovable.dev/mcp-js";
import getEventInfo from "./tools/get-event-info";
import listLineup from "./tools/list-lineup";
import searchVenuePlaces from "./tools/search-venue-places";
import getMySavedPlan from "./tools/get-my-saved-plan";
import getMyCrew from "./tools/get-my-crew";

// Vite inlines the stable ref; the published SUPABASE_URL may be a proxy.
const projectRef = import.meta.env["VITE_SUPABASE_PROJECT_ID"] ?? "project-ref-unset";

export default defineMcp({
  name: "event-buddies",
  title: "Event Buddies",
  version: "0.2.0",
  instructions:
    "Read-only verified event information for Event Buddies plus the signed-in attendee’s synced saved favourites, meeting plan and private crew. Never invent unpublished set times, prices or GPS coordinates.",
  auth: auth.oauth.issuer({
    issuer: `https://${projectRef}.supabase.co/auth/v1`,
    acceptedAudiences: "authenticated",
  }),
  tools: [getEventInfo, listLineup, searchVenuePlaces, getMySavedPlan, getMyCrew],
});
