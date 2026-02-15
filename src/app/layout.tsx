import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { ConvexClientProvider } from "@/components/convex-provider";
import { Toaster } from "@/components/ui/sonner";

export const dynamic = "force-dynamic";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "ClawMart — Agent Skill Marketplace",
  description:
    "Discover, call, and pay for AI agent skills with USDC micropayments. No accounts. No KYC. Just HTTP. Powered by x402.",
  metadataBase: new URL("https://clawmart.co"),
  openGraph: {
    title: "ClawMart — Agent Skill Marketplace",
    description: "Discover, call, and pay for AI agent skills with USDC micropayments. Powered by x402.",
    url: "https://clawmart.co",
    siteName: "ClawMart",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "ClawMart — Agent Skill Marketplace",
    description: "Discover, call, and pay for AI agent skills with USDC micropayments. Powered by x402.",
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
        <ConvexClientProvider>{children}</ConvexClientProvider>
        <Toaster />
      </body>
    </html>
  );
}
