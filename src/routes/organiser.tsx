import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { OrganiserApp } from "@/components/organiser/OrganiserApp";
import { OrganiserWorkspace } from "@/components/organiser/OrganiserWorkspace";
import { accountConfigured } from "@/lib/account/use-auth";
import { getOrganiserData } from "@/lib/event/demo-data";

export const Route = createFileRoute("/organiser")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Organiser workspace · Event Buddies" },
      {
        name: "description",
        content:
          "Role-protected organiser workspace for reviewing and managing Event Buddies events.",
      },
      { property: "og:title", content: "Organiser workspace · Event Buddies" },
      {
        property: "og:description",
        content: "Private organiser workspace for Event Buddies.",
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
  return accountConfigured ? <OrganiserApp /> : <OrganiserWorkspace data={data} />;
}
