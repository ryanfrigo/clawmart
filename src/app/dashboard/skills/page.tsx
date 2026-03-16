"use client";

import { useUser } from "@clerk/nextjs";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Star, Trash2, Plus, Pencil, Zap, DollarSign, Power } from "lucide-react";
import Link from "next/link";

export default function SkillsPage() {
  const { user } = useUser();
  const skills = useQuery(
    api.skills.listByAuthor,
    user ? { clerkId: user.id } : "skip"
  );
  const removeSkill = useMutation(api.skills.remove);
  const updateSkill = useMutation(api.skills.update);

  const handleToggleStatus = (
    id: string,
    currentStatus: string
  ) => {
    updateSkill({
      id: id as Parameters<typeof updateSkill>[0]["id"],
      status: currentStatus === "active" ? "disabled" : "active",
    });
  };

  return (
    <div>
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Your Skills</h1>
          <p className="mt-1 text-zinc-400">
            Manage the API skills you&apos;ve listed on ClawMart
          </p>
        </div>
        <Link href="/dashboard/skills/submit">
          <Button className="bg-white text-[#09090b] hover:bg-zinc-200">
            <Plus className="mr-2 h-4 w-4" />
            Submit Skill
          </Button>
        </Link>
      </div>

      {skills === undefined ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <Card
              key={i}
              className="border-white/5 bg-zinc-900/50 animate-pulse"
            >
              <CardContent className="h-48" />
            </Card>
          ))}
        </div>
      ) : skills.length === 0 ? (
        <Card className="border-white/5 bg-zinc-900/50">
          <CardContent className="flex flex-col items-center justify-center py-16">
            <Star className="mb-4 h-12 w-12 text-zinc-600" />
            <h3 className="mb-2 text-lg font-semibold">No skills yet</h3>
            <p className="mb-6 text-sm text-zinc-400">
              List your first API endpoint as a skill on the marketplace
            </p>
            <Link href="/dashboard/skills/submit">
              <Button className="bg-white text-[#09090b] hover:bg-zinc-200">
                <Plus className="mr-2 h-4 w-4" />
                Submit Skill
              </Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {skills.map((skill) => (
            <Card
              key={skill._id}
              className="border-white/5 bg-zinc-900/50 transition hover:border-white/10"
            >
              <CardHeader className="flex flex-row items-start justify-between">
                <div className="flex-1 min-w-0">
                  <CardTitle className="text-lg truncate">{skill.name}</CardTitle>
                  <Badge
                    variant="outline"
                    className={`mt-2 ${
                      skill.status === "active"
                        ? "border-green-500/30 text-green-400"
                        : skill.status === "pending"
                        ? "border-yellow-500/30 text-yellow-400"
                        : "border-zinc-500/30 text-zinc-400"
                    }`}
                  >
                    {skill.status}
                  </Badge>
                </div>
                <div className="flex items-center gap-1 ml-2 shrink-0">
                  {/* Toggle active/disabled */}
                  <Button
                    variant="ghost"
                    size="sm"
                    className={`h-8 w-8 p-0 ${
                      skill.status === "active"
                        ? "text-green-400 hover:text-zinc-400"
                        : "text-zinc-500 hover:text-green-400"
                    }`}
                    title={skill.status === "active" ? "Disable skill" : "Enable skill"}
                    onClick={() => handleToggleStatus(skill._id, skill.status)}
                  >
                    <Power className="h-4 w-4" />
                  </Button>
                  {/* Edit */}
                  <Link href={`/dashboard/skills/${skill._id}/edit`}>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 w-8 p-0 text-zinc-500 hover:text-white"
                      title="Edit skill"
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                  </Link>
                  {/* Delete */}
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 w-8 p-0 text-zinc-500 hover:text-red-400"
                    title="Delete skill"
                    onClick={() => removeSkill({ id: skill._id })}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-zinc-400 line-clamp-2">
                  {skill.description}
                </p>

                {/* Stats row */}
                <div className="mt-4 grid grid-cols-3 gap-2 rounded-lg border border-white/5 bg-zinc-800/40 p-3">
                  <div className="flex flex-col items-center text-center">
                    <Zap className="mb-1 h-3.5 w-3.5 text-zinc-500" />
                    <span className="text-sm font-semibold text-white">
                      {skill.totalCalls.toLocaleString()}
                    </span>
                    <span className="text-[10px] text-zinc-600">calls</span>
                  </div>
                  <div className="flex flex-col items-center text-center">
                    <DollarSign className="mb-1 h-3.5 w-3.5 text-zinc-500" />
                    <span className="text-sm font-semibold text-white">
                      ${(skill.totalCalls * skill.pricePerCall).toFixed(2)}
                    </span>
                    <span className="text-[10px] text-zinc-600">revenue</span>
                  </div>
                  <div className="flex flex-col items-center text-center">
                    <Star className="mb-1 h-3.5 w-3.5 text-zinc-500" />
                    <span className="text-sm font-semibold text-white">
                      {skill.averageRating > 0
                        ? skill.averageRating.toFixed(1)
                        : "—"}
                    </span>
                    <span className="text-[10px] text-zinc-600">rating</span>
                  </div>
                </div>

                <div className="mt-3 flex items-center justify-between text-sm">
                  <span className="text-zinc-500">
                    ${skill.pricePerCall}/call
                  </span>
                  <span className="text-xs text-zinc-600">
                    {skill.totalReviews} review{skill.totalReviews !== 1 ? "s" : ""}
                  </span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
