import { describe, expect, it } from "vitest";
import { NAMIBIAN_EVENT_LISTINGS } from "@/lib/event/sound-of-summer";

describe("organizer-sourced Namibian listings", () => {
  it("uses Campout's organizer dates without claiming a closing time", () => {
    const event = NAMIBIAN_EVENT_LISTINGS.find((item) => item.id === "campout-2026");
    expect(event?.date).toBe("31 Dec 2026 – 1 Jan 2027");
    expect(event?.venue).toBe("Seukelduine, Dorob National Park");
    expect(event?.url).toBe("https://namibrage.com/festivals/campout");
  });
  it("uses the upcoming coastal Soulection edition rather than the past Windhoek edition", () => {
    const event = NAMIBIAN_EVENT_LISTINGS.find((item) => item.id === "soulection-coastal-2026");
    expect(event?.date).toBe("27 December 2026");
    expect(event?.venue).toBe("Tamariskia Sports Field");
    expect(event?.organiser).toBe("Groovetainment");
  });
});
