// @lovable.dev/vite-tanstack-config already includes the following — do NOT add them manually
// or the app will break with duplicate plugins:
//   - TanStack devtools (dev-only, first), tanstackStart, viteReact, tailwindcss, tsConfigPaths,
//     nitro (build-only using cloudflare as a default target), VITE_* env injection, @ path alias,
//     React/TanStack dedupe, error logger plugins, and sandbox detection (port/host/strictPort).
// Never set ssr.external or resolve.external: the Worker has no runtime module resolution, so
// the build fails. Never add compression (compressPublicAssets, vite-plugin-compression):
// hosting already compresses at the edge.
import { defineConfig } from "@lovable.dev/vite-tanstack-config";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  tanstackStart: {
    server: { entry: "server" },
  },
  vite: {
    plugins: [
      // Offline support: Workbox generates /sw.js from the real client build.
      // Registration happens only in src/lib/pwa.ts (never in dev or Lovable preview).
      VitePWA({
        strategies: "generateSW",
        registerType: "autoUpdate",
        injectRegister: null,
        manifest: false, // public/manifest.webmanifest is the single manifest
        filename: "sw.js",
        // Nitro serves the generated client assets from .output/public.
        outDir: ".output/public",
        devOptions: { enabled: false },
        workbox: {
          globPatterns: ["**/*.{js,css,png,jpg,svg,ico,webmanifest}"],
          maximumFileSizeToCacheInBytes: 3 * 1024 * 1024,
          navigateFallback: null,
          cleanupOutdatedCaches: true,
          clientsClaim: true,
          runtimeCaching: [
            {
              // SSR pages: network first, cached copy when offline. Never cache OAuth.
              urlPattern: ({ request, url }) =>
                request.mode === "navigate" && !url.pathname.startsWith("/~oauth"),
              handler: "NetworkFirst",
              options: {
                cacheName: "event-buddies-pages",
                networkTimeoutSeconds: 4,
                expiration: { maxEntries: 10 },
              },
            },
          ],
        },
      }),
    ],
  },
});
