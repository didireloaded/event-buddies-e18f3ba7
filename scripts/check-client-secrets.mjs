import { readdir, readFile } from "node:fs/promises";
import { resolve, relative } from "node:path";
import { pathToFileURL } from "node:url";

// Return only a category. Never print a matched credential.
export function secretCategory(text) {
  if (/-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/.test(text)) return "private key";
  if (/\b(?:sb_secret_|sk_live_|sk_test_|sk-proj-)[A-Za-z0-9_-]{12,}/.test(text))
    return "private API credential";
  if (
    /\b(?:VITE_[A-Z0-9_]*(?:SERVICE_ROLE|PRIVATE_KEY|SECRET_KEY|API_SECRET)[A-Z0-9_]*|VITE_LOVABLE_API_KEY)\b/.test(
      text,
    )
  )
    return "private credential exposed through VITE_";
  for (const match of text.matchAll(/\beyJ[A-Za-z0-9_-]+\.([A-Za-z0-9_-]+)\.[A-Za-z0-9_-]+/g)) {
    try {
      if (JSON.parse(Buffer.from(match[1], "base64url").toString()).role === "service_role")
        return "service-role JWT";
    } catch {
      /* Ordinary strings can resemble JWTs. */
    }
  }
  return null;
}

async function inspect(path, failures) {
  const category = secretCategory(await readFile(path, "utf8"));
  if (category) failures.push(`${relative(process.cwd(), path)} — ${category}`);
}

async function inspectDirectory(directory, failures) {
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const path = resolve(directory, entry.name);
    if (entry.isDirectory()) await inspectDirectory(path, failures);
    else if (/\.(?:js|mjs|css|html|json|map)$/.test(entry.name)) await inspect(path, failures);
  }
}

export async function checkClientSecrets() {
  const failures = [];
  const environment = Object.entries(process.env).filter(([key]) => key.startsWith("VITE_"));
  if (secretCategory(environment.map(([key, value]) => `${key}=${value}`).join("\n")))
    failures.push("Browser environment — private credential");
  for (const name of await readdir(process.cwd())) {
    if (/^\.env(?:\.|$)/.test(name) && name !== ".env.example") {
      const content = await readFile(resolve(name), "utf8");
      const publicLines = content
        .split(/\r?\n/)
        .filter((line) => /^\s*(?:export\s+)?VITE_[A-Z0-9_]+\s*=/.test(line));
      const category = secretCategory(publicLines.join("\n"));
      if (category) failures.push(`${name} — ${category}`);
    }
  }
  await inspectDirectory(resolve(".output/public"), failures);
  if (failures.length) throw new Error(`Client-secret check failed\n${failures.join("\n")}`);
  console.log(
    "PASS — browser environment and built public files checked for known private credential formats",
  );
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  checkClientSecrets().catch((error) => {
    console.error(
      error.code === "ENOENT"
        ? "Build the app before running the client-secret check."
        : error.message,
    );
    process.exitCode = 1;
  });
}
