"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ClerkProvider } from "@clerk/nextjs";
import { dark } from "@clerk/themes";
import { UserButton, useUser } from "@clerk/nextjs";
import {
  Bot,
  LayoutDashboard,
  Plus,
  Settings,
  CreditCard,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useEffect } from "react";
import { useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";

const navItems = [
  { href: "/dashboard", icon: LayoutDashboard, label: "Workforces" },
  { href: "/dashboard/new", icon: Plus, label: "New Workforce" },
  { href: "/dashboard/billing", icon: CreditCard, label: "Billing" },
  { href: "/dashboard/settings", icon: Settings, label: "Settings" },
];

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const { user, isLoaded } = useUser();
  const createUser = useMutation(api.users.create);

  useEffect(() => {
    if (isLoaded && user) {
      createUser({
        clerkId: user.id,
        email: user.primaryEmailAddress?.emailAddress ?? "",
        name: user.fullName ?? undefined,
        imageUrl: user.imageUrl ?? undefined,
      }).catch(() => {}); // ignore if already exists
    }
  }, [isLoaded, user, createUser]);

  return (
    <ClerkProvider appearance={{ baseTheme: dark }}>
    <div className="flex min-h-screen bg-black">
      {/* Sidebar */}
      <aside className="fixed left-0 top-0 z-40 flex h-full w-64 flex-col border-r border-white/5 bg-zinc-950">
        <div className="flex h-16 items-center gap-2 px-6">
          <Bot className="h-6 w-6 text-white" />
          <span className="text-lg font-bold">ClawMart</span>
        </div>
        <nav className="flex-1 space-y-1 px-3 py-4">
          {navItems.map((item) => {
            const isActive =
              item.href === "/dashboard"
                ? pathname === "/dashboard"
                : pathname.startsWith(item.href);
            return (
              <Link key={item.href} href={item.href}>
                <Button
                  variant="ghost"
                  className={`w-full justify-start gap-3 ${
                    isActive
                      ? "bg-white/10 text-white"
                      : "text-zinc-400 hover:text-white"
                  }`}
                >
                  <item.icon className="h-4 w-4" />
                  {item.label}
                </Button>
              </Link>
            );
          })}
        </nav>
        <div className="border-t border-white/5 p-4">
          <div className="flex items-center gap-3">
            <UserButton afterSignOutUrl="/" />
            <div className="min-w-0">
              <p className="truncate text-sm font-medium">{user?.fullName}</p>
              <p className="truncate text-xs text-zinc-500">
                {user?.primaryEmailAddress?.emailAddress}
              </p>
            </div>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <main className="ml-64 flex-1 p-8">{children}</main>
    </div>
    </ClerkProvider>
  );
}
