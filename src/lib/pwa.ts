// The only service-worker registrar in the app. The worker itself is generated
// at build time by vite-plugin-pwa (Workbox generateSW) as /sw.js.
const PREVIEW_LABEL = /^(?:id-preview|preview)(?:-[a-z0-9]+)?--.+$/;
const LOVABLE_PREVIEW_ROOTS = [".lovable.app", ".gpt-eng.com", ".gptengineer.run"];
export type OfflineStatus = "checking" | "registered" | "blocked" | "unsupported" | "failed";

export function isServiceWorkerBlocked(
  location: { hostname: string; search: string },
  inIframe: boolean,
) {
  const host = location.hostname.toLowerCase();
  const label = host.split(".")[0] ?? "";
  if (inIframe) return true;
  if (new URLSearchParams(location.search).get("sw") === "off") return true;
  if (LOVABLE_PREVIEW_ROOTS.some((root) => host.endsWith(root))) {
    if (PREVIEW_LABEL.test(label)) return true;
    if (/^project--[a-z0-9-]+-dev$/.test(label)) return true;
  }
  if (host === "lovableproject.com" || host.endsWith(".lovableproject.com")) return true;
  if (host === "lovableproject-dev.com" || host.endsWith(".lovableproject-dev.com")) return true;
  if (host === "beta.lovable.dev" || host.endsWith(".beta.lovable.dev")) return true;
  return false;
}

async function unregisterAppWorkers() {
  const registrations = await navigator.serviceWorker.getRegistrations();
  await Promise.all(
    registrations
      .filter((r) => (r.active ?? r.installing ?? r.waiting)?.scriptURL.endsWith("/sw.js"))
      .map((r) => r.unregister()),
  );
}

/** Call from useEffect only. Returns a status for honest UI messaging. */
export async function registerServiceWorker(): Promise<OfflineStatus> {
  if (typeof window === "undefined" || !("serviceWorker" in navigator)) return "unsupported";
  let inIframe = true;
  try {
    inIframe = window.self !== window.top;
  } catch {
    inIframe = true;
  }
  if (!import.meta.env.PROD || isServiceWorkerBlocked(window.location, inIframe)) {
    await unregisterAppWorkers().catch(() => undefined);
    return "blocked";
  }
  try {
    const registration = await navigator.serviceWorker.register("/sw.js", { scope: "/" });
    const installing = registration.installing ?? registration.waiting;
    // First visits start before the worker controls navigation. Save the public
    // event document explicitly so a first offline reopen has a document too.
    let timeout: ReturnType<typeof setTimeout> | undefined;
    let removeListener = () => {};
    const activated = installing
      ? new Promise<void>((resolve, reject) => {
          const check = () => {
            if (installing.state === "activated") resolve();
            if (installing.state === "redundant")
              reject(new Error("Offline worker installation failed"));
          };
          installing.addEventListener("statechange", check);
          removeListener = () => installing.removeEventListener("statechange", check);
          check();
        })
      : navigator.serviceWorker.ready;
    try {
      await Promise.race([
        activated,
        new Promise<never>((_, reject) => {
          timeout = setTimeout(() => reject(new Error("Offline setup timed out")), 8000);
        }),
      ]);
    } finally {
      clearTimeout(timeout);
      removeListener();
    }
    const cache = await caches.open("event-buddies-pages");
    const url = new URL("/", window.location.origin).href;
    try {
      const response = await fetch(url, { cache: "reload", signal: AbortSignal.timeout(8000) });
      if (!response.ok || !response.headers.get("content-type")?.includes("text/html"))
        throw new Error("Event document unavailable");
      await cache.put(url, response);
    } catch (error) {
      if (!(await cache.match(url))) throw error;
    }
    return "registered";
  } catch {
    return "failed";
  }
}
