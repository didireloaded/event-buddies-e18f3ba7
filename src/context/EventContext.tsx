import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { buildPlaces, type Place } from "@/lib/attendee/map";
import { getDemoData } from "@/lib/event/demo-data";
import type { DemoData } from "@/lib/event/types";
import { listPublishedOrganiserEvents } from "@/lib/organiser/cloud-extensions";
import { organiserEventToDemoData, readLocalPublishedEvents } from "@/lib/organiser/event-adapter";

export const ACTIVE_EVENT_STORAGE_KEY = "event-buddies:active-event-id";

export type EventContextValue = {
  activeEventId: string;
  data: DemoData;
  event: DemoData["event"];
  locations: Place[];
  programItems: DemoData["performances"];
  people: DemoData["festival"]["artists"];
  availableEvents: DemoData[];
  loading: boolean;
  error: string | null;
  selectEvent: (eventId: string) => void;
};

const EventContext = createContext<EventContextValue | null>(null);

export function EventProvider({
  initialData,
  initialEventSlug,
  children,
}: {
  initialData?: DemoData | undefined;
  initialEventSlug?: string | undefined;
  children: ReactNode;
}) {
  const baseData = useMemo(() => initialData ?? getDemoData(), [initialData]);
  const [extraDemos, setExtraDemos] = useState<DemoData[]>([]);
  const [activeEventId, setActiveEventId] = useState<string>(baseData.event.id);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Hydrate locally published events & active event selection after mount so SSR and client initial HTML match
  useEffect(() => {
    const locals = readLocalPublishedEvents()
      .filter(
        (ev) =>
          ev.id !== baseData.event.id &&
          ev.name.trim().toLowerCase() !== baseData.event.name.trim().toLowerCase(),
      )
      .map(organiserEventToDemoData);
    setExtraDemos(locals);

    const resolveFromList = (slugOrId: string): string | null => {
      const normalized = slugOrId.trim().toLowerCase();
      if (baseData.event.slug.toLowerCase() === normalized || baseData.event.id === slugOrId) {
        return baseData.event.id;
      }
      const match = locals.find(
        (item) => item.event.slug.toLowerCase() === normalized || item.event.id === slugOrId,
      );
      return match?.event.id ?? null;
    };

    if (initialEventSlug) {
      const matched = resolveFromList(initialEventSlug);
      if (matched) {
        setActiveEventId(matched);
        return;
      }
    }
    try {
      const paramSlug = new URLSearchParams(window.location.search).get("event");
      if (paramSlug) {
        const matched = resolveFromList(paramSlug);
        if (matched) {
          setActiveEventId(matched);
          return;
        }
      }
      const stored = localStorage.getItem(ACTIVE_EVENT_STORAGE_KEY);
      if (stored && (stored === baseData.event.id || locals.some((d) => d.event.id === stored))) {
        setActiveEventId(stored);
      }
    } catch {
      /* Ignore storage failures. */
    }
  }, [baseData.event.id, baseData.event.name, baseData.event.slug, initialEventSlug]);

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    void listPublishedOrganiserEvents()
      .then((cloudEvents) => {
        if (!mounted) return;
        const locals = readLocalPublishedEvents();
        const byId = new Map<string, ReturnType<typeof organiserEventToDemoData>>();
        for (const ev of [...cloudEvents, ...locals]) {
          if (
            ev.id !== baseData.event.id &&
            ev.name.trim().toLowerCase() !== baseData.event.name.trim().toLowerCase() &&
            !byId.has(ev.id)
          ) {
            byId.set(ev.id, organiserEventToDemoData(ev));
          }
        }
        const nextExtras = [...byId.values()];
        setExtraDemos(nextExtras);
        if (initialEventSlug) {
          const normalized = initialEventSlug.trim().toLowerCase();
          const matched = nextExtras.find(
            (item) =>
              item.event.slug.toLowerCase() === normalized || item.event.id === initialEventSlug,
          );
          if (matched) setActiveEventId(matched.event.id);
        }
        setError(null);
      })
      .catch(() => {
        if (mounted) setError(null);
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });
    return () => {
      mounted = false;
    };
  }, [baseData.event.id, baseData.event.name, initialEventSlug]);

  const availableEvents = useMemo(() => [baseData, ...extraDemos], [baseData, extraDemos]);

  const activeData = useMemo(
    () => availableEvents.find((item) => item.event.id === activeEventId) ?? baseData,
    [availableEvents, activeEventId, baseData],
  );

  const locations = useMemo(() => buildPlaces(activeData), [activeData]);

  const selectEvent = useCallback((eventId: string) => {
    setActiveEventId(eventId);
    if (typeof window !== "undefined") {
      try {
        localStorage.setItem(ACTIVE_EVENT_STORAGE_KEY, eventId);
      } catch {
        /* Ignore storage errors. */
      }
    }
  }, []);

  const value = useMemo<EventContextValue>(
    () => ({
      activeEventId: activeData.event.id,
      data: activeData,
      event: activeData.event,
      locations,
      programItems: activeData.performances,
      people: activeData.festival.artists,
      availableEvents,
      loading,
      error,
      selectEvent,
    }),
    [activeData, availableEvents, error, loading, locations, selectEvent],
  );

  return <EventContext.Provider value={value}>{children}</EventContext.Provider>;
}

export function useEvent(): EventContextValue {
  const ctx = useContext(EventContext);
  if (!ctx) {
    const fallback = getDemoData();
    return {
      activeEventId: fallback.event.id,
      data: fallback,
      event: fallback.event,
      locations: buildPlaces(fallback),
      programItems: fallback.performances,
      people: fallback.festival.artists,
      availableEvents: [fallback],
      loading: false,
      error: null,
      selectEvent: () => {},
    };
  }
  return ctx;
}
