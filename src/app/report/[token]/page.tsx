import type { Metadata } from "next";
import { ReportView } from "@/components/report/report-view";

export const metadata: Metadata = {
  title: "Your AI Visibility Fix Kit",
  description:
    "Private, tokened AI visibility report — mention scores with uncertainty bands, share of voice, fixes, and full transcripts.",
  robots: {
    index: false,
    follow: false,
    noarchive: true,
    googleBot: { index: false, follow: false },
  },
};

export default async function ReportPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  return <ReportView token={token} />;
}
