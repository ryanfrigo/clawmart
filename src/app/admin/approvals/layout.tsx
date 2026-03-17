import { Bot, ShieldCheck } from "lucide-react";
import Link from "next/link";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-[#09090b]">
      <header className="border-b border-white/5 bg-[#09090b]/80 backdrop-blur-sm">
        <div className="mx-auto max-w-7xl px-6 py-4">
          <div className="flex items-center justify-between">
            <Link href="/" className="flex items-center gap-2">
              <Bot className="h-6 w-6 text-white" />
              <span className="text-lg font-bold text-white">ClawMart</span>
            </Link>
            <div className="flex items-center gap-2 text-xs font-medium text-amber-400">
              <ShieldCheck className="h-4 w-4" />
              Admin Panel
            </div>
          </div>
        </div>
      </header>
      {children}
    </div>
  );
}
