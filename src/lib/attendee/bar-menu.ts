export const DRINK_CATEGORIES = [
  "Water",
  "Soft drinks",
  "Beer",
  "Cider",
  "Cocktails",
  "Non-alcoholic",
] as const;

export type DrinkCategory = (typeof DRINK_CATEGORIES)[number];

export type BarDrinkItem = {
  id: string;
  name: string;
  category: DrinkCategory;
  note?: string;
  price?: string | null;
  available?: boolean;
};

export type BarMenuConfig = {
  isSample: boolean;
  paymentNote: string;
  items: BarDrinkItem[];
  /** Optional bar IDs/names this menu is assigned to; empty = shared across all bars. */
  assignedBars?: string[];
};

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

export function getMenuForBar(eventId: string, barName: string): BarMenuConfig {
  const saved = readOrganiserBarMenus(eventId);
  const specific = saved.find(
    (m) =>
      m.assignedBars &&
      m.assignedBars.some((b) => b.trim().toLowerCase() === barName.trim().toLowerCase()),
  );
  if (specific) return specific;
  const shared = saved.find((m) => !m.assignedBars || m.assignedBars.length === 0);
  if (shared) return shared;
  return SAMPLE_BAR_MENU;
}
