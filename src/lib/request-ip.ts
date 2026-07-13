import { createHash } from "node:crypto";

/**
 * Extract the client IP from request headers. The first hop of
 * `x-forwarded-for` is the real client on Vercel; fall back to "unknown".
 */
export function ipFromHeaders(headers: Headers): string {
  const fwd = headers.get("x-forwarded-for") ?? "";
  return fwd.split(",")[0]?.trim() || "unknown";
}

/**
 * Salted, one-way IP hash. The raw IP never leaves the Next.js edge — only
 * this hash is sent to Convex for per-IP rate limiting. Deterministic for a
 * given (ip, secret) pair so the same client always maps to the same bucket.
 */
export function ipHash(ip: string, secret: string): string {
  return createHash("sha256").update(ip + secret).digest("hex");
}
