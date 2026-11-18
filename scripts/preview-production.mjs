import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { resolve, extname } from "node:path";
import { pathToFileURL } from "node:url";
import { Readable } from "node:stream";

const port = Number(process.env.PREVIEW_PORT) || 4173;
const publicRoot = resolve(".output/public");
const { default: app } = await import(pathToFileURL(resolve(".output/server/index.mjs")).href);
const types = {
  ".js": "text/javascript",
  ".css": "text/css",
  ".jpg": "image/jpeg",
  ".png": "image/png",
  ".svg": "image/svg+xml",
  ".webmanifest": "application/manifest+json",
  ".ico": "image/x-icon",
};
const assets = {
  async fetch(request) {
    const path = resolve(publicRoot, `.${decodeURIComponent(new URL(request.url).pathname)}`);
    if (!path.startsWith(`${publicRoot}/`)) return new Response("Not found", { status: 404 });
    try {
      return new Response(await readFile(path), {
        headers: { "content-type": types[extname(path)] ?? "application/octet-stream" },
      });
    } catch {
      return new Response("Not found", { status: 404 });
    }
  },
};
createServer(async (incoming, outgoing) => {
  try {
    const hasBody = incoming.method !== "GET" && incoming.method !== "HEAD";
    const request = new Request(`http://${incoming.headers.host}${incoming.url}`, {
      method: incoming.method,
      headers: incoming.headers,
      ...(hasBody ? { body: Readable.toWeb(incoming), duplex: "half" } : {}),
    });
    const response = await app.fetch(
      request,
      { ASSETS: assets },
      {
        waitUntil(promise) {
          promise.catch(() => {});
        },
      },
    );
    outgoing.writeHead(response.status, Object.fromEntries(response.headers));
    outgoing.end(
      incoming.method === "HEAD" ? undefined : Buffer.from(await response.arrayBuffer()),
    );
  } catch {
    outgoing.writeHead(500);
    outgoing.end("Preview request failed. Rebuild and restart the preview.");
  }
}).listen(port, "127.0.0.1", () => console.log(`Production preview at http://127.0.0.1:${port}`));
