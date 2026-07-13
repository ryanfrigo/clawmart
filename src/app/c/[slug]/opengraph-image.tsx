import { ImageResponse } from "next/og";
import { getConvexClient } from "@/lib/convex-server";
import { api } from "../../../../convex/_generated/api";

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const alt = "AI-drafted concept company — built with Clawmart Studio";

/* ---------------- color helpers (defensive) ----------------
 * Copied from page.tsx (its helpers are module-private). Brand JSON is model
 * output, so every color is validated before it touches the image.
 */

const HEX = /^#(?:[0-9a-f]{3}|[0-9a-f]{6})$/i;
const FALLBACK_BG = "#0a0e17";

function luminance(hex: string): number {
  let h = hex.replace("#", "");
  if (h.length === 3) h = h.split("").map((c) => c + c).join("");
  const n = parseInt(h, 16);
  const r = (n >> 16) & 255;
  const g = (n >> 8) & 255;
  const b = n & 255;
  return (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
}

function validHex(v: unknown): string | null {
  return typeof v === "string" && HEX.test(v.trim()) ? v.trim() : null;
}

function pickInk(bg: string): string {
  return luminance(bg) > 0.6 ? "#0a0e17" : "#f6f7f9";
}

/** Valid hex AND enough luminance contrast against the background to read. */
function readable(v: unknown, bg: string, fallback: string): string {
  const hex = validHex(v);
  return hex && Math.abs(luminance(hex) - luminance(bg)) >= 0.25 ? hex : fallback;
}

function parse(json: string | null): Record<string, unknown> | null {
  if (!json) return null;
  try {
    const v = JSON.parse(json);
    return v && typeof v === "object" && !Array.isArray(v)
      ? (v as Record<string, unknown>)
      : null;
  } catch {
    return null;
  }
}

const obj = (v: unknown): Record<string, unknown> =>
  v && typeof v === "object" && !Array.isArray(v) ? (v as Record<string, unknown>) : {};

// Satori has no system fonts: unknown families fall back to the bundled
// default. Declaring a serif stack is a no-op today but harmless, and keeps
// the intent (and any future font wiring) explicit without remote fetches.
const SERIF = 'Georgia, "Times New Roman", serif';

/* ---------------- image ---------------- */

export default async function OpengraphImage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const company = await getConvexClient()
    .query(api.companies.getPublicBySlug, { slug })
    .catch(() => null);

  // Unknown slug (or Convex hiccup): plain dark card, no made-up company.
  if (!company) {
    return new ImageResponse(
      (
        <div
          style={{
            width: "100%",
            height: "100%",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: FALLBACK_BG,
          }}
        >
          <div
            style={{
              display: "flex",
              fontSize: 60,
              color: "#f6f7f9",
              fontFamily: SERIF,
              letterSpacing: -1,
            }}
          >
            Clawmart Studio
          </div>
        </div>
      ),
      size
    );
  }

  const colors = obj(parse(company.brand)?.colors);
  const background = validHex(colors.background) ?? FALLBACK_BG;
  const ink = pickInk(background);
  const fg = readable(colors.foreground, background, ink);
  const accent = readable(colors.accent, background, ink);

  // Clamp model-authored text so it can't blow out the 1200x630 frame.
  const name = company.name.slice(0, 64);
  const tagline = company.tagline ? company.tagline.slice(0, 160) : null;
  const nameSize = name.length > 26 ? 64 : name.length > 14 ? 84 : 104;

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          padding: 80,
          backgroundColor: background,
        }}
      >
        <div
          style={{
            display: "flex",
            width: 72,
            height: 6,
            marginBottom: 40,
            backgroundColor: accent,
          }}
        />
        <div
          style={{
            display: "flex",
            fontSize: nameSize,
            color: ink,
            fontFamily: SERIF,
            letterSpacing: -2,
            lineHeight: 1.05,
          }}
        >
          {name}
        </div>
        {tagline && (
          <div
            style={{
              display: "flex",
              marginTop: 28,
              maxWidth: 900,
              fontSize: 32,
              color: fg,
              opacity: 0.85,
              lineHeight: 1.35,
            }}
          >
            {tagline}
          </div>
        )}
        <div
          style={{
            position: "absolute",
            bottom: 48,
            left: 80,
            display: "flex",
            fontSize: 21,
            color: accent,
            letterSpacing: 3,
            textTransform: "uppercase",
          }}
        >
          clawmart.co/c/{slug}
        </div>
      </div>
    ),
    size
  );
}
