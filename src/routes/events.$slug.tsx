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
      { property: "og:type", content: "website" },
    ],
  }),
  component: DynamicEventRoute,
});

function DynamicEventRoute() {
  const { slug } = Route.useParams();
  const [data] = useState(getDemoData);
  return <EventCompanion data={data} initialEventSlug={slug} />;
}
