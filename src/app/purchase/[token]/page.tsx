import type { Metadata } from "next";
import { PurchaseView } from "@/components/purchase/purchase-view";

export const metadata: Metadata = {
  title: "Your download",
  description: "Your Clawmart pack download and install instructions.",
  robots: {
    index: false,
    follow: false,
    noarchive: true,
    googleBot: { index: false, follow: false },
  },
};

export default async function PurchasePage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  return <PurchaseView token={token} />;
}
