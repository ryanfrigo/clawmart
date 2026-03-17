import { Bot } from "lucide-react";
import Link from "next/link";

export default function OnboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-[#09090b]">
      {/* Minimal header */}
      <header className="border-b border-white/5 bg-[#09090b]/80 backdrop-blur-sm">
        <div className="mx-auto max-w-7xl px-6 py-4">
          <Link href="/" className="flex items-center gap-2 w-fit">
            <Bot className="h-6 w-6 text-white" />
            <span className="text-lg font-bold text-white">ClawMart</span>
          </Link>
        </div>
      </header>
      {children}
    </div>
  );
}
