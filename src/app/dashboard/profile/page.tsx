"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function ProfilePage() {
  const router = useRouter();

  useEffect(() => {
    // Redirect to main dashboard since profile management is no longer used
    router.replace("/dashboard");
  }, [router]);

  return (
    <div className="min-h-screen bg-[#09090b] text-white flex items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <div className="h-10 w-10 rounded-full border-2 border-indigo-500/30 border-t-indigo-500 animate-spin" />
        <p className="text-[13px] text-zinc-500">Redirecting...</p>
      </div>
    </div>
  );
}