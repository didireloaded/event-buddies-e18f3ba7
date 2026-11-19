import { createFileRoute, redirect } from "@tanstack/react-router";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { isSafeOAuthRedirect, redirectHost } from "@/lib/oauth-return-path";

type OAuthResult = {
  data: {
    redirect_url?: string;
    redirect_to?: string;
    client?: { name?: string };
    redirect_uri?: string;
    scope?: string;
  } | null;
  error: { message: string } | null;
};
type OAuthApi = {
  getAuthorizationDetails(id: string): Promise<OAuthResult>;
  approveAuthorization(id: string): Promise<OAuthResult>;
  denyAuthorization(id: string): Promise<OAuthResult>;
};
const oauth = () => (supabase.auth as unknown as { oauth: OAuthApi }).oauth;

export const Route = createFileRoute("/.lovable/oauth/consent")({
  ssr: false,
  validateSearch: (s: Record<string, unknown>) => ({
    authorization_id: typeof s["authorization_id"] === "string" ? s["authorization_id"] : "",
  }),
  beforeLoad: async ({ search, location }) => {
    if (!search.authorization_id)
      throw new Error("This connection link is missing its request ID.");
    const { data } = await supabase.auth.getSession();
    if (!data.session)
      throw redirect({
        to: "/login",
        search: { next: location.pathname + location.searchStr },
      });
  },
  loaderDeps: ({ search }) => ({ id: search.authorization_id }),
  loader: async ({ deps }) => {
    const { data, error } = await oauth().getAuthorizationDetails(deps.id);
    if (error) throw new Error(error.message);
    const immediate = data?.redirect_url ?? data?.redirect_to;
    if (immediate && !data?.client) {
      if (!isSafeOAuthRedirect(immediate)) {
        throw new Error("This connection request returned an unsafe redirect destination.");
      }
      throw redirect({ href: immediate });
    }
    const { data: u } = await supabase.auth.getUser();
    return { details: data, email: u.user?.email ?? "" };
  },
  head: () => ({
    meta: [
      { title: "Connect an assistant — Event Buddies" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: ConsentRoute,
  errorComponent: ({ error }) => (
    <main className="mx-auto max-w-sm px-5 py-16 text-foreground">
      <h1 className="text-2xl font-bold">Couldn't load this request</h1>
      <p className="mt-2 text-muted-foreground">
        {error instanceof Error ? error.message : "Unknown error."} It may have expired — start the
        connection again from your assistant.
      </p>
    </main>
  ),
});

function ConsentRoute() {
  const { details, email } = Route.useLoaderData();
  const { authorization_id } = Route.useSearch();
  return (
    <Consent
      authorizationId={authorization_id}
      details={details}
      email={email}
      onDecide={(approve) =>
        approve
          ? oauth().approveAuthorization(authorization_id)
          : oauth().denyAuthorization(authorization_id)
      }
      onRedirect={(target) => {
        window.location.href = target;
      }}
    />
  );
}

export function Consent({
  authorizationId,
  details,
  email,
  onDecide,
  onRedirect,
}: {
  authorizationId: string;
  details: OAuthResult["data"];
  email: string;
  onDecide: (approve: boolean) => Promise<OAuthResult>;
  onRedirect: (target: string) => void;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const client = details?.client?.name ?? "An app";
  const host = redirectHost(details?.redirect_uri);

  async function decide(approve: boolean) {
    if (!authorizationId) {
      setError("This connection link is missing its request ID.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const { data, error } = await onDecide(approve);
      const target = data?.redirect_url ?? data?.redirect_to;
      if (error || !target) {
        setBusy(false);
        setError(error?.message ?? "No redirect was returned. Try again.");
        return;
      }
      if (!isSafeOAuthRedirect(target)) {
        setBusy(false);
        setError("This connection request returned an unsafe redirect destination.");
        return;
      }
      onRedirect(target);
    } catch {
      setBusy(false);
      setError("Couldn’t finish this connection request. Try again.");
    }
  }

  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col justify-center gap-5 px-5 py-10 text-foreground">
      <div className="border-b border-separator pb-4">
        <p className="eb-kicker text-primary">Event Buddies · Assistant access</p>
        <h1 className="eb-page-title mt-2 text-[28px]">Connect {client} to Event Buddies</h1>
      </div>
      <p className="text-[15px] leading-relaxed">
        {client} will be able to read public Sound of Summer event info, the lineup and venue
        places, plus your synced saved artists, meeting plan and private crew.
      </p>
      <div className="eb-panel space-y-1.5 p-4 text-[14px] text-muted-foreground">
        {email && <p>Signed in as {email}</p>}
        {host && <p>Returns to {host}</p>}
        <p>
          Shares your basic profile, email and read-only access to your synced event plan and crew.
          Your local ticket copy and photo diary stay on your phone.
        </p>
      </div>
      {error && (
        <p role="alert" className="text-[14px] font-medium text-destructive">
          {error}
        </p>
      )}
      <div className="space-y-2.5">
        <button
          type="button"
          disabled={busy}
          onClick={() => void decide(true)}
          className="eb-press min-h-12 w-full rounded-full bg-primary px-5 text-[15px] font-semibold text-primary-foreground disabled:opacity-50"
        >
          Approve
        </button>
        <button
          type="button"
          disabled={busy}
          onClick={() => void decide(false)}
          className="eb-press min-h-12 w-full rounded-full border border-border bg-card px-5 text-[15px] font-semibold text-foreground disabled:opacity-50"
        >
          Cancel connection
        </button>
      </div>
    </main>
  );
}
