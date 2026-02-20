"use client";

import { useState } from "react";
import Link from "next/link";
import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import {
  Bot,
  Zap,
  Star,
  Search,
  ArrowRight,
  Loader2,
  SlidersHorizontal,
} from "lucide-react";
import { Button } from "@/components/ui/button";

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

export default function BrowseSkillsPage() {
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState<SortOption>("popular");

  const skills = useQuery(api.skills.list, activeCategory ? { category: activeCategory } : {});

  const categories = skills
    ? ([...new Set(skills.map((s) => s.category))] as string[]).sort()
    : [];

  // Client-side search & sort
  const filtered = skills
    ?.filter((s) => {
      if (!searchQuery) return true;
      const q = searchQuery.toLowerCase();
      return (
        s.name.toLowerCase().includes(q) ||
        s.description.toLowerCase().includes(q) ||
        s.tags.some((t) => t.toLowerCase().includes(q))
      );
    })
    .sort((a, b) => {
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
    });

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
              <Link href="/skills" className="text-[13px] text-white font-medium">Skills</Link>
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
        <div className="mb-10">
          <h1 className="text-3xl font-bold tracking-[-0.025em] md:text-[2.5rem] mb-3">
            Browse Skills
          </h1>
          <p className="text-[15px] text-zinc-500 max-w-xl">
            Discover agent capabilities you can call and pay for with USDC micropayments. Each skill is an API endpoint — no accounts needed.
          </p>
        </div>

        {/* Search + Sort bar */}
        <div className="flex flex-col sm:flex-row gap-3 mb-8">
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-600" />
            <input
              type="text"
              placeholder="Search skills, tags, categories..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full rounded-xl border border-white/[0.08] bg-white/[0.03] py-2.5 pl-10 pr-4 text-[14px] text-white placeholder:text-zinc-600 focus:outline-none focus:border-indigo-500/30 transition"
            />
          </div>
          <div className="flex items-center gap-2">
            <SlidersHorizontal className="h-4 w-4 text-zinc-600" />
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as SortOption)}
              className="rounded-xl border border-white/[0.08] bg-white/[0.03] px-3 py-2.5 text-[13px] text-zinc-300 focus:outline-none focus:border-indigo-500/30 appearance-none cursor-pointer"
            >
              <option value="popular">Most Popular</option>
              <option value="price-low">Price: Low → High</option>
              <option value="price-high">Price: High → Low</option>
              <option value="rating">Highest Rated</option>
              <option value="newest">Newest</option>
            </select>
          </div>
        </div>

        {/* Category pills */}
        <div className="mb-8 flex flex-wrap gap-2">
          <button
            onClick={() => setActiveCategory(null)}
            className={`rounded-full border px-3.5 py-1.5 text-[12px] font-medium transition ${
              activeCategory === null
                ? "border-white/[0.15] bg-white/[0.06] text-white"
                : "border-white/[0.06] bg-transparent text-zinc-500 hover:border-white/[0.12] hover:text-zinc-300"
            }`}
          >
            All
          </button>
          {(activeCategory && !categories.includes(activeCategory)
            ? [activeCategory, ...categories]
            : categories
          ).map((cat) => (
            <button
              key={cat}
              onClick={() => setActiveCategory(activeCategory === cat ? null : cat)}
              className={`rounded-full border px-3.5 py-1.5 text-[12px] font-medium transition ${
                activeCategory === cat
                  ? "border-indigo-500/30 bg-indigo-500/[0.08] text-indigo-300"
                  : "border-white/[0.06] bg-transparent text-zinc-500 hover:border-white/[0.12] hover:text-zinc-300"
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Loading */}
        {filtered === undefined && (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div
                key={i}
                className="h-[240px] animate-pulse rounded-2xl border border-white/[0.06] bg-white/[0.02]"
              />
            ))}
          </div>
        )}

        {/* Results */}
        {filtered && filtered.length > 0 && (
          <>
            <div className="mb-4 text-[13px] text-zinc-600">
              {filtered.length} skill{filtered.length !== 1 ? "s" : ""} found
              {searchQuery && <> matching &ldquo;{searchQuery}&rdquo;</>}
              {activeCategory && <> in {activeCategory}</>}
            </div>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {filtered.map((skill) => (
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
          </>
        )}

        {/* Empty state */}
        {filtered && filtered.length === 0 && (
          <div className="text-center py-20">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl border border-white/[0.06] bg-white/[0.02] mx-auto mb-6">
              <Search className="h-7 w-7 text-zinc-600" />
            </div>
            <h3 className="text-lg font-semibold mb-2">No skills found</h3>
            <p className="text-[14px] text-zinc-500 mb-6">
              {searchQuery
                ? `No results for "${searchQuery}". Try a different search.`
                : "No skills in this category yet."}
            </p>
            <Link href="/dashboard/skills/submit">
              <Button className="h-9 rounded-lg bg-white text-[#09090b] text-[13px] font-medium hover:bg-zinc-200">
                Be the first to list a skill
              </Button>
            </Link>
          </div>
        )}

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
