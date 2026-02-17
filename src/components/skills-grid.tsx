"use client";

import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import Link from "next/link";
import { Zap, Star } from "lucide-react";

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

export function SkillsGrid() {
  const skills = useQuery(api.skills.list, {});

  if (skills === undefined) {
    return (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <div
            key={i}
            className="h-[220px] animate-pulse rounded-2xl border border-white/[0.06] bg-white/[0.02]"
          />
        ))}
      </div>
    );
  }

  const categories = [...new Set(skills.map((s) => s.category))] as string[];

  return (
    <>
      {/* Category pills */}
      <div className="mb-8 flex flex-wrap items-center justify-center gap-2">
        <span className="rounded-full border border-white/[0.15] bg-white/[0.06] px-3 py-1 text-[12px] font-medium text-white">
          All
        </span>
        {categories.map((cat) => (
          <span
            key={cat}
            className="rounded-full border border-white/[0.06] bg-transparent px-3 py-1 text-[12px] text-zinc-500 hover:border-white/[0.12] hover:text-zinc-300 transition cursor-pointer"
          >
            {cat}
          </span>
        ))}
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {skills.map((skill) => (
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
