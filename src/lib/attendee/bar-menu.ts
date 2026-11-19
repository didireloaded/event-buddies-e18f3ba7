import { z } from "zod";

export const DRINK_CATEGORIES = [
  "Water",
  "Soft drinks",
  "Beer",
  "Cider",
  "Cocktails",
  "Non-alcoholic",
] as const;

export type DrinkCategory = (typeof DRINK_CATEGORIES)[number];

export const barDrinkItemSchema = z.object({
  id: z.string().min(1).max(80),
  name: z.string().min(1).max(120),
  category: z.enum(DRINK_CATEGORIES),
  note: z.string().max(160).optional(),
  price: z.string().max(40).nullable().optional(),
  available: z.boolean().optional(),
});

export const barMenuConfigSchema = z.object({
  isSample: z.boolean().default(false),
  paymentNote: z.string().max(240).default(""),
  items: z.array(barDrinkItemSchema).max(120),
  assignedBars: z.array(z.string().max(80)).max(50).optional(),
  updatedAt: z.string().max(40).optional(),
});

export type BarDrinkItem = {
  id: string;
  name: string;
  category: DrinkCategory;
  note?: string | undefined;
  price?: string | null | undefined;
  available?: boolean | undefined;
};

export type BarMenuConfig = {
  isSample: boolean;
  paymentNote: string;
  items: BarDrinkItem[];
  /** Optional bar IDs/names this menu is assigned to; empty = shared across all bars. */
  assignedBars?: string[] | undefined;
  updatedAt?: string | undefined;
};

export function parseBarMenus(raw: unknown): BarMenuConfig[] {
  if (!Array.isArray(raw)) return [];
  const out: BarMenuConfig[] = [];
  for (const entry of raw) {
    const parsed = barMenuConfigSchema.safeParse(entry);
    if (parsed.success) out.push(parsed.data);
  }
  return out;
}

/**
 * Sample bar catalogue for UX preview & testing.
 * Always rendered with an explicit "Sample Menu" badge and unconfirmed pricing disclosure
 * until an authorised organiser or bar operator publishes confirmed items.
 */
export const SAMPLE_BAR_MENU: BarMenuConfig = {
  isSample: true,
  paymentNote:
    "Sample menu — official prices, payment methods and stock are confirmed by the organiser.",
  items: [
    {
      id: "sample-water-still",
      name: "Still bottled water (500 ml)",
      category: "Water",
      price: null,
      available: true,
    },
    {
      id: "sample-water-sparkling",
      name: "Sparkling water (500 ml)",
      category: "Water",
      price: null,
      available: true,
    },
    {
      id: "sample-cola",
      name: "Cola (330 ml)",
      category: "Soft drinks",
      price: null,
      available: true,
    },
    {
      id: "sample-lemonade",
      name: "Lemonade (330 ml)",
      category: "Soft drinks",
      price: null,
      available: true,
    },
    { id: "sample-lager", name: "Draught lager", category: "Beer", price: null, available: true },
    {
      id: "sample-cider",
      name: "Crisp apple cider",
      category: "Cider",
      price: null,
      available: true,
    },
    {
      id: "sample-house-cocktail",
      name: "Coastal citrus house cocktail",
      category: "Cocktails",
      price: null,
      available: true,
    },
    {
      id: "sample-mocktail",
      name: "Berry & mint mocktail",
      category: "Non-alcoholic",
      price: null,
      available: true,
    },
  ],
};

const BAR_MENUS_KEY = (eventId: string) => `event-buddies:${eventId}:bar-menus:v1`;

export function readOrganiserBarMenus(eventId: string): BarMenuConfig[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = JSON.parse(localStorage.getItem(BAR_MENUS_KEY(eventId)) ?? "[]");
    return Array.isArray(raw) ? (raw as BarMenuConfig[]) : [];
  } catch {
    return [];
  }
}

export function saveOrganiserBarMenus(eventId: string, menus: BarMenuConfig[]): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(BAR_MENUS_KEY(eventId), JSON.stringify(menus));
  } catch {
    /* Ignore storage quota errors. */
  }
}

export function getMenuForBar(
  eventId: string,
  barName: string,
  publishedMenus?: BarMenuConfig[] | null,
): BarMenuConfig {
  const matchFromList = (list: BarMenuConfig[]): BarMenuConfig | null => {
    const specific = list.find(
      (m) =>
        m.assignedBars &&
        m.assignedBars.some((b) => b.trim().toLowerCase() === barName.trim().toLowerCase()),
    );
    if (specific) return specific;
    const shared = list.find((m) => !m.assignedBars || m.assignedBars.length === 0);
    return shared ?? null;
  };

  if (publishedMenus && publishedMenus.length > 0) {
    const publishedMatch = matchFromList(publishedMenus);
    if (publishedMatch) return publishedMatch;
  }

  const saved = readOrganiserBarMenus(eventId);
  const localMatch = matchFromList(saved);
  if (localMatch) return localMatch;
  return SAMPLE_BAR_MENU;
}
