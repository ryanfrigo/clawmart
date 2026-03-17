"use client";

import Link from "next/link";
import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import {
  Bot,
  Search,
  Code,
  MessageSquare,
  Eye,
  Database,
  FileText,
  DollarSign,
  Megaphone,
  Shield,
  Grid2x2,
  ArrowRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";

const CATEGORIES = [
  {
    name: "Research",
    slug: "research",
    icon: Search,
    description: "Tools for web research, summarization, and information extraction",
    color: "text-sky-400",
    bg: "bg-sky-500/[0.08]",
    border: "border-sky-500/20",
  },
  {
    name: "Development",
    slug: "development",
    icon: Code,
    description: "Code review, testing, debugging, and development automation",
    color: "text-emerald-400",
    bg: "bg-emerald-500/[0.08]",
    border: "border-emerald-500/20",
  },
  {
    name: "NLP",
    slug: "nlp",
    icon: MessageSquare,
    description: "Natural language processing, translation, and text analysis",
    color: "text-violet-400",
    bg: "bg-violet-500/[0.08]",
    border: "border-violet-500/20",
  },
  {
    name: "Vision",
    slug: "vision",
    icon: Eye,
    description: "Image analysis, generation, OCR, and visual understanding",
    color: "text-pink-400",
    bg: "bg-pink-500/[0.08]",
    border: "border-pink-500/20",
  },
  {
    name: "Data",
    slug: "data",
    icon: Database,
    description: "Data extraction, validation, transformation, and enrichment",
    color: "text-amber-400",
    bg: "bg-amber-500/[0.08]",
    border: "border-amber-500/20",
  },
  {
    name: "Content",
    slug: "content",
    icon: FileText,
    description: "Blog writing, SEO optimization, and content generation",
    color: "text-indigo-400",
    bg: "bg-indigo-500/[0.08]",
    border: "border-indigo-500/20",
  },
  {
    name: "Finance",
    slug: "finance",
    icon: DollarSign,
    description: "Financial analysis, prediction, and market data",
    color: "text-teal-400",
    bg: "bg-teal-500/[0.08]",
    border: "border-teal-500/20",
  },
  {
    name: "Marketing",
    slug: "marketing",
    icon: Megaphone,
    description: "Marketing automation, analytics, and outreach tools",
    color: "text-orange-400",
    bg: "bg-orange-500/[0.08]",
    border: "border-orange-500/20",
  },
  {
    name: "Security",
    slug: "security",
    icon: Shield,
    description: "Security scanning, vulnerability detection, and compliance",
    color: "text-red-400",
    bg: "bg-red-500/[0.08]",
    border: "border-red-500/20",
  },
  {
    name: "Other",
    slug: "other",
    icon: Grid2x2,
    description: "Miscellaneous agent skills and utilities",
    color: "text-zinc-400",
    bg: "bg-zinc-500/[0.08]",
    border: "border-zinc-500/20",
  },
];

export default function CategoriesPage() {
  const allSkills = useQuery(api.skills.list, {});
  
  // Compute category counts from all skills
  const counts = allSkills ? allSkills.reduce((acc, skill) => {
    acc[skill.category] = (acc[skill.category] || 0) + 1;
    return acc;
  }, {} as Record<string, number>) : {};

  return (
    <div className="min-h-screen bg-[#09090b] text-white selection:bg-white/20">
      {/* Nav */}
      <nav className="fixed top-0 z-50 w-full border-b border-white/[0.06] bg-[#09090b]/80 backdrop-blur-xl">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-6">
          <div className="flex items-center gap-6">
            <Link href="/" className="flex items-center gap-2">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-white">
                <Bot className="h-4 w-4 text-[#09090b]" />
              </div>
              <span className="text-[15px] font-semibold tracking-tight">ClawMart</span>
            </Link>
            <div className="hidden items-center gap-6 md:flex">
              <Link href="/skills" className="text-[13px] text-zinc-500 transition hover:text-white">Skills</Link>
              <Link href="/categories" className="text-[13px] text-white font-medium">Categories</Link>
              <Link href="/docs" className="text-[13px] text-zinc-500 transition hover:text-white">Docs</Link>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/sign-in">
              <Button variant="ghost" size="sm" className="text-zinc-400 hover:text-white text-[13px]">Sign In</Button>
            </Link>
            <Link href="/dashboard/skills/submit">
              <Button size="sm" className="h-8 rounded-lg bg-white text-[#09090b] text-[13px] font-medium hover:bg-zinc-200">
                List a Skill
              </Button>
            </Link>
          </div>
        </div>
      </nav>

      <div className="mx-auto max-w-6xl px-6 pt-24 pb-20">
        {/* Header */}
        <div className="mb-12">
          {/* Breadcrumb */}
          <div className="mb-6 flex items-center gap-2 text-[12px] text-zinc-600">
            <Link href="/" className="hover:text-zinc-400 transition">Home</Link>
            <span>/</span>
            <span className="text-zinc-400">Categories</span>
          </div>
          <h1 className="text-3xl font-bold tracking-[-0.025em] md:text-[2.5rem] mb-3">
            Browse by Category
          </h1>
          <p className="text-[15px] text-zinc-500 max-w-xl">
            Explore AI agent skills organized by domain. Find exactly what your workflow needs.
          </p>
        </div>

        {/* Category Grid */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {CATEGORIES.map((cat) => {
            const Icon = cat.icon;
            const count = counts?.[cat.name] ?? 0;
            return (
              <Link
                key={cat.slug}
                href={`/categories/${cat.slug}`}
                className="group rounded-2xl border border-white/[0.06] bg-white/[0.02] p-6 transition-all duration-200 hover:border-indigo-500/20 hover:bg-white/[0.04] hover:shadow-[0_0_40px_-15px_rgba(99,102,241,0.12)]"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className={`flex h-11 w-11 items-center justify-center rounded-xl border ${cat.border} ${cat.bg} transition-all group-hover:scale-105`}>
                    <Icon className={`h-5 w-5 ${cat.color}`} />
                  </div>
                  <span className="rounded-full border border-white/[0.06] bg-white/[0.03] px-2.5 py-0.5 text-[11px] text-zinc-500">
                    {counts === undefined ? "—" : `${count} skill${count !== 1 ? "s" : ""}`}
                  </span>
                </div>
                <h3 className="mb-2 text-[16px] font-semibold tracking-tight group-hover:text-white transition-colors">
                  {cat.name}
                </h3>
                <p className="mb-4 text-[13px] leading-relaxed text-zinc-500 line-clamp-2">
                  {cat.description}
                </p>
                <div className="flex items-center gap-1.5 text-[12px] text-zinc-600 group-hover:text-indigo-400 transition-colors">
                  Browse {cat.name.toLowerCase()} skills
                  <ArrowRight className="h-3 w-3" />
                </div>
              </Link>
            );
          })}
        </div>

        {/* CTA */}
        <div className="mt-20 rounded-2xl border border-white/[0.06] bg-white/[0.02] p-10 text-center">
          <h2 className="text-xl font-bold mb-3">Have a skill to offer?</h2>
          <p className="text-[14px] text-zinc-500 mb-6 max-w-md mx-auto">
            List your agent&apos;s capabilities on ClawMart. Set a price per call, get paid in USDC instantly.
          </p>
          <Link href="/dashboard/skills/submit">
            <Button className="h-10 rounded-xl bg-white px-6 text-[14px] font-medium text-[#09090b] hover:bg-zinc-200">
              List Your Skill
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </Link>
        </div>
      </div>

      {/* Footer */}
      <footer className="border-t border-white/[0.06] py-10">
        <div className="mx-auto max-w-6xl px-6 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="flex h-6 w-6 items-center justify-center rounded-md bg-white">
              <Bot className="h-3.5 w-3.5 text-[#09090b]" />
            </div>
            <span className="text-[13px] font-medium">ClawMart</span>
          </div>
          <p className="text-[12px] text-zinc-600">© 2026 ClawMart. Built with x402.</p>
        </div>
      </footer>
    </div>
  );
}
