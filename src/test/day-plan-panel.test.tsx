import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { DayPlanPanel } from "@/components/companion/DayPlanPanel";
import { getDemoData } from "@/lib/event/demo-data";
import { defaultPreferences, parseStoredPreferences } from "@/lib/attendee/use-attendee";
const mocks = vi.hoisted(() => ({ suggest: vi.fn(), context: {} as any }));
vi.mock("@/lib/day-plan/day-plan.functions", () => ({ suggestDayPlan: mocks.suggest }));
vi.mock("@/components/companion/context", () => ({ useCompanion: () => mocks.context }));
const plan = {
  summary: "Your saved night",
  items: [
    {
      kind: "favourite_artist",
      title: "Shimza",
      time: "Time to be announced",
      place: null,
      detail: "Saved artist",
    },
  ],
  note: "Set times are pending.",
};
beforeEach(() => {
  const preferences = defaultPreferences(getDemoData());
  mocks.context = {
    attendee: {
      preferences,
      ready: true,
      update: vi.fn((patch) => {
        Object.assign(preferences, patch);
        return true;
      }),
    },
  };
  mocks.suggest.mockReset();
});
afterEach(cleanup);
it("offers an actionable empty state and shows local storage scope", () => {
  render(<DayPlanPanel />);
  expect(screen.getByRole("button", { name: "Suggest my day plan" })).toBeDisabled();
  expect(screen.getByText(/Save an artist using a heart/)).toBeVisible();
  expect(screen.getByText(/stay on this device/)).toBeVisible();
});
it("shows loading, retries a failure, persists and clears the reviewed plan", async () => {
  mocks.context.attendee.preferences.savedArtists = ["shimza"];
  let resolve!: (value: unknown) => void;
  mocks.suggest.mockImplementationOnce(
    () =>
      new Promise((done) => {
        resolve = done;
      }),
  );
  const view = render(<DayPlanPanel />);
  fireEvent.click(screen.getByRole("button", { name: "Suggest my day plan" }));
  expect(screen.getByRole("button", { name: "Suggesting your day…" })).toBeDisabled();
  await act(async () => resolve({ ok: false, error: "Planning service credits have run out." }));
  expect(screen.getByRole("alert")).toHaveTextContent("Planning service credits have run out.");
  mocks.suggest.mockResolvedValueOnce({ ok: true, plan });
  await act(async () => fireEvent.click(screen.getByRole("button", { name: "Retry day plan" })));
  view.rerender(<DayPlanPanel />);
  expect(screen.getByText("Your saved night")).toBeVisible();
  const restored = parseStoredPreferences(
    JSON.parse(JSON.stringify(mocks.context.attendee.preferences)),
    getDemoData(),
  );
  expect(restored.dayPlan).toEqual(plan);
  fireEvent.click(screen.getByRole("button", { name: "Clear plan" }));
  expect(mocks.context.attendee.preferences.dayPlan).toBeNull();
});
it("ignores a late answer after unmount", async () => {
  mocks.context.attendee.preferences.savedArtists = ["shimza"];
  let resolve!: (value: unknown) => void;
  mocks.suggest.mockImplementationOnce(
    () =>
      new Promise((done) => {
        resolve = done;
      }),
  );
  const view = render(<DayPlanPanel />);
  fireEvent.click(screen.getByRole("button", { name: "Suggest my day plan" }));
  view.unmount();
  await act(async () => resolve({ ok: true, plan }));
  expect(mocks.context.attendee.update).not.toHaveBeenCalled();
});
