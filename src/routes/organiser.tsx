import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { OrganiserWorkspace } from "@/components/organiser/OrganiserWorkspace";
import { getOrganiserData } from "@/lib/event/demo-data";

export const Route = createFileRoute("/organiser")({
  head: () => ({
    meta: [
      { title: "Organiser workspace (demo) · Event Buddies" },
      {
        name: "description",
        content:
          "Demo organiser view of the Sound of Summer 2026 event data, venue points and pending integrations.",
      },
      { property: "og:title", content: "Organiser workspace (demo) · Event Buddies" },
      {
        property: "og:description",
        content: "Read-only demo of event data readiness for Sound of Summer 2026.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: OrganiserPage,
});

function OrganiserPage() {
  const [data] = useState(getOrganiserData);
  return <OrganiserWorkspace data={data} />;
}
