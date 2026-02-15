import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { ConvexClientProvider } from "@/components/convex-provider";
import { ClerkProvider } from "@clerk/nextjs";
import { dark } from "@clerk/themes";
import { Toaster } from "@/components/ui/sonner";

export const dynamic = "force-dynamic";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "ClawMart — AI Agent Teams for Your Business",
  description:
    "Spin up specialized AI agent teams with managed infrastructure. Like hiring a team of AI employees.",
  metadataBase: new URL("https://clawmart.co"),
  openGraph: {
    title: "ClawMart — AI Agent Teams for Your Business",
    description: "Spin up specialized AI agent teams with managed infrastructure.",
    url: "https://clawmart.co",
    siteName: "ClawMart",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "ClawMart — AI Agent Teams for Your Business",
    description: "Spin up specialized AI agent teams with managed infrastructure.",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ClerkProvider appearance={{ baseTheme: dark }}>
      <html lang="en" className="dark">
        <body className={`${inter.className} bg-background text-foreground antialiased`}>
          <ConvexClientProvider>{children}</ConvexClientProvider>
          <Toaster />
        </body>
      </html>
    </ClerkProvider>
  );
}
