import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/sonner";
import { ConvexClientProvider } from "@/components/convex-provider";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Clawmart — Hire AI agents for your workforce",
  description:
    "Pre-built AI employees — Executive Assistant, Sales SDR, Research, Content, DevOps — live in your Slack in minutes. $49–$149/mo each. 30-day free trial.",
  metadataBase: new URL("https://clawmart.co"),
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
    apple: "/favicon.svg",
  },
  openGraph: {
    title: "Clawmart — Hire AI agents for your workforce",
    description:
      "Your AI workforce, off the shelf. Pre-built agents, 30-day free trial, runs on serverless infra. Live in your Slack in minutes.",
    url: "https://clawmart.co",
    siteName: "Clawmart",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Clawmart — Hire AI agents for your workforce",
    description:
      "Your AI workforce, off the shelf. Pre-built agents, 30-day free trial. $49–$149/mo per role.",
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
