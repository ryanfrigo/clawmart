"use client";
import { useUser } from "@clerk/nextjs";

import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import Link from "next/link";
import {
  Plus,
  Users,
  Activity,
  Pause,
  Play,
  Trash2,
  MoreVertical,
  Bot,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useMutation } from "convex/react";

export default function DashboardPage() {
  const { user } = useUser();
  const workforces = useQuery(
    api.workforces.listByUser,
    user ? { clerkId: user.id } : "skip"
  );
  const deleteWorkforce = useMutation(api.workforces.remove);
  const updateStatus = useMutation(api.workforces.updateStatus);

  return (
    <div>
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Your Workforces</h1>
          <p className="mt-1 text-zinc-400">
            Manage your AI agent teams
          </p>
        </div>
        <Link href="/dashboard/new">
          <Button className="bg-white text-[#09090b] hover:bg-zinc-200">
            <Plus className="mr-2 h-4 w-4" />
            New Workforce
          </Button>
        </Link>
      </div>

      {workforces === undefined ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="border-white/5 bg-zinc-900/50 animate-pulse">
              <CardContent className="h-48" />
            </Card>
          ))}
        </div>
      ) : workforces.length === 0 ? (
        <Card className="border-white/5 bg-zinc-900/50">
          <CardContent className="flex flex-col items-center justify-center py-16">
            <Bot className="mb-4 h-12 w-12 text-zinc-600" />
            <h3 className="mb-2 text-lg font-semibold">No workforces yet</h3>
            <p className="mb-6 text-sm text-zinc-400">
              Create your first AI agent team to get started
            </p>
            <Link href="/dashboard/new">
              <Button className="bg-white text-[#09090b] hover:bg-zinc-200">
                <Plus className="mr-2 h-4 w-4" />
                Create Workforce
              </Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {workforces.map((w) => (
            <Link key={w._id} href={`/dashboard/workforce/${w._id}`}>
              <Card className="group cursor-pointer border-white/5 bg-zinc-900/50 transition hover:border-white/10 hover:bg-zinc-900">
                <CardHeader className="flex flex-row items-start justify-between">
                  <div>
                    <CardTitle className="text-lg">{w.name}</CardTitle>
                    <Badge
                      variant="outline"
                      className={`mt-2 ${
                        w.status === "active"
                          ? "border-green-500/30 text-green-400"
                          : w.status === "paused"
                          ? "border-yellow-500/30 text-yellow-400"
                          : "border-zinc-500/30 text-zinc-400"
                      }`}
                    >
                      {w.status === "active" && <Activity className="mr-1 h-3 w-3" />}
                      {w.status === "paused" && <Pause className="mr-1 h-3 w-3" />}
                      {w.status}
                    </Badge>
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild onClick={(e) => e.preventDefault()}>
                      <Button variant="ghost" size="sm" className="h-8 w-8 p-0 opacity-0 group-hover:opacity-100">
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem
                        onClick={(e) => {
                          e.preventDefault();
                          updateStatus({
                            id: w._id,
                            status: w.status === "active" ? "paused" : "active",
                          });
                        }}
                      >
                        {w.status === "active" ? (
                          <><Pause className="mr-2 h-4 w-4" /> Pause</>
                        ) : (
                          <><Play className="mr-2 h-4 w-4" /> Activate</>
                        )}
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        className="text-red-400"
                        onClick={(e) => {
                          e.preventDefault();
                          deleteWorkforce({ id: w._id });
                        }}
                      >
                        <Trash2 className="mr-2 h-4 w-4" /> Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-4 text-sm text-zinc-400">
                    <div className="flex items-center gap-1">
                      <Users className="h-4 w-4" />
                      {w.agentCount} agents
                    </div>
                    {w.config?.industry && (
                      <div className="text-xs text-zinc-500">{w.config.industry}</div>
                    )}
                  </div>
                  {w.agents && w.agents.length > 0 && (
                    <div className="mt-4 flex flex-wrap gap-1.5">
                      {w.agents.slice(0, 4).map((a) => (
                        <span
                          key={a._id}
                          className="rounded-md border border-white/5 bg-zinc-800 px-2 py-0.5 text-xs text-zinc-300"
                        >
                          {a.name}
                        </span>
                      ))}
                      {w.agents.length > 4 && (
                        <span className="px-2 py-0.5 text-xs text-zinc-500">
                          +{w.agents.length - 4} more
                        </span>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
