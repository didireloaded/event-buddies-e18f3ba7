function hasUnsafeControlOrSlash(value: string): boolean {
  for (let i = 0; i < value.length; i++) {
    const code = value.charCodeAt(i);
    if (code <= 0x1f || code === 0x7f || code === 0x5c) return true;
  }
  return false;
}

export function redirectHost(uri: string | undefined): string | null {
  if (!uri) return null;
  try {
    return new URL(uri).host || null;
  } catch {
    return null;
  }
}

const DISALLOWED_REDIRECT_SCHEMES = new Set([
  "javascript:",
  "data:",
  "vbscript:",
  "blob:",
  "file:",
]);

/**
 * Guard external OAuth callback redirects against script-executing or local-file schemes
 * while still allowing HTTPS, loopback HTTP (RFC 8252), and native custom app schemes.
 */
export function isSafeOAuthRedirect(target: string | undefined): boolean {
  if (!target || hasUnsafeControlOrSlash(target.trim())) return false;
  try {
    const parsed = new URL(target.trim());
    const proto = parsed.protocol.toLowerCase();
    if (DISALLOWED_REDIRECT_SCHEMES.has(proto)) return false;
    if (proto === "https:") return Boolean(parsed.host);
    if (proto === "http:") {
      return (
        parsed.hostname === "localhost" ||
        parsed.hostname === "127.0.0.1" ||
        parsed.hostname === "[::1]"
      );
    }
    return /^[a-z][a-z0-9+.-]*:$/.test(proto);
  } catch {
    return false;
  }
}

export function oauthReturnPath(value: unknown): string {
  if (
    typeof value !== "string" ||
    !value.startsWith("/") ||
    value.startsWith("//") ||
    hasUnsafeControlOrSlash(value)
  )
    return "/";
  const origin = "https://app.invalid";
  try {
    const target = new URL(value, origin);
    if (target.origin !== origin || target.pathname.startsWith("//")) return "/";
    return target.pathname + target.search + target.hash;
  } catch {
    return "/";
  }
}
