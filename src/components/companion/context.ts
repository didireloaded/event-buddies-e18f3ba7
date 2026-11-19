import { createContext, useContext } from "react";
import type { DemoData, PerformanceRecord } from "@/lib/event/types";
import type { FestivalArtist } from "@/lib/event/sound-of-summer";
import type { MapFilter, Place } from "@/lib/attendee/map";
import type { useCrew } from "@/lib/crew/use-crew";
import type { useAttendee } from "@/lib/attendee/use-attendee";
import type { useAttendeeAvatar } from "@/lib/attendee/avatar";
import type { SavedTicketMeta } from "@/lib/attendee/tickets";
import type { OfflineStatus } from "@/lib/pwa";

export type View = "home" | "lineup" | "map" | "crew" | "you" | "info" | "events";

export type Sheet =
  | { kind: "performance"; performance: PerformanceRecord }
  | { kind: "roulette"; performance: PerformanceRecord | null }
  | { kind: "member"; id: string }
  | { kind: "artist"; artist: FestivalArtist }
  | { kind: "places"; ids: string[] }
  | { kind: "meeting"; pointId?: string }
  | {
      kind:
        | "menu"
        | "updates"
        | "privacy"
        | "assistant"
        | "ticket"
        | "buy-tickets"
        | "safety"
        | "backup"
        | "offline"
        | "pings"
        | "passport"
        | "memories"
        | "play"
        | "nearby"
        | "install"
        | "event"
        | "profile"
        | "events"
        | "rules"
        | "transport";
    }
  | null;

export type CompanionContext = {
  data: DemoData;
  places: Place[];
  attendee: ReturnType<typeof useAttendee>;
  avatar?: ReturnType<typeof useAttendeeAvatar>;
  crew: ReturnType<typeof useCrew>;
  now: number | null;
  online: boolean;
  offlineStatus: OfflineStatus;
  eventTickets: SavedTicketMeta[];
  allTicketsCount: number;
  openGateCard: (initialIndex?: number) => void;
  view: View;
  navigate: (view: View) => void;
  openSheet: (sheet: Sheet) => void;
  closeSheet: () => void;
  map: {
    filter: MapFilter;
    setFilter: (filter: MapFilter) => void;
    query: string;
    setQuery: (query: string) => void;
    selected: string | null;
    setSelected: (id: string | null) => void;
    expanded: boolean;
    setExpanded: (expanded: boolean) => void;
  };
  /** Opens the Map tab with a place selected. */
  openPlace: (id: string) => void;
  /** Opens the Map tab filtered to one category. */
  showOnMap: (filter: MapFilter) => void;
  spin: () => void;
  focusLineupSearch: () => void;
};

export const Companion = createContext<CompanionContext | null>(null);

export function useCompanion() {
  const value = useContext(Companion);
  if (!value) throw new Error("useCompanion must be used inside <EventCompanion>");
  return value;
}

export const initials = (name: string) =>
  name
    .split(" ")
    .map((part) => part[0] ?? "")
    .join("")
    .slice(0, 2)
    .toUpperCase();
