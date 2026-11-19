import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { EventCompanion } from "@/components/companion/EventCompanion";
import { getDemoData } from "@/lib/event/demo-data";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Event Buddies · Discover events, venue plans & crews" },
      {
        name: "description",
        content:
          "Mobile event platform for festivals, concerts, conferences and community events. Explore venue maps, programmes, offline tickets and private crew coordination.",
      },
      { property: "og:title", content: "Event Buddies" },
      {
        property: "og:description",
        content:
          "Discover events, find stages and facilities, save favourites and coordinate with your crew.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Index,
});

function Index() {
  // Static, deterministic demo data — identical on server and client.
  const [data] = useState(getDemoData);
  return <EventCompanion data={data} />;
}
