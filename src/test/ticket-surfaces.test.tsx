import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { getDemoData } from "@/lib/event/demo-data";
import { buildPlaces } from "@/lib/attendee/map";
import {
  formatTicketTier,
  getEventGateLabel,
  getTicketProviderName,
  isZoneLockedForTier,
  primaryTicketStorageKey,
  readEventTickets,
  removeSavedTicket,
  requiredTierForPlace,
  saveManualCodeTicket,
  TICKETS_INDEX_KEY,
} from "@/lib/attendee/tickets";
import * as ridePhoto from "@/lib/attendee/ride-photo";
import { GateCardModal } from "@/components/companion/GateCardModal";
import { EventCompanion } from "@/components/companion/EventCompanion";

vi.mock("@/lib/account/use-auth", () => ({
  accountConfigured: false,
  useAccountAuth: () => ({ user: null, loading: false, configured: false }),
}));

vi.mock("@/lib/pwa", () => ({
  registerServiceWorker: async () => "unsupported",
  isServiceWorkerBlocked: () => false,
}));

beforeEach(() => {
  localStorage.clear();
  sessionStorage.clear();
  window.location.hash = "#home";
});

afterEach(cleanup);

describe("Ticketing surfaces, Gate Card & Map tier unlock", () => {
  it("resolves honest provider names and gate labels without inventing checkout or prices", () => {
    const data = getDemoData();
    expect(getTicketProviderName(data.festival.ticketUrl)).toBe("Howler");
    expect(getTicketProviderName("https://www.webtickets.co.za/v2/Event.aspx")).toBe("Webtickets");
    expect(getTicketProviderName(null)).toBe("official provider");
    expect(getEventGateLabel(data)).toBe("West entrance");
    expect(formatTicketTier("vip")).toBe("VIP");
    expect(formatTicketTier("all_access")).toBe("All-access");
  });

  it("locks VIP/Platinum zones for general tickets and unlocks them for VIP/All-access, while never locking public zones", () => {
    const data = getDemoData();
    const places = buildPlaces(data);
    const platinumZone = places.find((p) => p.name === "Platinum area")!;
    const mainStage = places.find((p) => p.id === "sos-main")!;

    expect(requiredTierForPlace(mainStage)).toBeNull();
    expect(isZoneLockedForTier(mainStage, null)).toBe(false);
    expect(isZoneLockedForTier(mainStage, "general")).toBe(false);

    expect(requiredTierForPlace(platinumZone)).toBe("platinum");
    expect(isZoneLockedForTier(platinumZone, null)).toBe(true);
    expect(isZoneLockedForTier(platinumZone, "general")).toBe(true);
    expect(isZoneLockedForTier(platinumZone, "vip")).toBe(false);
    expect(isZoneLockedForTier(platinumZone, "platinum")).toBe(false);
    expect(isZoneLockedForTier(platinumZone, "all_access")).toBe(false);
  });

  it("renders full-screen Gate Card on pure white, supports multiple tickets and keyboard navigation, reports honest brightness/wake-lock state, and closes in 1 tap", async () => {
    const data = getDemoData();
    const release = vi.fn(async () => {});
    const request = vi.fn(async () => ({ release }));
    Object.defineProperty(navigator, "wakeLock", {
      value: { request },
      configurable: true,
    });

    const t1 = saveManualCodeTicket({
      eventId: data.event.id,
      eventName: data.event.name,
      eventDateIso: data.event.startAt.toISOString(),
      ticketCode: "HWL-SOS-001",
      holderName: "Sam Nghidinwa",
      tier: "vip",
      label: "VIP Pass 1",
    });
    const t2 = saveManualCodeTicket({
      eventId: data.event.id,
      eventName: data.event.name,
      eventDateIso: data.event.startAt.toISOString(),
      ticketCode: "HWL-SOS-002",
      holderName: "Maya Nghidinwa",
      tier: "vip",
      label: "VIP Pass 2",
    });

    const onClose = vi.fn();
    await act(async () => {
      render(
        <GateCardModal
          open
          onClose={onClose}
          tickets={[t1, t2]}
          initialIndex={0}
          data={data}
          online={false}
        />,
      );
    });

    expect(request).toHaveBeenCalledWith("screen");
    expect(screen.getByText("Offline")).toBeVisible();
    // Standard browser lacks writable screen.brightness -> honest Wake Lock message instead of false max brightness claim
    expect(
      screen.getByText("Screen kept awake · Raise device brightness if needed at the gate"),
    ).toBeVisible();
    expect(screen.getByText("Sam Nghidinwa · VIP")).toBeVisible();
    expect(screen.getByText("1 of 2")).toBeVisible();
    expect(screen.getByTestId("gate-card-surface").className).toContain("bg-[#ffffff]");

    // Navigate to second ticket via button and back via ArrowLeft keyboard key
    fireEvent.click(screen.getByRole("button", { name: "Next ticket" }));
    expect(screen.getByText("Maya Nghidinwa · VIP")).toBeVisible();
    expect(screen.getByText("2 of 2")).toBeVisible();
    fireEvent.keyDown(screen.getByTestId("gate-card-modal"), { key: "ArrowLeft" });
    expect(screen.getByText("1 of 2")).toBeVisible();

    // 1-tap close
    fireEvent.click(screen.getByRole("button", { name: "Close ticket" }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("preserves the primary uploaded ticket blob in IndexedDB when removing a separate manual code ticket", async () => {
    const data = getDemoData();
    const storeSpy = vi.spyOn(ridePhoto, "photoStore").mockResolvedValue(null);

    const primaryMeta = {
      id: "primary-img-1",
      eventId: data.event.id,
      eventName: data.event.name,
      eventDateIso: data.event.startAt.toISOString(),
      label: "VIP Pass",
      tier: "vip" as const,
      holderName: "Sam",
      fileType: "image" as const,
      storageKey: primaryTicketStorageKey(data.event.id),
      ticketCode: null,
      fileSize: 2048,
      addedAt: new Date().toISOString(),
    };
    localStorage.setItem(TICKETS_INDEX_KEY, JSON.stringify([primaryMeta]));
    const manual = saveManualCodeTicket({
      eventId: data.event.id,
      eventName: data.event.name,
      eventDateIso: data.event.startAt.toISOString(),
      ticketCode: "HWL-MANUAL-99",
      holderName: "Sam",
      tier: "general",
      label: "Backup code",
    });

    await removeSavedTicket(manual.id, data.event.id);
    expect(storeSpy).not.toHaveBeenCalled();
    expect(readEventTickets(data.event.id).map((t) => t.id)).toEqual(["primary-img-1"]);
    storeSpy.mockRestore();
  });

  it("shows sticky Event Hub bottom bar switching from Buy tickets to Show my ticket, with zero 5th tab", () => {
    const data = getDemoData();
    localStorage.setItem(
      `event-buddies:${data.event.id}:attendee`,
      JSON.stringify({
        profile: { name: "Sam", handle: "sam" },
        hasName: true,
        onboardingDone: true,
        selectedEventId: data.event.id,
      }),
    );

    const view = render(<EventCompanion data={data} />);

    // Exactly 4 main nav tabs — never a 5th Tickets tab
    const navLinks = screen.getByRole("navigation", { name: "Main" }).querySelectorAll("a");
    expect(navLinks).toHaveLength(4);
    expect(screen.queryByRole("link", { name: /Tickets/i })).toBeNull();

    // No ticket state on sticky bar
    const bar = screen.getByTestId("event-ticket-bar");
    expect(bar).toHaveTextContent("No ticket yet");
    expect(bar).toHaveTextContent("Buy tickets");

    // Add a ticket -> bar switches to Show my ticket
    act(() => {
      saveManualCodeTicket({
        eventId: data.event.id,
        eventName: data.event.name,
        eventDateIso: data.event.startAt.toISOString(),
        ticketCode: "HWL-VIP-777",
        holderName: "Sam",
        tier: "vip",
        label: "VIP Pass",
      });
    });
    expect(localStorage.getItem(TICKETS_INDEX_KEY)).toContain("HWL-VIP-777");
    view.rerender(<EventCompanion data={data} />);
    expect(screen.getByTestId("event-ticket-bar")).toHaveTextContent("VIP · West entrance · Opens");
    expect(screen.getByRole("button", { name: /Show my ticket/i })).toBeVisible();
  });
});
