import type { Metadata } from "next";
import { Instrument_Sans, Instrument_Serif, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/sonner";
import { ConvexClientProvider } from "@/components/convex-provider";
import { SiteNav } from "@/components/site/nav";
import { SiteFooter } from "@/components/site/footer";

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
    default: "Clawmart — Is your brand invisible to AI?",
    template: "%s · Clawmart",
  },
  description:
    "Free check of how the AI models that power ChatGPT, Claude, and Perplexity answer buyer questions in your category — plus a $49 Fix Kit with ready-to-paste schema, answer copy, and AI-crawler config.",
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
    apple: "/favicon.svg",
  },
  openGraph: {
    title: "Clawmart — Is your brand invisible to AI?",
    description:
      "We query the AI models that power ChatGPT, Claude, and Perplexity via their APIs and measure whether they mention your brand. Free check, no signup. $49 Fix Kit ships the actual fixes.",
    url: "https://clawmart.co",
    siteName: "Clawmart",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Clawmart — Is your brand invisible to AI?",
    description:
      "Free AI visibility check for your domain. The $49 Fix Kit ships ready-to-paste JSON-LD, answer copy, and crawler config — with full transcripts as evidence.",
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
        <ConvexClientProvider>
          <div className="flex min-h-screen flex-col">
            <SiteNav />
            <main className="flex-1">{children}</main>
            <SiteFooter />
          </div>
        </ConvexClientProvider>
        <Toaster />
      </body>
    </html>
  );
}
