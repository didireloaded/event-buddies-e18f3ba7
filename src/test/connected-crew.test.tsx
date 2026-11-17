import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { ConnectedCrew } from "@/components/companion/ConnectedCrew";
import { getDemoData } from "@/lib/event/demo-data";
import { buildPlaces } from "@/lib/attendee/map";
const mock = vi.hoisted(() => ({ ctx: {} as any }));
vi.mock("@/components/companion/context", () => ({
  useCompanion: () => mock.ctx,
  initials: (name: string) => name.slice(0, 2),
}));
vi.mock("@/components/companion/Sheet", () => ({
  Sheet: ({ children, title }: any) => (
    <div role="dialog" aria-label={title}>
      {children}
    </div>
  ),
}));
beforeEach(() => {
  const data = getDemoData();
  mock.ctx = {
    data,
    places: buildPlaces(data),
    now: Date.now(),
    openPlace: vi.fn(),
    attendee: {
      auth: { user: { id: "owner" } },
      preferences: { profile: { name: "Maya" } },
      notify: vi.fn(),
    },
    crew: {
      crew: null,
      pending: null,
      loading: false,
      error: "",
      checkedAt: null,
      invite: null,
      command: vi.fn(() => true),
      refresh: vi.fn(),
    },
  };
});
afterEach(cleanup);
it("creates a private crew through the real form entry point", () => {
  render(<ConnectedCrew />);
  fireEvent.click(screen.getByRole("button", { name: "Start a crew" }));
  fireEvent.change(screen.getByRole("textbox", { name: "Crew name" }), {
    target: { value: "Coast crew" },
  });
  fireEvent.click(screen.getByRole("button", { name: "Create private crew" }));
  expect(mock.ctx.crew.command).toHaveBeenCalledWith({
    op: "create",
    name: "Coast crew",
    displayName: "Maya",
  });
});
it("opens a member landmark and submits Ghost Mode", () => {
  mock.ctx.crew.crew = {
    id: "crew",
    name: "Coast crew",
    revision: 0,
    meeting: null,
    members: [
      {
        id: "owner",
        name: "Maya",
        owner: true,
        generation: 0,
        pointId: "sos-main",
        expiresAt: new Date(Date.now() + 3600000).toISOString(),
      },
    ],
  };
  render(<ConnectedCrew />);
  fireEvent.click(screen.getByRole("button", { name: /Maya · You/ }));
  expect(mock.ctx.openPlace).toHaveBeenCalledWith("sos-main");
  fireEvent.click(screen.getByRole("button", { name: /Stop sharing/ }));
  expect(mock.ctx.crew.command).toHaveBeenCalledWith({ op: "stop", crewId: "crew" });
});
it("shows a recoverable sync failure without claiming confirmed membership", () => {
  mock.ctx.crew.error = "Offline. Your last crew snapshot is shown.";
  render(<ConnectedCrew />);
  expect(screen.getByRole("alert")).toHaveTextContent("Offline");
  fireEvent.click(screen.getByRole("button", { name: "Retry crew sync" }));
  expect(mock.ctx.crew.refresh).toHaveBeenCalled();
});
