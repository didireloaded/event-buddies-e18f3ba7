import {
  CalendarDays,
  CirclePlus,
  Radio,
  UserRound,
  LoaderCircle,
  ArrowUpRight,
} from "lucide-react";
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
    try {
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
    } catch {
      setError("Couldn’t load your workspace. Check your connection.");
      setEvents((prev) => prev ?? []);
    }
  }, [user]);

  useEffect(() => {
    void reload();
  }, [reload]);

  const go = (tab: OrgTab, eventId?: string) => {
    window.location.hash = eventId ? `${tab}/${eventId}` : tab;
  };

  if (loading)
    return (
      <div className="grid min-h-dvh place-items-center bg-background" role="status">
        <LoaderCircle className="animate-spin text-primary" aria-label="Loading" />
      </div>
    );
  if (!user) return <OrganiserSignIn />;

  const ctx: OrgCtx = { userId: user.id, profile, events: events ?? [], reload, go };
  const open = route.eventId ? ctx.events.find((e) => e.id === route.eventId) : null;

  return (
    <div className="min-h-dvh bg-background pb-[calc(var(--tabbar-h)+env(safe-area-inset-bottom)+1.5rem)] text-foreground lg:pb-12">
      <header className="eb-header sticky top-0 z-20 px-4 pb-2.5 pt-[calc(env(safe-area-inset-top)+0.625rem)]">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4">
          <div className="flex min-w-0 items-center gap-3">
            <span
              aria-hidden
              className="grid size-8 flex-none place-items-center rounded-md bg-primary text-[13px] font-extrabold text-primary-foreground"
            >
              EB
            </span>
            <div className="min-w-0">
              <p className="eb-kicker text-[11px]">Event Buddies · Organiser Studio</p>
              <p className="truncate text-[15px] font-semibold text-foreground">
                {profile?.organisation || user.email}
              </p>
            </div>
          </div>
          <a
            href="/#events"
            className="hidden min-h-11 items-center gap-1.5 rounded-full border border-border bg-card px-4 text-[14px] font-semibold text-foreground hover:bg-secondary lg:inline-flex"
          >
            Attendee App <ArrowUpRight size={15} aria-hidden />
          </a>
        </div>
      </header>

      <div className="mx-auto max-w-7xl lg:grid lg:grid-cols-[232px_minmax(0,1fr)] lg:gap-8 lg:px-6 lg:pt-6">
        {/* Desktop left workspace sidebar */}
        <aside className="hidden lg:block" aria-label="Organiser desktop navigation">
          <nav className="sticky top-24 space-y-1">
            {TABS.map(({ id, label, icon: Icon }) => {
              const active = route.tab === id;
              return (
                <a
                  key={id}
                  href={`#${id}`}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "flex min-h-11 items-center gap-3 rounded-xl px-3.5 text-[15px] font-semibold transition-colors",
                    active
                      ? "bg-primary text-primary-foreground"
                      : "text-foreground hover:bg-secondary",
                  )}
                >
                  <Icon size={18} aria-hidden />
                  {label}
                </a>
              );
            })}
            <div className="mt-6 border-t border-separator pt-4 px-2">
              <p className="text-[12px] text-muted-foreground">
                Status:{" "}
                <strong className="capitalize text-foreground">
                  {profile?.verification_status ?? "unverified"}
                </strong>
              </p>
            </div>
          </nav>
        </aside>

        <main className="mx-auto w-full max-w-3xl px-4 lg:max-w-none lg:px-0">
          {error && (
            <div
              role="alert"
              className="mt-4 flex items-center gap-3 rounded-xl border border-warning/40 bg-warning-soft px-4 py-3 text-[15px]"
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
            <div className="space-y-3 py-10" role="status">
              <div className="h-12 w-48 animate-pulse rounded-xl bg-secondary" />
              <div className="h-24 w-full animate-pulse rounded-xl bg-secondary" />
              <div className="h-24 w-full animate-pulse rounded-xl bg-secondary" />
              <span className="sr-only">Loading events</span>
            </div>
          ) : open ? (
            <EventReview ctx={ctx} event={open} />
          ) : route.eventId ? (
            <div className="space-y-3 py-10 text-center">
              <p className="text-muted-foreground">This event isn’t in your workspace.</p>
              <button
                type="button"
                onClick={() => go("events")}
                className="inline-flex min-h-11 items-center justify-center rounded-full bg-primary px-5 text-[15px] font-semibold text-primary-foreground"
              >
                Back to all events
              </button>
            </div>
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

      {/* Mobile bottom workspace nav */}
      <nav
        aria-label="Organiser"
        className="companion-tabs fixed inset-x-0 bottom-0 z-30 px-2 pb-[env(safe-area-inset-bottom)] lg:hidden"
      >
        <ul className="mx-auto flex max-w-md">
          {TABS.map(({ id, label, icon: Icon }) => {
            const active = route.tab === id;
            return (
              <li key={id} className="flex-1">
                <a
                  href={`#${id}`}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "flex min-h-14 flex-col items-center justify-center gap-0.5 text-[12px] font-semibold",
                    active ? "text-primary" : "text-nav-foreground",
                  )}
                >
                  <Icon size={20} strokeWidth={active ? 2.3 : 1.8} aria-hidden />
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
