import { CalendarDays, CirclePlus, Radio, UserRound, LoaderCircle } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAccountAuth } from "@/lib/account/use-auth";
import type { OrgEvent, OrgProfile } from "@/lib/organiser/data";
import { cn } from "@/lib/utils";
import { OrganiserSignIn } from "./OrganiserSignIn";
import { EventsTab } from "./EventsTab";
import { CreateTab } from "./CreateTab";
import { LiveTab } from "./LiveTab";
import { AccountTab } from "./AccountTab";
import { EventReview } from "./EventReview";

export type OrgTab = "events" | "create" | "live" | "account";
const TABS: { id: OrgTab; label: string; icon: typeof CalendarDays }[] = [
  { id: "events", label: "Events", icon: CalendarDays },
  { id: "create", label: "Create", icon: CirclePlus },
  { id: "live", label: "Live", icon: Radio },
  { id: "account", label: "Account", icon: UserRound },
];

function readHash(): { tab: OrgTab; eventId: string | null } {
  const h = window.location.hash.replace(/^#/, "");
  const [tab, id] = h.split("/");
  const t = TABS.some((x) => x.id === tab) ? (tab as OrgTab) : "events";
  return { tab: t, eventId: t === "events" && id ? id : null };
}

export type OrgCtx = {
  userId: string;
  profile: OrgProfile | null;
  events: OrgEvent[];
  reload: () => Promise<void>;
  go: (tab: OrgTab, eventId?: string) => void;
};

export function OrganiserApp() {
  const { user, loading } = useAccountAuth();
  const [route, setRoute] = useState<{ tab: OrgTab; eventId: string | null }>({
    tab: "events",
    eventId: null,
  });
  const [profile, setProfile] = useState<OrgProfile | null>(null);
  const [events, setEvents] = useState<OrgEvent[] | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    const sync = () => setRoute(readHash());
    sync();
    window.addEventListener("hashchange", sync);
    return () => window.removeEventListener("hashchange", sync);
  }, []);

  const reload = useCallback(async () => {
    if (!user) return;
    setError("");
    const [p, e] = await Promise.all([
      supabase.from("organiser_profiles").select("*").eq("user_id", user.id).maybeSingle(),
      supabase.from("organiser_events").select("*").order("updated_at", { ascending: false }),
    ]);
    if (p.error || e.error) {
      setError("Couldn’t load your workspace. Check your connection.");
      setEvents((prev) => prev ?? []);
      return;
    }
    setProfile(p.data);
    setEvents(e.data);
  }, [user]);

  useEffect(() => {
    void reload();
  }, [reload]);

  const go = (tab: OrgTab, eventId?: string) => {
    window.location.hash = eventId ? `${tab}/${eventId}` : tab;
  };

  if (loading)
    return (
      <div className="grid min-h-dvh place-items-center" role="status">
        <LoaderCircle className="animate-spin text-muted-foreground" aria-label="Loading" />
      </div>
    );
  if (!user) return <OrganiserSignIn />;

  const ctx: OrgCtx = { userId: user.id, profile, events: events ?? [], reload, go };
  const open = route.eventId ? ctx.events.find((e) => e.id === route.eventId) : null;

  return (
    <div className="min-h-dvh bg-background pb-[calc(var(--tabbar-h)+env(safe-area-inset-bottom)+1.5rem)] lg:pb-12">
      <header className="sticky top-0 z-20 border-b border-border bg-background/95 px-4 pb-2 pt-[calc(env(safe-area-inset-top)+0.5rem)] backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4">
          <div className="min-w-0">
            <p className="text-[13px] font-semibold uppercase tracking-wide text-muted-foreground">
              Event Buddies · Organiser workspace
            </p>
            <p className="truncate text-[15px]">{profile?.organisation || user.email}</p>
          </div>
          <a
            href="/#events"
            className="hidden min-h-10 items-center rounded-full bg-secondary px-4 text-[14px] font-semibold text-foreground lg:inline-flex"
          >
            Open Attendee App ↗
          </a>
        </div>
      </header>
      <div className="mx-auto max-w-6xl lg:grid lg:grid-cols-[220px_minmax(0,1fr)] lg:gap-8 lg:px-6 lg:pt-4">
        {/* Desktop left navigation sidebar */}
        <aside className="hidden lg:block" aria-label="Organiser desktop navigation">
          <nav className="sticky top-20 space-y-1.5">
            {TABS.map(({ id, label, icon: Icon }) => {
              const active = route.tab === id;
              return (
                <a
                  key={id}
                  href={`#${id}`}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "flex min-h-11 items-center gap-3 rounded-xl px-3.5 text-[15px] font-semibold transition-colors",
                    active ? "bg-favorite-soft text-primary" : "text-foreground hover:bg-popover",
                  )}
                >
                  <Icon size={19} aria-hidden />
                  {label}
                </a>
              );
            })}
          </nav>
        </aside>

        <main className="mx-auto w-full max-w-2xl px-4 lg:max-w-none lg:px-0">
          {error && (
            <div
              role="alert"
              className="mt-4 flex items-center gap-3 rounded-xl bg-warning-soft px-4 py-3 text-[15px]"
            >
              <span className="flex-1">{error}</span>
              <button
                type="button"
                className="min-h-11 font-semibold text-primary"
                onClick={() => void reload()}
              >
                Retry
              </button>
            </div>
          )}
          {events === null ? (
            <div className="py-16 text-center" role="status">
              <LoaderCircle
                className="mx-auto animate-spin text-muted-foreground"
                aria-label="Loading events"
              />
            </div>
          ) : open ? (
            <EventReview ctx={ctx} event={open} />
          ) : route.eventId ? (
            <p className="py-10 text-center text-muted-foreground">
              This event isn’t in your workspace.
            </p>
          ) : route.tab === "create" ? (
            <CreateTab ctx={ctx} />
          ) : route.tab === "live" ? (
            <LiveTab ctx={ctx} />
          ) : route.tab === "account" ? (
            <AccountTab ctx={ctx} />
          ) : (
            <EventsTab ctx={ctx} />
          )}
        </main>
      </div>
      <nav
        aria-label="Organiser"
        className="fixed inset-x-0 bottom-0 z-30 flex justify-center px-4 pb-[calc(env(safe-area-inset-bottom)+0.75rem)] lg:hidden"
      >
        <ul className="flex w-full max-w-md rounded-full bg-nav p-1.5 shadow-float">
          {TABS.map(({ id, label, icon: Icon }) => {
            const active = route.tab === id;
            return (
              <li key={id} className="flex-1">
                <a
                  href={`#${id}`}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "flex min-h-12 flex-col items-center justify-center rounded-full text-[11px] font-medium",
                    active ? "text-primary" : "text-nav-foreground/75",
                  )}
                >
                  <Icon size={20} aria-hidden />
                  {label}
                </a>
              </li>
            );
          })}
        </ul>
      </nav>
    </div>
  );
}
