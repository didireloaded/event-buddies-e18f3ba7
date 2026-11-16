import {
  ArrowRightToLine,
  Beer,
  Cross,
  Droplets,
  LayoutGrid,
  MapPin,
  Music2,
  Shield,
  Square,
  Tent,
  Toilet,
  Utensils,
  Megaphone,
  type LucideIcon,
} from "lucide-react";
import type { MapFilter } from "@/lib/attendee/map";

export const PLACE_ICONS: Record<string, LucideIcon> = {
  stage: Music2,
  food: Utensils,
  bar: Beer,
  toilet: Toilet,
  water: Droplets,
  "first-aid": Cross,
  security: Shield,
  entrance: ArrowRightToLine,
  sponsor: Megaphone,
  zone: Square,
  tent: Tent,
};

export const placeIcon = (type: string) => PLACE_ICONS[type] ?? MapPin;

export function placeTone(type: string) {
  if (type === "stage") return "bg-pin-stage";
  if (["first-aid", "security", "exit"].includes(type)) return "bg-pin-safety";
  if (type === "entrance") return "bg-pin-entrance";
  if (["bar", "food", "toilet", "water"].includes(type)) return "bg-pin-amenity";
  return "bg-pin-other";
}

export const TYPE_LABELS: Record<string, string> = {
  stage: "Stage",
  food: "Food",
  bar: "Bar",
  toilet: "Toilets",
  water: "Water",
  "first-aid": "Medics",
  security: "Security",
  entrance: "Entrance",
  sponsor: "Sponsor activation",
  zone: "Access zone",
  tent: "Tent",
};

export const MAP_FILTERS: { id: MapFilter; label: string; icon: LucideIcon }[] = [
  { id: "all", label: "Key places", icon: LayoutGrid },
  { id: "stage", label: "Stages", icon: Music2 },
  { id: "bar", label: "Bars", icon: Beer },
  { id: "toilet", label: "Toilets", icon: Toilet },
  { id: "food", label: "Food", icon: Utensils },
  { id: "safety", label: "Medics", icon: Cross },
  { id: "entrance", label: "Entrances", icon: ArrowRightToLine },
  { id: "sponsor", label: "Sponsors", icon: Megaphone },
  { id: "zone", label: "Zones", icon: Square },
];
