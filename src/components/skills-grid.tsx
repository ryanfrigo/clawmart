"use client";

import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import Link from "next/link";
import { Zap, Star, Search, SlidersHorizontal } from "lucide-react";
import { useState, useMemo } from "react";

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

type SortOption = "newest" | "price-low" | "price-high" | "rating" | "popular";

export function SkillsGrid() {
  const skills = useQuery(api.skills.list, {});
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [sortBy, setSortBy] = useState<SortOption>("newest");
  
  const filteredAndSortedSkills = useMemo(() => {
    if (!skills) return [];
    
    let filtered = skills.filter((skill) => {
      // Text search across name, description, and tags
      const searchMatch = searchQuery === "" || 
        skill.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        skill.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        skill.tags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()));
      
      // Category filter  
      const categoryMatch = selectedCategory === "All" || skill.category === selectedCategory;
      
      return searchMatch && categoryMatch;
    });
    
    // Sort
    filtered.sort((a, b) => {
      switch (sortBy) {
        case "price-low":
          return a.pricePerCall - b.pricePerCall;
        case "price-high":
          return b.pricePerCall - a.pricePerCall;
        case "rating":
          return (b.averageRating || 0) - (a.averageRating || 0);
        case "popular":
          return (b.totalReviews || 0) - (a.totalReviews || 0);
        case "newest":
        default:
          return new Date(b._creationTime || 0).getTime() - new Date(a._creationTime || 0).getTime();
      }
    });
    
    return filtered;
  }, [skills, searchQuery, selectedCategory, sortBy]);

  if (skills === undefined) {
    return (
      <div className="space-y-6">
        {/* Search/Filter skeleton */}
        <div className="space-y-4">
          <div className="h-10 w-full max-w-md mx-auto animate-pulse rounded-xl border border-white/[0.06] bg-white/[0.02]" />
          <div className="flex flex-wrap justify-center gap-2">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-7 w-16 animate-pulse rounded-full border border-white/[0.06] bg-white/[0.02]" />
            ))}
          </div>
        </div>
        
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div
              key={i}
              className="h-[220px] animate-pulse rounded-2xl border border-white/[0.06] bg-white/[0.02]"
            />
          ))}
        </div>
      </div>
    );
  }

  const categories = [...new Set(skills.map((s) => s.category))] as string[];

  return (
    <>
      {/* Search and Filter Controls */}
      <div className="mb-8 space-y-6">
        {/* Search Bar */}
        <div className="relative max-w-md mx-auto">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
          <input
            type="text"
            placeholder="Search skills..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full rounded-xl border border-white/[0.06] bg-white/[0.02] py-2.5 pl-10 pr-4 text-[14px] text-white placeholder-zinc-500 transition-colors focus:border-indigo-500/30 focus:bg-white/[0.04] focus:outline-none"
          />
        </div>

        {/* Filter Controls */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          {/* Category pills */}
          <div className="flex flex-wrap items-center justify-center gap-2">
            <button
              onClick={() => setSelectedCategory("All")}
              className={`rounded-full border px-3 py-1 text-[12px] font-medium transition ${
                selectedCategory === "All"
                  ? "border-white/[0.15] bg-white/[0.06] text-white"
                  : "border-white/[0.06] bg-transparent text-zinc-500 hover:border-white/[0.12] hover:text-zinc-300"
              }`}
            >
              All ({skills.length})
            </button>
            {categories.map((cat) => {
              const count = skills.filter(s => s.category === cat).length;
              return (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`rounded-full border px-3 py-1 text-[12px] transition ${
                    selectedCategory === cat
                      ? "border-white/[0.15] bg-white/[0.06] text-white font-medium"
                      : "border-white/[0.06] bg-transparent text-zinc-500 hover:border-white/[0.12] hover:text-zinc-300"
                  }`}
                >
                  {cat} ({count})
                </button>
              );
            })}
          </div>

          {/* Sort Options */}
          <div className="flex items-center gap-2">
            <SlidersHorizontal className="h-4 w-4 text-zinc-500" />
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as SortOption)}
              className="rounded-lg border border-white/[0.06] bg-white/[0.02] px-3 py-1.5 text-[13px] text-white focus:border-indigo-500/30 focus:outline-none"
            >
              <option value="newest">Newest</option>
              <option value="price-low">Price: Low to High</option>
              <option value="price-high">Price: High to Low</option>
              <option value="rating">Highest Rated</option>
              <option value="popular">Most Popular</option>
            </select>
          </div>
        </div>
      </div>

      {/* Skills Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {filteredAndSortedSkills.map((skill) => (
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
            <p className="mb-4 text-[13px] leading-relaxed text-zinc-500">
              {skill.description}
            </p>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
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
            <div className="mt-3 flex flex-wrap gap-1.5">
              {skill.tags.map((tag) => (
                <span
                  key={tag}
                  className="rounded-md border border-white/[0.06] bg-white/[0.03] px-2 py-0.5 text-[10px] text-zinc-500"
                >
                  {tag}
                </span>
              ))}
            </div>
          </Link>
        ))}
      </div>

      {/* Empty States */}
      {filteredAndSortedSkills.length === 0 && skills.length > 0 && (
        <div className="text-center py-16">
          <p className="text-zinc-500 mb-2">No skills found matching your criteria.</p>
          <button
            onClick={() => {
              setSearchQuery("");
              setSelectedCategory("All");
            }}
            className="text-[13px] text-indigo-400 hover:underline"
          >
            Clear filters
          </button>
        </div>
      )}

      {skills.length === 0 && (
        <div className="text-center py-16 text-zinc-500">
          No skills listed yet. Be the first to{" "}
          <Link href="/sign-up" className="text-indigo-400 hover:underline">
            list a skill
          </Link>
          .
        </div>
      )}
    </>
  );
}
