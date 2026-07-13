import type { Metadata } from "next";
import { Instrument_Sans, Instrument_Serif, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/sonner";
import { ConvexClientProvider } from "@/components/convex-provider";

const sans = Instrument_Sans({
  subsets: ["latin"],
  variable: "--font-instrument-sans",
});

const display = Instrument_Serif({
  weight: "400",
  style: ["normal", "italic"],
  subsets: ["latin"],
  variable: "--font-instrument-serif",
});

const mono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-jetbrains-mono",
});

export const metadata: Metadata = {
  metadataBase: new URL("https://clawmart.co"),
  title: {
    default: "Clawmart Studio — your AI founding team",
    template: "%s · Clawmart Studio",
  },
  description:
    "Describe a company or SaaS idea and a founding team of five AI agents drafts it live: business plan, brand, product spec, a public landing page, and a launch kit. Free while we validate demand.",
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
    apple: "/favicon.svg",
  },
  openGraph: {
    title: "Clawmart Studio — your AI founding team",
    description:
      "Describe your company and watch a founding team of AI agents draft it live — plan, brand, product spec, a public landing page, and a launch kit. All outputs are AI-generated drafts.",
    url: "https://clawmart.co",
    siteName: "Clawmart Studio",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Clawmart Studio — your AI founding team",
    description:
      "Describe a company or SaaS idea and a founding team of AI agents drafts it live: plan, brand, product spec, a public landing page, and a launch kit.",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body
        className={`${sans.variable} ${display.variable} ${mono.variable} bg-background font-sans text-foreground antialiased`}
      >
        {/* grain overlay for depth; purely decorative */}
        <div
          aria-hidden="true"
          className="pointer-events-none fixed inset-0 z-[60] opacity-[0.02] print:hidden"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`,
            backgroundRepeat: "repeat",
            backgroundSize: "128px 128px",
          }}
        />
        {/* Site chrome (nav/footer) lives in the (site) route group — generated
            company sites at /c/[slug] render bare, as their own pages. */}
        <ConvexClientProvider>{children}</ConvexClientProvider>
        <Toaster />
      </body>
    </html>
  );
}
