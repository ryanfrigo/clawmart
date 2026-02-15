"use client";
import { useUser } from "@clerk/nextjs";

import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { useRouter } from "next/navigation";
import {
  TrendingUp,
  Megaphone,
  Building,
  Headphones,
  Scale,
  ArrowRight,
  ArrowLeft,
  Check,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Id } from "../../../../convex/_generated/dataModel";

const iconMap: Record<string, React.ElementType> = {
  TrendingUp,
  Megaphone,
  Building,
  Headphones,
  Scale,
};

export default function NewWorkforcePage() {
  const { user } = useUser();
  const router = useRouter();
  const templates = useQuery(api.templates.list);
  const createWorkforce = useMutation(api.workforces.create);
  const seedTemplates = useMutation(api.templates.seed);

  const [step, setStep] = useState(0);
  const [selectedTemplate, setSelectedTemplate] = useState<Id<"templates"> | null>(null);
  const [name, setName] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [brandVoice, setBrandVoice] = useState("");
  const [context, setContext] = useState("");
  const [loading, setLoading] = useState(false);

  // Auto-seed templates if empty
  if (templates && templates.length === 0) {
    seedTemplates();
  }

  const selectedTemplateData = templates?.find((t: any) => t._id === selectedTemplate);

  const handleCreate = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const workforceId = await createWorkforce({
        clerkId: user.id,
        name: name || selectedTemplateData?.name || "My Workforce",
        templateId: selectedTemplate ?? undefined,
        config: {
          companyName: companyName || undefined,
          brandVoice: brandVoice || undefined,
          industry: selectedTemplateData?.industry || undefined,
          context: context || undefined,
        },
      });
      router.push(`/dashboard/workforce/${workforceId}`);
    } catch (e: unknown) {
      const errorMessage = e instanceof Error ? e.message : "Failed to create workforce";
      alert(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mx-auto max-w-4xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Create a Workforce</h1>
        <p className="mt-1 text-zinc-400">
          {step === 0
            ? "Choose an industry template to start with"
            : step === 1
            ? "Customize your workforce"
            : "Review your AI team"}
        </p>
      </div>

      {/* Progress */}
      <div className="mb-10 flex items-center gap-2">
        {["Template", "Customize", "Review"].map((label, i) => (
          <div key={label} className="flex items-center gap-2">
            <div
              className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-medium ${
                i < step
                  ? "bg-white text-[#09090b]"
                  : i === step
                  ? "border-2 border-white/30 text-white"
                  : "border border-zinc-700 text-zinc-500"
              }`}
            >
              {i < step ? <Check className="h-4 w-4" /> : i + 1}
            </div>
            <span className={`text-sm ${i === step ? "text-white" : "text-zinc-500"}`}>
              {label}
            </span>
            {i < 2 && <div className="mx-2 h-px w-12 bg-zinc-800" />}
          </div>
        ))}
      </div>

      {/* Step 0: Choose template */}
      {step === 0 && (
        <div>
          <div className="grid gap-4 md:grid-cols-2">
            {templates?.map((t) => {
              const Icon = iconMap[t.icon] || Sparkles;
              return (
                <Card
                  key={t._id}
                  onClick={() => {
                    setSelectedTemplate(t._id);
                    setName(t.name);
                  }}
                  className={`cursor-pointer transition ${
                    selectedTemplate === t._id
                      ? "border-white/30 bg-white/5"
                      : "border-white/5 bg-zinc-900/50 hover:border-white/10"
                  }`}
                >
                  <CardContent className="p-6">
                    <div className="flex items-start gap-4">
                      <div
                        className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br ${t.color}`}
                      >
                        <Icon className="h-5 w-5 text-white" />
                      </div>
                      <div>
                        <h3 className="font-semibold">{t.name}</h3>
                        <p className="mt-1 text-sm text-zinc-400">{t.description}</p>
                        <div className="mt-3 flex flex-wrap gap-1.5">
                          {t.agents.map((a) => (
                            <span
                              key={a.name}
                              className="rounded-md border border-white/5 bg-zinc-800 px-2 py-0.5 text-xs text-zinc-300"
                            >
                              {a.name}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
          <div className="mt-8 flex justify-end">
            <Button
              disabled={!selectedTemplate}
              onClick={() => setStep(1)}
              className="bg-white text-[#09090b] hover:bg-zinc-200"
            >
              Continue
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      {/* Step 1: Customize */}
      {step === 1 && (
        <div>
          <div className="space-y-6">
            <div>
              <Label>Workforce Name</Label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. My Sales Team"
                className="mt-2 border-white/10 bg-zinc-900"
              />
            </div>
            <div>
              <Label>Company Name</Label>
              <Input
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                placeholder="e.g. Acme Corp"
                className="mt-2 border-white/10 bg-zinc-900"
              />
            </div>
            <div>
              <Label>Brand Voice</Label>
              <Textarea
                value={brandVoice}
                onChange={(e) => setBrandVoice(e.target.value)}
                placeholder="Describe your brand's tone and communication style..."
                className="mt-2 border-white/10 bg-zinc-900"
                rows={3}
              />
            </div>
            <div>
              <Label>Additional Context</Label>
              <Textarea
                value={context}
                onChange={(e) => setContext(e.target.value)}
                placeholder="Any additional info your agents should know about your business..."
                className="mt-2 border-white/10 bg-zinc-900"
                rows={4}
              />
            </div>
          </div>
          <div className="mt-8 flex justify-between">
            <Button variant="outline" onClick={() => setStep(0)}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back
            </Button>
            <Button onClick={() => setStep(2)} className="bg-white text-[#09090b] hover:bg-zinc-200">
              Continue
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      {/* Step 2: Review */}
      {step === 2 && selectedTemplateData && (
        <div>
          <Card className="border-white/5 bg-zinc-900/50">
            <CardContent className="p-6">
              <h3 className="mb-1 text-lg font-semibold">{name || selectedTemplateData.name}</h3>
              {companyName && (
                <p className="text-sm text-zinc-400">for {companyName}</p>
              )}
              <div className="mt-6">
                <h4 className="mb-3 text-sm font-medium text-zinc-400">Your AI Agents</h4>
                <div className="space-y-3">
                  {selectedTemplateData.agents.map((a) => (
                    <div
                      key={a.name}
                      className="rounded-lg border border-white/5 bg-zinc-800/50 p-4"
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium">{a.name}</p>
                          <p className="text-sm text-zinc-400">{a.role}</p>
                        </div>
                        <div className="flex gap-1.5">
                          {a.tools.map((t) => (
                            <span
                              key={t}
                              className="rounded bg-zinc-700 px-1.5 py-0.5 text-xs text-zinc-300"
                            >
                              {t}
                            </span>
                          ))}
                        </div>
                      </div>
                      <p className="mt-2 text-sm text-zinc-500">{a.description}</p>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
          <div className="mt-8 flex justify-between">
            <Button variant="outline" onClick={() => setStep(1)}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back
            </Button>
            <Button
              onClick={handleCreate}
              disabled={loading}
              className="bg-white text-[#09090b] hover:bg-zinc-200"
            >
              {loading ? "Creating..." : "Deploy Workforce"}
              <Sparkles className="ml-2 h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
