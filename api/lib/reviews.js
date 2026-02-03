/**
 * Review and Reputation System
 */

const fs = require('fs').promises;
const path = require('path');

const DATA_DIR = path.join(__dirname, '..', 'data');

class ReviewSystem {
  constructor() {
    this.reviewsPath = path.join(DATA_DIR, 'reviews.json');
    this.reviews = new Map();
    this.init();
  }

  async init() {
    try {
      const data = await fs.readFile(this.reviewsPath, 'utf8');
      const parsed = JSON.parse(data);
      this.reviews = new Map(Object.entries(parsed));
    } catch {
      this.reviews = new Map();
    }
  }

  async save() {
    await fs.mkdir(DATA_DIR, { recursive: true });
    const obj = Object.fromEntries(this.reviews);
    await fs.writeFile(this.reviewsPath, JSON.stringify(obj, null, 2));
  }

  /**
   * Submit a review
   * Only allowed if user has paid for the skill
   */
  async submitReview(skillId, reviewerId, rating, comment, paymentProof) {
    // Verify payment proof exists
    if (!paymentProof) {
      throw new Error('Payment proof required to review');
    }

    // Validate rating
    if (rating < 1 || rating > 5) {
      throw new Error('Rating must be 1-5');
    }

    const reviewId = `${skillId}_${reviewerId}_${Date.now()}`;
    const review = {
      id: reviewId,
      skillId,
      reviewerId,
      rating,
      comment: comment?.substring(0, 1000) || '',
      paymentProof: paymentProof.txHash || paymentProof,
      timestamp: Date.now(),
      verified: true
    };

    // Add to reviews
    if (!this.reviews.has(skillId)) {
      this.reviews.set(skillId, []);
    }
    this.reviews.get(skillId).push(review);

    await this.save();
    return review;
  }

  /**
   * Get reviews for a skill
   */
  async getReviews(skillId, options = {}) {
    const { limit = 10, offset = 0, verifiedOnly = false } = options;
    const allReviews = this.reviews.get(skillId) || [];
    
    let filtered = allReviews;
    if (verifiedOnly) {
      filtered = allReviews.filter(r => r.verified);
    }

    // Sort by newest
    filtered.sort((a, b) => b.timestamp - a.timestamp);

    return {
      reviews: filtered.slice(offset, offset + limit),
      total: filtered.length,
      average: this.calculateAverage(filtered),
      breakdown: this.calculateBreakdown(filtered)
    };
  }

  /**
   * Calculate average rating
   */
  calculateAverage(reviews) {
    if (reviews.length === 0) return 0;
    const sum = reviews.reduce((acc, r) => acc + r.rating, 0);
    return (sum / reviews.length).toFixed(1);
  }

  /**
   * Calculate rating breakdown
   */
  calculateBreakdown(reviews) {
    const breakdown = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
    reviews.forEach(r => breakdown[r.rating]++);
    return breakdown;
  }

  /**
   * Get reputation score for a skill
   */
  getReputationScore(skillId) {
    const reviews = this.reviews.get(skillId) || [];
    
    if (reviews.length === 0) {
      return { score: 0, level: 'unrated', confidence: 0 };
    }

    const avgRating = parseFloat(this.calculateAverage(reviews));
    const reviewCount = reviews.length;
    
    // Wilson score interval for confidence
    const confidence = Math.min(reviewCount / 10, 1);
    
    // Calculate level
    let level = 'bronze';
    if (avgRating >= 4.5 && reviewCount >= 10) level = 'gold';
    else if (avgRating >= 4.0 && reviewCount >= 5) level = 'silver';
    else if (avgRating < 3.0) level = 'warning';

    return {
      score: avgRating,
      level,
      confidence,
      totalReviews: reviewCount,
      verifiedReviews: reviews.filter(r => r.verified).length
    };
  }

  /**
   * Get top-rated skills
   */
  getTopRated(limit = 10) {
    const scores = [];
    
    for (const [skillId, reviews] of this.reviews.entries()) {
      const reputation = this.getReputationScore(skillId);
      if (reputation.totalReviews >= 3) {
        scores.push({ skillId, ...reputation });
      }
    }

    scores.sort((a, b) => b.score - a.score);
    return scores.slice(0, limit);
  }

  /**
   * Flag a review for moderation
   */
  async flagReview(reviewId, reason) {
    // Find review
    for (const [skillId, reviews] of this.reviews.entries()) {
      const review = reviews.find(r => r.id === reviewId);
      if (review) {
        review.flagged = true;
        review.flagReason = reason;
        review.flaggedAt = Date.now();
        await this.save();
        return review;
      }
    }
    throw new Error('Review not found');
  }
}

module.exports = ReviewSystem;
