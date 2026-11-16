import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { registerServiceWorker } from "@/lib/pwa";

describe("offline setup", () => {
  const put = vi.fn();
  const match = vi.fn();
  const register = vi.fn();
  beforeEach(() => {
    vi.stubEnv("PROD", true);
    put.mockReset();
    match.mockReset();
    register.mockReset().mockResolvedValue({});
    vi.stubGlobal("navigator", { serviceWorker: { register, ready: Promise.resolve({}) } });
    vi.stubGlobal("caches", { open: vi.fn().mockResolvedValue({ put, match }) });
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValue(
          new Response("<html>Event</html>", { headers: { "content-type": "text/html" } }),
        ),
    );
  });
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
    vi.useRealTimers();
  });

  it("saves the public document after the worker is ready", async () => {
    expect(await registerServiceWorker()).toBe("registered");
    expect(put).toHaveBeenCalledWith(
      new URL("/", window.location.origin).href,
      expect.any(Response),
    );
  });
  it("waits for the updated worker before replacing the cached document", async () => {
    vi.useFakeTimers();
    const worker = Object.assign(new EventTarget(), { state: "installing" });
    register.mockResolvedValue({ installing: worker });
    const result = registerServiceWorker();
    await vi.advanceTimersByTimeAsync(0);
    expect(put).not.toHaveBeenCalled();
    worker.state = "activated";
    worker.dispatchEvent(new Event("statechange"));
    expect(await result).toBe("registered");
  });
  it("keeps an existing offline document when reconnect fails", async () => {
    vi.mocked(fetch).mockRejectedValue(new TypeError("Offline"));
    match.mockResolvedValue(new Response("saved event"));
    expect(await registerServiceWorker()).toBe("registered");
  });
  it("reports failed preparation when no offline document exists", async () => {
    vi.mocked(fetch).mockRejectedValue(new TypeError("Offline"));
    expect(await registerServiceWorker()).toBe("failed");
  });
  it("rejects error pages instead of caching them as the event", async () => {
    vi.mocked(fetch).mockResolvedValue(new Response("Unavailable", { status: 503 }));
    expect(await registerServiceWorker()).toBe("failed");
    expect(put).not.toHaveBeenCalled();
  });
  it("ends the readiness wait after eight seconds", async () => {
    vi.useFakeTimers();
    vi.stubGlobal("navigator", { serviceWorker: { register, ready: new Promise(() => {}) } });
    const result = registerServiceWorker();
    await vi.advanceTimersByTimeAsync(8000);
    expect(await result).toBe("failed");
  });
});
