import { act, cleanup, renderHook, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { useAttendee } from "@/lib/attendee/use-attendee";
import { getDemoData } from "@/lib/event/demo-data";
import { replayActions, type AccountSnapshot } from "@/lib/account/schema";
import { queuedActions } from "@/lib/account/outbox";
const mocks = vi.hoisted(() => ({
  auth: {
    user: { id: "account-a" } as { id: string } | null,
    loading: false,
    error: "",
    configured: true,
  },
  load: vi.fn(),
  save: vi.fn(),
}));
vi.mock("@/lib/account/use-auth", () => ({ useAccountAuth: () => mocks.auth }));
vi.mock("@/lib/account/client", () => ({ loadSelection: mocks.load, saveAction: mocks.save }));
const data = getDemoData();
beforeEach(() => {
  localStorage.clear();
  mocks.auth.user = { id: "account-a" };
  Object.defineProperty(navigator, "onLine", { configurable: true, value: true });
  mocks.load.mockReset();
  mocks.save.mockReset();
});
afterEach(cleanup);
it("restores account saves in a second session and excludes them on sign-out", async () => {
  let remote: AccountSnapshot = {
    savedArtists: ["shimza"],
    meeting: null,
    revision: 1,
    updatedAt: "2026-11-17T08:00:00Z",
  };
  mocks.load.mockImplementation(async () => remote);
  mocks.save.mockImplementation(async (_data, _user, action) => {
    remote = { ...remote, ...replayActions(remote, [action]), revision: remote.revision + 1 };
    return remote;
  });
  const first = renderHook(() => useAttendee(data));
  await waitFor(() => expect(first.result.current.preferences.savedArtists).toEqual(["shimza"]));
  act(() => first.result.current.toggleArtist("buddykev"));
  await waitFor(() => expect(first.result.current.sync.status).toBe("synced"));
  expect(remote.savedArtists).toEqual(["shimza", "buddykev"]);
  first.unmount();
  const second = renderHook(() => useAttendee(data));
  await waitFor(() =>
    expect(second.result.current.preferences.savedArtists).toEqual(["shimza", "buddykev"]),
  );
  mocks.auth.user = null;
  second.rerender();
  await waitFor(() => expect(second.result.current.ready).toBe(true));
  expect(second.result.current.preferences.savedArtists).toEqual([]);
  expect(
    localStorage.getItem("event-buddies:" + data.event.id + ":attendee:account:account-a"),
  ).toBeNull();
});
it("retains an offline action and retries it on reconnect", async () => {
  Object.defineProperty(navigator, "onLine", { configurable: true, value: false });
  mocks.load.mockResolvedValue({ savedArtists: [], meeting: null, revision: 0, updatedAt: null });
  mocks.save.mockResolvedValue({
    savedArtists: ["shimza"],
    meeting: null,
    revision: 1,
    updatedAt: "2026-11-17T08:00:00Z",
  });
  const hook = renderHook(() => useAttendee(data));
  await waitFor(() => expect(hook.result.current.ready).toBe(true));
  act(() => hook.result.current.toggleArtist("shimza"));
  expect(queuedActions(hook.result.current.scope)).toHaveLength(1);
  expect(mocks.save).not.toHaveBeenCalled();
  Object.defineProperty(navigator, "onLine", { configurable: true, value: true });
  act(() => window.dispatchEvent(new Event("online")));
  await waitFor(() => expect(hook.result.current.sync.status).toBe("synced"));
  expect(queuedActions(hook.result.current.scope)).toHaveLength(0);
  expect(hook.result.current.preferences.savedArtists).toEqual(["shimza"]);
});
