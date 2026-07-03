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
    default: "Clawmart — Premium skill packs for OpenClaw",
    template: "%s · Clawmart",
  },
  description:
    "Curated, ready-to-run skill packs for OpenClaw, the self-hosted personal AI assistant. Buy a pack, drop it into ~/.openclaw/skills, start a new session. 14-day refund.",
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
    apple: "/favicon.svg",
  },
  openGraph: {
    title: "Clawmart — Premium skill packs for OpenClaw",
    description:
      "Make your OpenClaw assistant actually do the job. Curated packs of skills built to the AgentSkills spec, with a setup guide. Buy, download, install. 14-day refund.",
    url: "https://clawmart.co",
    siteName: "Clawmart",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Clawmart — Premium skill packs for OpenClaw",
    description:
      "Curated, ready-to-run skill packs for OpenClaw. Buy a pack, drop it into your skills folder, start a new session. 14-day refund.",
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
