import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/sonner";
import { ConvexClientProvider } from "@/components/convex-provider";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "ClawMart — Pay-per-call APIs for AI agents",
  description:
    "The HTTP API your AI agent calls when it needs something done. Per-call USDC pricing on Base, settled via x402. No accounts, no keys, no monthly bills.",
  metadataBase: new URL("https://clawmart.co"),
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
    apple: "/favicon.svg",
  },
  openGraph: {
    title: "ClawMart — Pay-per-call APIs for AI agents",
    description: "One HTTP endpoint your agent can call. Per-call USDC pricing, no keys. Powered by x402 on Base.",
    url: "https://clawmart.co",
    siteName: "ClawMart",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "ClawMart — Pay-per-call APIs for AI agents",
    description: "One HTTP endpoint your agent can call. Per-call USDC pricing, no keys. Powered by x402 on Base.",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className={`${inter.className} bg-background text-foreground antialiased`}>
        <ConvexClientProvider>
          {children}
        </ConvexClientProvider>
        <Toaster />
      </body>
    </html>
  );
}
