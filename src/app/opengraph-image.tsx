import { ImageResponse } from "next/og";

/**
 * The card every Clawmart link renders as — X, LinkedIn, Slack, Discord,
 * iMessage.
 *
 * Before this file, the root layout declared `twitter:card:
 * summary_large_image` and no image existed to fill it, so the one link the
 * launch actually depends on previewed as bare text. Company pages had a card
 * (/c/[slug]/opengraph-image.tsx); the homepage did not.
 *
 * As a root metadata file this cascades to every route that does not define
 * its own — home, /agency, /about, /privacy, /terms, /signin. The /c/[slug]
 * segment overrides it with the per-company card.
 *
 * No params and no data fetch, so Next renders it once at build time.
 */

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const alt =
  "Clawmart Studio — describe an idea and a founding team of AI agents drafts the company live";

// The dark surface the site actually ships. globals.css defines these in
// oklch, which Satori cannot parse, so they are restated here in hex.
const BG = "#0a0e17";
const INK = "#f6f7f9";
const CORAL = "#f4693b"; // --primary
const TIDE = "#5cc8d6"; // accent
const DIM = "#8b95a7";

// Satori ships no system fonts: an unknown family silently falls back to the
// bundled default, so this stack is a statement of intent, not a guarantee.
// Declared for the same reason /c/[slug] declares it — the day real fonts get
// wired in, the intent is already recorded.
const SERIF = 'Georgia, "Times New Roman", serif';

export default function OpengraphImage() {
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
          backgroundColor: BG,
        }}
      >
        <div
          style={{
            display: "flex",
            fontSize: 20,
            color: TIDE,
            letterSpacing: 4,
            textTransform: "uppercase",
          }}
        >
          Clawmart Studio
        </div>

        <div
          style={{
            display: "flex",
            width: 72,
            height: 6,
            marginTop: 28,
            marginBottom: 36,
            backgroundColor: CORAL,
          }}
        />

        <div
          style={{
            display: "flex",
            fontSize: 92,
            color: INK,
            fontFamily: SERIF,
            letterSpacing: -2,
            lineHeight: 1.05,
          }}
        >
          Your AI founding team
        </div>

        <div
          style={{
            display: "flex",
            marginTop: 30,
            maxWidth: 880,
            fontSize: 32,
            color: DIM,
            lineHeight: 1.35,
          }}
        >
          Describe a company. Five agents draft the plan, brand, spec, and a
          public landing page — live.
        </div>

        <div
          style={{
            position: "absolute",
            bottom: 48,
            left: 80,
            right: 80,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <div style={{ display: "flex", fontSize: 21, color: DIM, letterSpacing: 3 }}>
            clawmart.co
          </div>
          {/* The trust rule travels with the card, not only the page. */}
          <div style={{ display: "flex", fontSize: 19, color: DIM, letterSpacing: 2 }}>
            Every output is an AI draft
          </div>
        </div>
      </div>
    ),
    size
  );
}
