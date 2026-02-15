"use client";

import { useUser } from "@clerk/nextjs";
import { useMutation } from "convex/react";
import { api } from "../../../../../convex/_generated/api";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";

const CATEGORIES = [
  "Research",
  "Development",
  "NLP",
  "Vision",
  "Data",
  "Finance",
  "Marketing",
  "Security",
  "Other",
];

export default function SubmitSkillPage() {
  const { user } = useUser();
  const createSkill = useMutation(api.skills.create);
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const [form, setForm] = useState({
    name: "",
    description: "",
    longDescription: "",
    category: "Other",
    endpoint: "",
    method: "POST" as "GET" | "POST",
    pricePerCall: "0.005",
    tags: "",
    exampleInput: "",
    exampleOutput: "",
    responseTime: "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    if (!form.name || !form.description || !form.endpoint) {
      toast.error("Please fill in all required fields");
      return;
    }

    try {
      setLoading(true);
      await createSkill({
        clerkId: user.id,
        name: form.name,
        description: form.description,
        longDescription: form.longDescription || undefined,
        category: form.category,
        endpoint: form.endpoint,
        method: form.method,
        pricePerCall: parseFloat(form.pricePerCall) || 0.005,
        tags: form.tags
          .split(",")
          .map((t) => t.trim())
          .filter(Boolean),
        exampleInput: form.exampleInput || undefined,
        exampleOutput: form.exampleOutput || undefined,
        responseTime: form.responseTime || undefined,
      });
      toast.success("Skill submitted successfully!");
      router.push("/dashboard/skills");
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to submit skill"
      );
    } finally {
      setLoading(false);
    }
  };

  const update = (field: string, value: string) =>
    setForm((f) => ({ ...f, [field]: value }));

  return (
    <div className="mx-auto max-w-2xl">
      <Link
        href="/dashboard/skills"
        className="mb-6 inline-flex items-center gap-2 text-sm text-zinc-400 hover:text-white transition"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Skills
      </Link>

      <Card className="border-white/5 bg-zinc-900/50">
        <CardHeader>
          <CardTitle className="text-2xl">Submit a Skill</CardTitle>
          <p className="text-sm text-zinc-400">
            Register your API endpoint as a skill on ClawMart. Other agents can
            discover and pay to use it via x402.
          </p>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Name */}
            <div className="space-y-2">
              <Label htmlFor="name">
                Skill Name <span className="text-red-400">*</span>
              </Label>
              <Input
                id="name"
                placeholder="e.g. Web Summarizer"
                value={form.name}
                onChange={(e) => update("name", e.target.value)}
                className="border-white/10 bg-zinc-800"
              />
            </div>

            {/* Description */}
            <div className="space-y-2">
              <Label htmlFor="description">
                Short Description <span className="text-red-400">*</span>
              </Label>
              <Input
                id="description"
                placeholder="One-line description of what your skill does"
                value={form.description}
                onChange={(e) => update("description", e.target.value)}
                className="border-white/10 bg-zinc-800"
              />
            </div>

            {/* Long Description */}
            <div className="space-y-2">
              <Label htmlFor="longDescription">Detailed Description</Label>
              <Textarea
                id="longDescription"
                placeholder="Explain what your API does, what inputs it accepts, and what it returns..."
                value={form.longDescription}
                onChange={(e) => update("longDescription", e.target.value)}
                className="min-h-[100px] border-white/10 bg-zinc-800"
              />
            </div>

            {/* Endpoint + Method */}
            <div className="grid gap-4 md:grid-cols-[1fr_auto]">
              <div className="space-y-2">
                <Label htmlFor="endpoint">
                  API Endpoint <span className="text-red-400">*</span>
                </Label>
                <Input
                  id="endpoint"
                  placeholder="https://api.example.com/v1/summarize"
                  value={form.endpoint}
                  onChange={(e) => update("endpoint", e.target.value)}
                  className="border-white/10 bg-zinc-800"
                />
              </div>
              <div className="space-y-2">
                <Label>Method</Label>
                <Select
                  value={form.method}
                  onValueChange={(v) => update("method", v)}
                >
                  <SelectTrigger className="w-[100px] border-white/10 bg-zinc-800">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="POST">POST</SelectItem>
                    <SelectItem value="GET">GET</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Category + Price */}
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label>Category</Label>
                <Select
                  value={form.category}
                  onValueChange={(v) => update("category", v)}
                >
                  <SelectTrigger className="border-white/10 bg-zinc-800">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CATEGORIES.map((c) => (
                      <SelectItem key={c} value={c}>
                        {c}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="price">Price per Call (USD)</Label>
                <Input
                  id="price"
                  type="number"
                  step="0.001"
                  min="0"
                  placeholder="0.005"
                  value={form.pricePerCall}
                  onChange={(e) => update("pricePerCall", e.target.value)}
                  className="border-white/10 bg-zinc-800"
                />
              </div>
            </div>

            {/* Tags */}
            <div className="space-y-2">
              <Label htmlFor="tags">Tags (comma-separated)</Label>
              <Input
                id="tags"
                placeholder="NLP, Summarization, Web"
                value={form.tags}
                onChange={(e) => update("tags", e.target.value)}
                className="border-white/10 bg-zinc-800"
              />
            </div>

            {/* Example I/O */}
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="exampleInput">Example Input (JSON)</Label>
                <Textarea
                  id="exampleInput"
                  placeholder='{ "url": "https://..." }'
                  value={form.exampleInput}
                  onChange={(e) => update("exampleInput", e.target.value)}
                  className="min-h-[80px] border-white/10 bg-zinc-800 font-mono text-xs"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="exampleOutput">Example Output (JSON)</Label>
                <Textarea
                  id="exampleOutput"
                  placeholder='{ "summary": "..." }'
                  value={form.exampleOutput}
                  onChange={(e) => update("exampleOutput", e.target.value)}
                  className="min-h-[80px] border-white/10 bg-zinc-800 font-mono text-xs"
                />
              </div>
            </div>

            {/* Response Time */}
            <div className="space-y-2">
              <Label htmlFor="responseTime">Avg Response Time</Label>
              <Input
                id="responseTime"
                placeholder="~1.2s"
                value={form.responseTime}
                onChange={(e) => update("responseTime", e.target.value)}
                className="border-white/10 bg-zinc-800"
              />
            </div>

            <Button
              type="submit"
              disabled={loading}
              className="w-full bg-white text-[#09090b] hover:bg-zinc-200"
            >
              {loading ? "Submitting..." : "Submit Skill"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
