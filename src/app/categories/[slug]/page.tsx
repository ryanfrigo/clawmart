"use client";

import { useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api";
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
  Zap,
  Star,
  ArrowRight,
  SlidersHorizontal,
  ChevronRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";

const CATEGORY_META: Record<
  string,
  {
    name: string;
    icon: React.ElementType;
    description: string;
    color: string;
    bg: string;
    border: string;
  }
> = {
  research: {
    name: "Research",
    icon: Search,
    description: "Tools for web research, summarization, and information extraction",
    color: "text-sky-400",
    bg: "bg-sky-500/[0.08]",
    border: "border-sky-500/20",
  },
  development: {
    name: "Development",
    icon: Code,
    description: "Code review, testing, debugging, and development automation",
    color: "text-emerald-400",
    bg: "bg-emerald-500/[0.08]",
    border: "border-emerald-500/20",
  },
  nlp: {
    name: "NLP",
    icon: MessageSquare,
    description: "Natural language processing, translation, and text analysis",
    color: "text-violet-400",
    bg: "bg-violet-500/[0.08]",
    border: "border-violet-500/20",
  },
  vision: {
    name: "Vision",
    icon: Eye,
    description: "Image analysis, generation, OCR, and visual understanding",
    color: "text-pink-400",
    bg: "bg-pink-500/[0.08]",
    border: "border-pink-500/20",
  },
  data: {
    name: "Data",
    icon: Database,
    description: "Data extraction, validation, transformation, and enrichment",
    color: "text-amber-400",
    bg: "bg-amber-500/[0.08]",
    border: "border-amber-500/20",
  },
  content: {
    name: "Content",
    icon: FileText,
    description: "Blog writing, SEO optimization, and content generation",
    color: "text-indigo-400",
    bg: "bg-indigo-500/[0.08]",
    border: "border-indigo-500/20",
  },
  finance: {
    name: "Finance",
    icon: DollarSign,
    description: "Financial analysis, prediction, and market data",
    color: "text-teal-400",
    bg: "bg-teal-500/[0.08]",
    border: "border-teal-500/20",
  },
  marketing: {
    name: "Marketing",
    icon: Megaphone,
    description: "Marketing automation, analytics, and outreach tools",
    color: "text-orange-400",
    bg: "bg-orange-500/[0.08]",
    border: "border-orange-500/20",
  },
  security: {
    name: "Security",
    icon: Shield,
    description: "Security scanning, vulnerability detection, and compliance",
    color: "text-red-400",
    bg: "bg-red-500/[0.08]",
    border: "border-red-500/20",
  },
  other: {
    name: "Other",
    icon: Grid2x2,
    description: "Miscellaneous agent skills and utilities",
    color: "text-zinc-400",
    bg: "bg-zinc-500/[0.08]",
    border: "border-zinc-500/20",
  },
};

function StarRating({ rating }: { rating: number }) {
  return (
    <div className="flex items-center gap-1">
      {[...Array(5)].map((_, i) => (
        <Star
          key={i}
          className={`h-3 w-3 ${i < Math.floor(rating) ? "fill-amber-400 text-amber-400" : "text-zinc-700"}`}
        />
      ))}
      <span className="ml-1 text-[12px] text-zinc-500">{rating}</span>
    </div>
  );
}

type SortOption = "popular" | "price-low" | "price-high" | "rating" | "newest";

export default function CategoryDetailPage() {
  const params = useParams();
  const slug = (params?.slug as string) ?? "";
  const [sortBy, setSortBy] = useState<SortOption>("popular");

  const meta = CATEGORY_META[slug.toLowerCase()];
  const categoryName = meta?.name ?? slug;

  const skills = useQuery(
    api.skills.list,
    meta ? { category: meta.name } : "skip"
  );

  const sorted = skills
    ? [...skills].sort((a, b) => {
        switch (sortBy) {
          case "price-low":
            return a.pricePerCall - b.pricePerCall;
          case "price-high":
            return b.pricePerCall - a.pricePerCall;
          case "rating":
            return b.averageRating - a.averageRating;
          case "newest":
            return b.createdAt - a.createdAt;
          case "popular":
          default:
            return b.totalCalls - a.totalCalls;
        }
      })
    : undefined;

  const Icon = meta?.icon ?? Grid2x2;

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
        {/* Breadcrumb */}
        <div className="mb-8 flex items-center gap-1.5 text-[12px] text-zinc-600">
          <Link href="/" className="hover:text-zinc-400 transition">Home</Link>
          <ChevronRight className="h-3 w-3" />
          <Link href="/categories" className="hover:text-zinc-400 transition">Categories</Link>
          <ChevronRight className="h-3 w-3" />
          <span className="text-zinc-400">{categoryName}</span>
        </div>

        {/* Category Header */}
        <div className="mb-10 flex items-start gap-5">
          {meta ? (
            <div className={`flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-2xl border ${meta.border} ${meta.bg}`}>
              <Icon className={`h-7 w-7 ${meta.color}`} />
            </div>
          ) : (
            <div className="flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-2xl border border-white/[0.08] bg-white/[0.03]">
              <Grid2x2 className="h-7 w-7 text-zinc-400" />
            </div>
          )}
          <div>
            <h1 className="text-3xl font-bold tracking-[-0.025em] md:text-[2.5rem] mb-2">
              {categoryName}
            </h1>
            <p className="text-[15px] text-zinc-500 max-w-xl">
              {meta?.description ?? `Skills in the ${categoryName} category`}
            </p>
          </div>
        </div>

        {/* Sort bar */}
        <div className="flex items-center justify-between mb-8">
          <div className="text-[13px] text-zinc-600">
            {sorted === undefined ? (
              <span className="animate-pulse">Loading…</span>
            ) : (
              <>
                {sorted.length} skill{sorted.length !== 1 ? "s" : ""} in {categoryName}
              </>
            )}
          </div>
          <div className="flex items-center gap-2">
            <SlidersHorizontal className="h-4 w-4 text-zinc-600" />
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as SortOption)}
              className="rounded-xl border border-white/[0.08] bg-white/[0.03] px-3 py-2 text-[13px] text-zinc-300 focus:outline-none focus:border-indigo-500/30 appearance-none cursor-pointer"
            >
              <option value="popular">Most Popular</option>
              <option value="price-low">Price: Low → High</option>
              <option value="price-high">Price: High → Low</option>
              <option value="rating">Highest Rated</option>
              <option value="newest">Newest</option>
            </select>
          </div>
        </div>

        {/* Loading skeletons */}
        {sorted === undefined && (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div
                key={i}
                className="h-[240px] animate-pulse rounded-2xl border border-white/[0.06] bg-white/[0.02]"
              />
            ))}
          </div>
        )}

        {/* Skills grid */}
        {sorted && sorted.length > 0 && (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {sorted.map((skill) => (
              <Link
                key={skill._id}
                href={`/skills/${skill.slug || skill._id}`}
                className="group rounded-2xl border border-white/[0.06] bg-white/[0.02] p-6 transition-all duration-200 hover:border-indigo-500/20 hover:bg-white/[0.04] hover:shadow-[0_0_40px_-15px_rgba(99,102,241,0.12)]"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/[0.08] bg-white/[0.03] transition-colors group-hover:border-indigo-500/20">
                    <Zap className="h-5 w-5 text-zinc-400 group-hover:text-indigo-400 transition-colors" />
                  </div>
                  <span className="rounded-full border border-white/[0.08] bg-white/[0.03] px-2 py-0.5 text-[11px] text-zinc-500">
                    {skill.category}
                  </span>
                </div>
                <h3 className="mb-2 text-[15px] font-semibold tracking-tight group-hover:text-white transition-colors">
                  {skill.name}
                </h3>
                <p className="mb-4 text-[13px] leading-relaxed text-zinc-500 line-clamp-2">
                  {skill.description}
                </p>
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <span className="text-[14px] font-semibold text-emerald-400">
                      ${skill.pricePerCall}
                    </span>
                    <span className="text-[11px] text-zinc-600">per call</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <StarRating rating={skill.averageRating || 0} />
                    <span className="text-[11px] text-zinc-600">
                      ({skill.totalReviews})
                    </span>
                  </div>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {skill.tags.slice(0, 3).map((tag) => (
                    <span
                      key={tag}
                      className="rounded-md border border-white/[0.06] bg-white/[0.03] px-2 py-0.5 text-[10px] text-zinc-500"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
                <div className="mt-4 flex items-center gap-1.5 text-[12px] text-zinc-600 group-hover:text-indigo-400 transition-colors">
                  View details
                  <ArrowRight className="h-3 w-3" />
                </div>
              </Link>
            ))}
          </div>
        )}

        {/* Empty state */}
        {sorted && sorted.length === 0 && (
          <div className="text-center py-20">
            <div className={`flex h-16 w-16 items-center justify-center rounded-2xl border ${meta?.border ?? "border-white/[0.06]"} ${meta?.bg ?? "bg-white/[0.02]"} mx-auto mb-6`}>
              <Icon className={`h-7 w-7 ${meta?.color ?? "text-zinc-600"}`} />
            </div>
            <h3 className="text-lg font-semibold mb-2">No skills yet</h3>
            <p className="text-[14px] text-zinc-500 mb-6">
              Be the first to list a {categoryName.toLowerCase()} skill on ClawMart.
            </p>
            <Link href="/dashboard/skills/submit">
              <Button className="h-9 rounded-lg bg-white text-[#09090b] text-[13px] font-medium hover:bg-zinc-200">
                List a skill
              </Button>
            </Link>
          </div>
        )}

        {/* Unknown category fallback */}
        {!meta && (
          <div className="text-center py-10">
            <p className="text-[14px] text-zinc-500">
              Unknown category &ldquo;{slug}&rdquo;.{" "}
              <Link href="/categories" className="text-indigo-400 hover:underline">
                Browse all categories
              </Link>
            </p>
          </div>
        )}
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
