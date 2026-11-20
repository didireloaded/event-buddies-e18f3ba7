import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { EventCompanion } from "@/components/companion/EventCompanion";
import { getDemoData } from "@/lib/event/demo-data";

export const Route = createFileRoute("/events/$slug")({
  head: ({ params }) => ({
    meta: [
      { title: `${params.slug.replace(/-/g, " ")} · Event Buddies` },
      {
        name: "description",
        content:
          "Discover events, explore venue plans, save favourites and coordinate with your crew on Event Buddies.",
      },
      { property: "og:title", content: `${params.slug.replace(/-/g, " ")} · Event Buddies` },
      {
        property: "og:description",
        content: "Explore this event’s programme, venue plan and crew on Event Buddies.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: DynamicEventRoute,
});

function DynamicEventRoute() {
  const { slug } = Route.useParams();
  const [data] = useState(getDemoData);
  return <EventCompanion data={data} initialEventSlug={slug} />;
}
