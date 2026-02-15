"use client";

import { useUser } from "@clerk/nextjs";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Star, Trash2, Plus } from "lucide-react";
import Link from "next/link";

export default function SkillsPage() {
  const { user } = useUser();
  const skills = useQuery(
    api.skills.listByAuthor,
    user ? { clerkId: user.id } : "skip"
  );
  const removeSkill = useMutation(api.skills.remove);

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
                <div>
                  <CardTitle className="text-lg">{skill.name}</CardTitle>
                  <Badge
                    variant="outline"
                    className={`mt-2 ${
                      skill.status === "active"
                        ? "border-green-500/30 text-green-400"
                        : "border-zinc-500/30 text-zinc-400"
                    }`}
                  >
                    {skill.status}
                  </Badge>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 w-8 p-0 text-zinc-500 hover:text-red-400"
                  onClick={() => removeSkill({ id: skill._id })}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-zinc-400 line-clamp-2">
                  {skill.description}
                </p>
                <div className="mt-4 flex items-center justify-between text-sm">
                  <span className="text-zinc-500">
                    ${skill.pricePerCall}/call
                  </span>
                  <div className="flex items-center gap-1">
                    <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
                    <span className="text-zinc-400">
                      {skill.averageRating > 0
                        ? skill.averageRating.toFixed(1)
                        : "—"}
                    </span>
                    <span className="text-zinc-600">
                      ({skill.totalReviews})
                    </span>
                  </div>
                </div>
                <div className="mt-2 text-xs text-zinc-600">
                  {skill.totalCalls} calls
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
