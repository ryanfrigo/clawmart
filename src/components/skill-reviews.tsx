"use client";

import { useUser } from "@clerk/nextjs";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Id } from "../../convex/_generated/dataModel";
import { useState } from "react";
import { Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";

function StarPicker({
  value,
  onChange,
}: {
  value: number;
  onChange: (n: number) => void;
}) {
  const [hover, setHover] = useState(0);
  return (
    <div className="flex items-center gap-1">
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          onMouseEnter={() => setHover(n)}
          onMouseLeave={() => setHover(0)}
          onClick={() => onChange(n)}
          className="transition"
        >
          <Star
            className={`h-5 w-5 ${
              n <= (hover || value)
                ? "fill-amber-400 text-amber-400"
                : "text-zinc-600"
            }`}
          />
        </button>
      ))}
    </div>
  );
}

export function SkillReviews({ skillId }: { skillId: Id<"skills"> }) {
  const { user } = useUser();
  const reviews = useQuery(api.reviews.listBySkill, { skillId });
  const createReview = useMutation(api.reviews.create);
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!user || rating === 0) {
      toast.error("Please select a rating");
      return;
    }
    try {
      setSubmitting(true);
      await createReview({
        clerkId: user.id,
        skillId,
        rating,
        comment: comment || undefined,
      });
      toast.success("Review submitted!");
      setRating(0);
      setComment("");
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to submit review"
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <h3 className="text-lg font-semibold">Reviews</h3>

      {/* Submit review form */}
      {user && (
        <div className="rounded-lg border border-white/5 bg-zinc-900/50 p-4 space-y-3">
          <p className="text-sm text-zinc-400">Rate this skill</p>
          <StarPicker value={rating} onChange={setRating} />
          <Textarea
            placeholder="Leave a comment (optional)"
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            className="border-white/10 bg-zinc-800"
          />
          <Button
            onClick={handleSubmit}
            disabled={submitting || rating === 0}
            size="sm"
            className="bg-white text-[#09090b] hover:bg-zinc-200"
          >
            {submitting ? "Submitting..." : "Submit Review"}
          </Button>
        </div>
      )}

      {/* Review list */}
      {reviews === undefined ? (
        <p className="text-sm text-zinc-500">Loading reviews...</p>
      ) : reviews.length === 0 ? (
        <p className="text-sm text-zinc-500">No reviews yet. Be the first!</p>
      ) : (
        <div className="space-y-4">
          {reviews.map((r) => (
            <div
              key={r._id}
              className="rounded-lg border border-white/5 bg-zinc-900/30 p-4"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium">{r.userName}</span>
                  <div className="flex items-center gap-0.5">
                    {[1, 2, 3, 4, 5].map((n) => (
                      <Star
                        key={n}
                        className={`h-3 w-3 ${
                          n <= r.rating
                            ? "fill-amber-400 text-amber-400"
                            : "text-zinc-700"
                        }`}
                      />
                    ))}
                  </div>
                </div>
                <span className="text-xs text-zinc-600">
                  {new Date(r.createdAt).toLocaleDateString()}
                </span>
              </div>
              {r.comment && (
                <p className="mt-2 text-sm text-zinc-400">{r.comment}</p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
