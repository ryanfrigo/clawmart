"use client";

import { useUser } from "@clerk/nextjs";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { ClerkProvider } from "@clerk/nextjs";
import { dark } from "@clerk/themes";
import { ConvexClientProvider } from "@/components/convex-provider";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  CheckCircle2,
  XCircle,
  Sparkles,
  ShieldAlert,
} from "lucide-react";
import { toast } from "sonner";
import { Id } from "../../../../convex/_generated/dataModel";

// Simple admin check — replace prefix with your Clerk user ID prefix
const ADMIN_CLERK_PREFIX = "user_2";

function AdminContent() {
  const { user, isLoaded } = useUser();
  const allSkills = useQuery(api.skills.listAll);
  const updateSkill = useMutation(api.skills.update);

  if (!isLoaded) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-white/20 border-t-white" />
      </div>
    );
  }

  if (!user || !user.id.startsWith(ADMIN_CLERK_PREFIX)) {
    return (
      <div className="flex min-h-[80vh] flex-col items-center justify-center gap-4 text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-red-500/10">
          <ShieldAlert className="h-8 w-8 text-red-400" />
        </div>
        <h1 className="text-2xl font-bold text-white">Access Denied</h1>
        <p className="text-sm text-zinc-400">You don&apos;t have permission to view this page.</p>
      </div>
    );
  }

  const pendingSkillsList = allSkills?.filter((s) => s.status === "pending") ?? [];
  const allSkillsList = allSkills ?? [];

  const handleApproveSkill = async (id: Id<"skills">) => {
    try {
      await updateSkill({ id, status: "active" });
      toast.success("Skill approved and set to active");
    } catch {
      toast.error("Failed to approve skill");
    }
  };

  const handleRejectSkill = async (id: Id<"skills">) => {
    try {
      await updateSkill({ id, status: "disabled" });
      toast.success("Skill rejected");
    } catch {
      toast.error("Failed to reject skill");
    }
  };

  const handleDisableSkill = async (id: Id<"skills">) => {
    try {
      await updateSkill({ id, status: "disabled" });
      toast.success("Skill disabled");
    } catch {
      toast.error("Failed to disable skill");
    }
  };

  const handleEnableSkill = async (id: Id<"skills">) => {
    try {
      await updateSkill({ id, status: "active" });
      toast.success("Skill enabled");
    } catch {
      toast.error("Failed to enable skill");
    }
  };

  return (
    <div className="mx-auto max-w-5xl px-4 py-12">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white">Skills Management</h1>
        <p className="mt-1 text-sm text-zinc-400">
          Review and manage skills on ClawMart.
        </p>
      </div>

      {/* Summary Stats */}
      <div className="mb-8 grid grid-cols-4 gap-4">
        <Card className="border-white/5 bg-zinc-900/50">
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-white">{allSkillsList.length}</div>
            <div className="text-xs text-zinc-500">Total Skills</div>
          </CardContent>
        </Card>
        <Card className="border-white/5 bg-zinc-900/50">
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-emerald-400">{allSkillsList.filter(s => s.status === "active").length}</div>
            <div className="text-xs text-zinc-500">Active</div>
          </CardContent>
        </Card>
        <Card className="border-white/5 bg-zinc-900/50">
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-amber-400">{pendingSkillsList.length}</div>
            <div className="text-xs text-zinc-500">Pending</div>
          </CardContent>
        </Card>
        <Card className="border-white/5 bg-zinc-900/50">
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-red-400">{allSkillsList.filter(s => s.status === "disabled").length}</div>
            <div className="text-xs text-zinc-500">Disabled</div>
          </CardContent>
        </Card>
      </div>

      {/* All Skills */}
      <section>
        <div className="mb-4 flex items-center gap-3">
          <Sparkles className="h-5 w-5 text-zinc-500" />
          <h2 className="text-xl font-semibold text-white">All Skills</h2>
          <Badge variant="outline" className="border-amber-500/30 bg-amber-500/10 text-amber-400">
            {pendingSkillsList.length} pending review
          </Badge>
        </div>

        {allSkillsList.length === 0 ? (
          <Card className="border-white/5 bg-zinc-900/50">
            <CardContent className="py-10 text-center">
              <p className="text-sm text-zinc-500">No skills found</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {allSkillsList.map((skill) => (
              <Card key={skill._id} className="border-white/5 bg-zinc-900/50">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-3">
                      <div>
                        <CardTitle className="text-white">{skill.name}</CardTitle>
                        <p className="mt-0.5 text-xs text-zinc-500">
                          {skill.category} · {skill.method} · ${skill.pricePerCall}/call · by {skill.authorName}
                        </p>
                      </div>
                      <Badge variant={
                        skill.status === "active" ? "default" : 
                        skill.status === "pending" ? "secondary" : 
                        "destructive"
                      } className="capitalize">
                        {skill.status}
                      </Badge>
                    </div>
                    <div className="flex gap-2">
                      {skill.status === "pending" && (
                        <>
                          <Button
                            size="sm"
                            onClick={() => handleApproveSkill(skill._id)}
                            className="bg-green-600 text-white hover:bg-green-500"
                          >
                            <CheckCircle2 className="mr-1.5 h-3.5 w-3.5" />
                            Approve
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleRejectSkill(skill._id)}
                            className="border-red-500/30 bg-red-500/10 text-red-400 hover:bg-red-500/20 hover:text-red-300"
                          >
                            <XCircle className="mr-1.5 h-3.5 w-3.5" />
                            Reject
                          </Button>
                        </>
                      )}
                      {skill.status === "active" && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleDisableSkill(skill._id)}
                          className="border-red-500/30 bg-red-500/10 text-red-400 hover:bg-red-500/20 hover:text-red-300"
                        >
                          Disable
                        </Button>
                      )}
                      {skill.status === "disabled" && (
                        <Button
                          size="sm"
                          onClick={() => handleEnableSkill(skill._id)}
                          className="bg-emerald-600 text-white hover:bg-emerald-500"
                        >
                          Enable
                        </Button>
                      )}
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="pt-0">
                  <p className="mb-2 text-sm text-zinc-400">{skill.description}</p>
                  <div className="mb-2 rounded-lg bg-zinc-800 px-3 py-2 font-mono text-xs text-zinc-400">
                    {skill.method} {skill.endpoint}
                  </div>
                  <div className="flex items-center justify-between text-xs text-zinc-600">
                    <span>Created {new Date(skill.createdAt).toLocaleDateString()}</span>
                    <span>{skill.totalCalls} calls • {skill.totalReviews} reviews • {skill.averageRating.toFixed(1)} ⭐</span>
                  </div>
                  {skill.tags.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {skill.tags.map((tag) => (
                        <span key={tag} className="rounded-full bg-white/5 px-2 py-0.5 text-xs text-zinc-400">
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

export default function AdminApprovalsPage() {
  return (
    <ClerkProvider appearance={{ baseTheme: dark }}>
      <ConvexClientProvider>
        <AdminContent />
      </ConvexClientProvider>
    </ClerkProvider>
  );
}
