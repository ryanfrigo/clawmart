"use client";
import { useUser } from "@clerk/nextjs";

import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";

export default function SettingsPage() {
  const { user } = useUser();

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Settings</h1>
        <p className="mt-1 text-zinc-400">Manage your account</p>
      </div>
      <Card className="max-w-2xl border-white/5 bg-zinc-900/50">
        <CardContent className="space-y-4 p-6">
          <div>
            <Label className="text-zinc-400">Name</Label>
            <p>{user?.fullName || "—"}</p>
          </div>
          <div>
            <Label className="text-zinc-400">Email</Label>
            <p>{user?.primaryEmailAddress?.emailAddress || "—"}</p>
          </div>
          <div>
            <Label className="text-zinc-400">User ID</Label>
            <p className="text-sm text-zinc-500 font-mono">{user?.id}</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
