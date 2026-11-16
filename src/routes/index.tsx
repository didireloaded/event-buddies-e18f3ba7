import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { EventCompanion } from "@/components/companion/EventCompanion";
import { getDemoData } from "@/lib/event/demo-data";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Sound of Summer 2026 · Event Buddies" },
      {
        name: "description",
        content:
          "Venue map, announced lineup, favourites and crew meeting plans for Sound of Summer 2026 at Tidal Pools & Jetty Beach, Langstrand.",
      },
      { property: "og:title", content: "Sound of Summer 2026 · Event Buddies" },
      {
        property: "og:description",
        content: "Find stages, bars, toilets and medics, save artists and plan where your crew meets.",
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
