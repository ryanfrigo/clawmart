/**
 * Tests for Review System
 */

const ReviewSystem = require('../lib/reviews');
const path = require('path');
const fs = require('fs').promises;

describe('Review System', () => {
  let reviews;
  const testPath = path.join(__dirname, '..', 'data', 'test-reviews.json');

  beforeEach(async () => {
    reviews = new ReviewSystem();
    reviews.reviewsPath = testPath;
    reviews.reviews = new Map();
  });

  afterEach(async () => {
    try {
      await fs.unlink(testPath);
    } catch {}
  });

  test('submits a review', async () => {
    const review = await reviews.submitReview(
      'test-skill@1.0.0',
      'agent-123',
      5,
      'Excellent skill!',
      { txHash: '0xpayment123' }
    );

    expect(review.skillId).toBe('test-skill@1.0.0');
    expect(review.reviewerId).toBe('agent-123');
    expect(review.rating).toBe(5);
    expect(review.verified).toBe(true);
  });

  test('rejects review without payment proof', async () => {
    await expect(
      reviews.submitReview('test-skill', 'agent-123', 5, 'Good', null)
    ).rejects.toThrow('Payment proof required to review');
  });

  test('rejects invalid rating', async () => {
    await expect(
      reviews.submitReview('test-skill', 'agent-123', 6, 'Good', { txHash: '0x123' })
    ).rejects.toThrow('Rating must be 1-5');
  });

  test('gets reviews for a skill', async () => {
    await reviews.submitReview('skill-a', 'agent-1', 5, 'Great', { txHash: '0x1' });
    await reviews.submitReview('skill-a', 'agent-2', 4, 'Good', { txHash: '0x2' });

    const result = await reviews.getReviews('skill-a');
    
    expect(result.total).toBe(2);
    expect(result.reviews.length).toBe(2);
  });

  test('calculates reputation score', () => {
    // Empty reviews = unrated
    const empty = reviews.getReputationScore('no-reviews');
    expect(empty.level).toBe('unrated');
    expect(empty.score).toBe(0);
  });
});
