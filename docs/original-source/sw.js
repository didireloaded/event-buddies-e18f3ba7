const CACHE = "event-buddies-demo-v3";
const STATIC = [
  "/images/festival-crowd.jpg",
  "/images/sound-of-summer-site-plan-2026.png",
  "/images/sound-of-summer-past-edition.jpg",
  "/images/coastal-festival-map.svg",
  "/fonts/barlow-condensed-800.ttf",
  "/fonts/dm-sans-400.ttf",
  "/fonts/dm-sans-700.ttf",
  "/icons/icon-192.png",
  "/icons/icon-512.png",
];
self.addEventListener("install", (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(CACHE);
      await cache.addAll(STATIC);
      const response = await fetch("/", { cache: "no-store" });
      if (response.ok && response.headers.get("X-Event-Buddies-Demo") === "1") {
        const html = await response.clone().text();
        const assets = [
          ...html.matchAll(/(?:src|href)="([^\"]*\/_next\/static\/[^\"]+)"/g),
        ]
          .map(
            (match) =>
              new URL(match[1].replaceAll("&amp;", "&"), self.location.origin),
          )
          .filter((url) => url.origin === self.location.origin)
          .map((url) => url.href);
        await cache.addAll([...new Set(assets)]);
        await cache.put("/", response);
      }
      await self.skipWaiting();
    })(),
  );
});
self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(
        keys
          .filter(
            (key) => key.startsWith("event-buddies-demo-") && key !== CACHE,
          )
          .map((key) => caches.delete(key)),
      );
      await self.clients.claim();
    })(),
  );
});
self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);
  if (event.request.method !== "GET" || url.origin !== self.location.origin)
    return;
  if (event.request.mode === "navigate" && url.pathname === "/") {
    event.respondWith(
      (async () => {
        const cache = await caches.open(CACHE);
        try {
          const response = await fetch(event.request);
          if (
            response.ok &&
            response.headers.get("X-Event-Buddies-Demo") === "1"
          )
            await cache.put("/", response.clone());
          else await cache.delete("/");
          return response;
        } catch {
          return (
            (await cache.match("/")) ||
            new Response("Reconnect to load this event for the first time.", {
              status: 503,
              headers: { "Content-Type": "text/plain" },
            })
          );
        }
      })(),
    );
  } else if (
    url.pathname.startsWith("/_next/static/") ||
    STATIC.includes(url.pathname) ||
    url.pathname === "/manifest.webmanifest"
  ) {
    event.respondWith(
      (async () => {
        const cache = await caches.open(CACHE);
        const cached = await cache.match(event.request);
        if (cached) return cached;
        const response = await fetch(event.request);
        if (response.ok) await cache.put(event.request, response.clone());
        return response;
      })(),
    );
  }
});
