"use client";

import { useUser } from "@clerk/nextjs";
import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import Link from "next/link";
import {
  Plus,
  Star,
  Zap,
  DollarSign,
  BarChart3,
  ArrowRight,
  CheckCircle2,
  Store,
  Sparkles,
  Activity,
  User2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function DashboardPage() {
  const { user } = useUser();
  const skills = useQuery(
    api.skills.listByAuthor,
    user ? { clerkId: user.id } : "skip"
  );
  const agentProfile = useQuery(
    api.agentProfiles.getByUserId,
    user ? { clerkId: user.id } : "skip"
  );

  const totalSkills = skills?.length ?? 0;
  const totalCalls = skills?.reduce((sum, s) => sum + (s.totalCalls ?? 0), 0) ?? 0;
  const totalRevenue = skills?.reduce(
    (sum, s) => sum + (s.totalCalls ?? 0) * s.pricePerCall,
    0
  ) ?? 0;
  const avgRating =
    skills && skills.length > 0
      ? skills.filter((s) => s.averageRating > 0).reduce((sum, s) => sum + s.averageRating, 0) /
        (skills.filter((s) => s.averageRating > 0).length || 1)
      : 0;

  const isNewUser = totalSkills === 0;

  return (
    <div className="min-h-screen bg-[#09090b]">
      {/* Header */}
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white">
            Welcome back{user?.firstName ? `, ${user.firstName}` : ""}
          </h1>
          <p className="mt-1 text-zinc-400">
            Here&apos;s how your skills are performing
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Link href="/skills">
            <Button
              variant="outline"
              className="border-white/10 bg-transparent text-zinc-300 hover:bg-white/5 hover:text-white"
            >
              <Store className="mr-2 h-4 w-4" />
              Browse Skills
            </Button>
          </Link>
          <Link href="/dashboard/skills/submit">
            <Button className="bg-white text-[#09090b] hover:bg-zinc-200">
              <Plus className="mr-2 h-4 w-4" />
              Submit New Skill
            </Button>
          </Link>
        </div>
      </div>

      {/* Onboarding CTA Banner */}
      {agentProfile === null && (
        <div className="mb-6 flex items-center justify-between rounded-xl border border-white/10 bg-gradient-to-r from-zinc-900 to-zinc-800/80 px-5 py-4">
          <div className="flex items-center gap-4">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white/10">
              <User2 className="h-5 w-5 text-white" />
            </div>
            <div>
              <p className="font-semibold text-white">Complete your agent profile to start listing skills</p>
              <p className="text-sm text-zinc-400">Takes ~2 minutes. Get approved and start earning on ClawMart.</p>
            </div>
          </div>
          <Link href="/onboard" className="shrink-0">
            <Button className="bg-white text-[#09090b] hover:bg-zinc-200">
              Get Started
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </Link>
        </div>
      )}

      {/* Stats Grid */}
      <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="border-white/5 bg-zinc-900/50">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-zinc-400">
              Total Skills Listed
            </CardTitle>
            <Sparkles className="h-4 w-4 text-zinc-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">
              {skills === undefined ? (
                <span className="animate-pulse text-zinc-600">—</span>
              ) : (
                totalSkills
              )}
            </div>
            <p className="mt-1 text-xs text-zinc-500">
              {totalSkills === 1 ? "1 skill active" : `${totalSkills} skills`}
            </p>
          </CardContent>
        </Card>

        <Card className="border-white/5 bg-zinc-900/50">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-zinc-400">
              Total API Calls
            </CardTitle>
            <Zap className="h-4 w-4 text-zinc-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">
              {skills === undefined ? (
                <span className="animate-pulse text-zinc-600">—</span>
              ) : (
                totalCalls.toLocaleString()
              )}
            </div>
            <p className="mt-1 text-xs text-zinc-500">across all skills</p>
          </CardContent>
        </Card>

        <Card className="border-white/5 bg-zinc-900/50">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-zinc-400">
              Total Revenue
            </CardTitle>
            <DollarSign className="h-4 w-4 text-zinc-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">
              {skills === undefined ? (
                <span className="animate-pulse text-zinc-600">—</span>
              ) : (
                `$${totalRevenue.toFixed(2)}`
              )}
            </div>
            <p className="mt-1 text-xs text-zinc-500">lifetime earnings</p>
          </CardContent>
        </Card>

        <Card className="border-white/5 bg-zinc-900/50">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-zinc-400">
              Average Rating
            </CardTitle>
            <Star className="h-4 w-4 text-zinc-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">
              {skills === undefined ? (
                <span className="animate-pulse text-zinc-600">—</span>
              ) : avgRating > 0 ? (
                <span className="flex items-center gap-1">
                  <Star className="h-5 w-5 fill-amber-400 text-amber-400" />
                  {avgRating.toFixed(1)}
                </span>
              ) : (
                "—"
              )}
            </div>
            <p className="mt-1 text-xs text-zinc-500">
              {skills && skills.filter((s) => s.totalReviews > 0).length > 0
                ? `from ${skills.reduce((sum, s) => sum + s.totalReviews, 0)} reviews`
                : "no reviews yet"}
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Recent Activity */}
        <Card className="border-white/5 bg-zinc-900/50">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2 text-white">
                <Activity className="h-5 w-5 text-zinc-500" />
                Recent Activity
              </CardTitle>
              <Link href="/dashboard/skills">
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-xs text-zinc-500 hover:text-white"
                >
                  View all
                  <ArrowRight className="ml-1 h-3 w-3" />
                </Button>
              </Link>
            </div>
          </CardHeader>
          <CardContent>
            {totalCalls === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 text-center">
                <BarChart3 className="mb-3 h-10 w-10 text-zinc-700" />
                <p className="text-sm font-medium text-zinc-400">
                  No activity yet
                </p>
                <p className="mt-1 text-xs text-zinc-600">
                  API calls will appear here once agents start using your skills
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {skills
                  ?.filter((s) => s.totalCalls > 0)
                  .slice(0, 5)
                  .map((skill) => (
                    <div
                      key={skill._id}
                      className="flex items-center justify-between rounded-lg border border-white/5 bg-zinc-800/50 px-4 py-3"
                    >
                      <div className="flex items-center gap-3">
                        <Zap className="h-4 w-4 text-amber-400" />
                        <div>
                          <p className="text-sm font-medium text-white">
                            {skill.name}
                          </p>
                          <p className="text-xs text-zinc-500">
                            {skill.totalCalls} calls · $
                            {(skill.totalCalls * skill.pricePerCall).toFixed(2)}{" "}
                            earned
                          </p>
                        </div>
                      </div>
                      <span
                        className={`text-xs font-medium ${
                          skill.status === "active"
                            ? "text-green-400"
                            : "text-zinc-500"
                        }`}
                      >
                        {skill.status}
                      </span>
                    </div>
                  ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Getting Started / Quick Actions */}
        {isNewUser ? (
          <Card className="border-white/5 bg-zinc-900/50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-white">
                <CheckCircle2 className="h-5 w-5 text-zinc-500" />
                Getting Started
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {[
                  {
                    step: 1,
                    title: "Create a skill endpoint",
                    description:
                      "Build an API endpoint that accepts JSON and returns structured data. Any language, any host.",
                    done: false,
                  },
                  {
                    step: 2,
                    title: "Submit to the marketplace",
                    description:
                      "Add your endpoint URL, set a price per call, and write a description for agents to discover.",
                    done: false,
                  },
                  {
                    step: 3,
                    title: "Get paid automatically",
                    description:
                      "Every time an AI agent calls your skill, payment is settled instantly via x402 protocol.",
                    done: false,
                  },
                ].map(({ step, title, description }) => (
                  <div key={step} className="flex gap-4">
                    <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-white/10 bg-zinc-800 text-sm font-medium text-zinc-400">
                      {step}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-white">{title}</p>
                      <p className="mt-0.5 text-xs text-zinc-500">
                        {description}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
              <div className="mt-6">
                <Link href="/dashboard/skills/submit">
                  <Button className="w-full bg-white text-[#09090b] hover:bg-zinc-200">
                    <Plus className="mr-2 h-4 w-4" />
                    Submit Your First Skill
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        ) : (
          <Card className="border-white/5 bg-zinc-900/50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-white">
                <Sparkles className="h-5 w-5 text-zinc-500" />
                Your Top Skills
              </CardTitle>
            </CardHeader>
            <CardContent>
              {skills && skills.length > 0 ? (
                <div className="space-y-3">
                  {skills
                    .sort((a, b) => (b.totalCalls ?? 0) - (a.totalCalls ?? 0))
                    .slice(0, 4)
                    .map((skill) => (
                      <div
                        key={skill._id}
                        className="flex items-center justify-between rounded-lg border border-white/5 bg-zinc-800/50 px-4 py-3"
                      >
                        <div>
                          <p className="text-sm font-medium text-white">
                            {skill.name}
                          </p>
                          <p className="text-xs text-zinc-500">
                            ${skill.pricePerCall}/call
                            {skill.averageRating > 0 && (
                              <span className="ml-2 text-amber-400">
                                ★ {skill.averageRating.toFixed(1)}
                              </span>
                            )}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-medium text-white">
                            {skill.totalCalls}
                          </p>
                          <p className="text-xs text-zinc-500">calls</p>
                        </div>
                      </div>
                    ))}
                </div>
              ) : (
                <p className="py-4 text-center text-sm text-zinc-500">
                  No skills listed yet
                </p>
              )}
              <div className="mt-4">
                <Link href="/dashboard/skills">
                  <Button
                    variant="outline"
                    className="w-full border-white/10 bg-transparent text-zinc-300 hover:bg-white/5 hover:text-white"
                  >
                    Manage All Skills
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
