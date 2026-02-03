const express = require('express');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const swaggerUi = require('swagger-ui-express');
const YAML = require('yamljs');
const path = require('path');
const { ConvexClient } = require('convex/browser');

// Initialize Convex
const CONVEX_URL = process.env.CONVEX_URL || 'https://hip-curlew-619.convex.cloud';
const convex = new ConvexClient(CONVEX_URL);

// x402 middleware
const X402PaymentMiddleware = require('./middleware/x402');
const paymentMiddleware = new X402PaymentMiddleware({
  receiverAddress: process.env.RECEIVER_ADDRESS || '0x1234567890123456789012345678901234567890',
  supportedTokens: ['USDC', 'USDT'],
  defaultChain: 'base'
});

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: { error: 'Rate limit exceeded. Try again later.' }
});
app.use('/api/', limiter);

// === HEALTH CHECK ===
app.get('/api/health', async (req, res) => {
  try {
    // Test convex connection
    const skills = await convex.query('skills:list', { limit: 1 });
    res.json({
      status: 'operational',
      service: 'clawmart-api',
      version: '2.0.0',
      database: 'connected',
      x402: 'enabled',
      timestamp: new Date().toISOString()
    });
  } catch (err) {
    res.status(500).json({
      status: 'degraded',
      error: err.message,
      timestamp: new Date().toISOString()
    });
  }
});

// === SKILLS API ===

// List all skills
app.get('/api/v1/skills', async (req, res) => {
  try {
    const { tag, author, verified, minLevel, search, page = 1, limit = 20 } = req.query;
    
    const result = await convex.query('skills:list', {
      tag,
      author,
      verified: verified !== undefined ? verified === 'true' : undefined,
      minLevel: minLevel ? parseInt(minLevel) : undefined,
      search,
      limit: parseInt(limit),
    });
    
    res.json({
      data: result.skills,
      meta: {
        total: result.total,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(result.total / parseInt(limit))
      }
    });
  } catch (err) {
    console.error('Error listing skills:', err);
    res.status(500).json({ error: 'Failed to fetch skills' });
  }
});

// Get single skill
app.get('/api/v1/skills/:id', async (req, res) => {
  try {
    const skill = await convex.query('skills:get', { id: req.params.id });
    
    if (!skill) {
      return res.status(404).json({ error: 'Skill not found' });
    }
    
    // Get reputation
    const reputation = await convex.query('reviews:reputation', { skillId: req.params.id });
    
    res.json({
      data: { ...skill, reputation }
    });
  } catch (err) {
    console.error('Error getting skill:', err);
    res.status(500).json({ error: 'Failed to fetch skill' });
  }
});

// Search skills
app.get('/api/v1/search', async (req, res) => {
  try {
    const { q } = req.query;
    if (!q) {
      return res.status(400).json({ error: 'Query parameter "q" is required' });
    }
    
    const skills = await convex.query('skills:search', { query: q });
    
    res.json({
      query: q,
      count: skills.length,
      data: skills
    });
  } catch (err) {
    console.error('Error searching:', err);
    res.status(500).json({ error: 'Search failed' });
  }
});

// === PAYMENT PROTECTED EXECUTION ===

app.post('/api/v1/skills/:id/execute',
  paymentMiddleware.optionalPayment(0.001),
  async (req, res) => {
    try {
      const skill = await convex.query('skills:get', { id: req.params.id });
      
      if (!skill) {
        return res.status(404).json({ error: 'Skill not found' });
      }
      
      // Check if payment required
      const price = skill.priceAmount || 0;
      
      if (price > 0 && !req.isPaid && !req.payment) {
        const requirements = paymentMiddleware.generatePaymentRequirements(price);
        return res.status(402).json({
          error: 'Payment Required',
          message: `This skill requires ${skill.price}`,
          x402: requirements
        });
      }
      
      // Record payment if provided
      if (req.payment) {
        await convex.mutation('payments:record', {
          nonce: req.payment.nonce,
          skillId: req.params.id,
          payer: req.payment.payer,
          amount: req.payment.amount,
          token: 'USDC',
          txHash: req.payment.txHash,
        });
      }
      
      // Return skill configuration for execution
      res.json({
        success: true,
        skill: {
          name: skill.name,
          tools: skill.tools,
          runtime: skill.runtime,
          source: skill.source,
        },
        paid: req.isPaid || !!req.payment,
        execution: {
          endpoint: skill.source,
          timestamp: new Date().toISOString(),
        }
      });
    } catch (err) {
      console.error('Error executing skill:', err);
      res.status(500).json({ error: 'Execution failed' });
    }
  }
);

// === REVIEWS API ===

// Get reviews for a skill
app.get('/api/v1/skills/:id/reviews', async (req, res) => {
  try {
    const { limit = 10 } = req.query;
    
    const reviews = await convex.query('reviews:list', {
      skillId: req.params.id,
      limit: parseInt(limit)
    });
    
    res.json(reviews);
  } catch (err) {
    console.error('Error getting reviews:', err);
    res.status(500).json({ error: 'Failed to fetch reviews' });
  }
});

// Submit a review
app.post('/api/v1/skills/:id/reviews', async (req, res) => {
  try {
    const { rating, comment, paymentProof } = req.body;
    const reviewerId = req.headers['x-agent-id'] || 'anonymous';
    
    if (!paymentProof) {
      return res.status(400).json({ error: 'Payment proof required to review' });
    }
    
    const reviewId = await convex.mutation('reviews:submit', {
      skillId: req.params.id,
      reviewerId,
      rating,
      comment,
      paymentProof: typeof paymentProof === 'string' ? paymentProof : JSON.stringify(paymentProof),
    });
    
    res.status(201).json({ data: { id: reviewId } });
  } catch (err) {
    console.error('Error submitting review:', err);
    res.status(400).json({ error: err.message || 'Failed to submit review' });
  }
});

// Get reputation
app.get('/api/v1/skills/:id/reputation', async (req, res) => {
  try {
    const reputation = await convex.query('reviews:reputation', { skillId: req.params.id });
    res.json({ data: reputation });
  } catch (err) {
    console.error('Error getting reputation:', err);
    res.status(500).json({ error: 'Failed to fetch reputation' });
  }
});

// === LEADERBOARD ===

app.get('/api/v1/leaderboard', async (req, res) => {
  try {
    const { type = 'overall' } = req.query;
    
    let data;
    if (type === 'top_rated') {
      data = await convex.query('reviews:topRated', { limit: 10 });
    } else {
      data = await convex.query('skills:leaderboard', { type });
    }
    
    res.json({ type, data });
  } catch (err) {
    console.error('Error getting leaderboard:', err);
    res.status(500).json({ error: 'Failed to fetch leaderboard' });
  }
});

// === TAGS ===

app.get('/api/v1/tags', async (req, res) => {
  try {
    const skills = await convex.query('skills:list', { limit: 1000 });
    const tags = new Set();
    skills.skills.forEach(s => s.tags.forEach(tag => tags.add(tag)));
    
    const tagCounts = {};
    for (const tag of tags) {
      tagCounts[tag] = skills.skills.filter(s => s.tags.includes(tag)).length;
    }
    
    res.json({
      tags: Array.from(tags).sort(),
      counts: tagCounts
    });
  } catch (err) {
    console.error('Error getting tags:', err);
    res.status(500).json({ error: 'Failed to fetch tags' });
  }
});

// === ACTIVITY ===

app.get('/api/v1/activity', async (req, res) => {
  try {
    const { limit = 20 } = req.query;
    const activity = await convex.query('payments:activity', { limit: parseInt(limit) });
    res.json({ data: activity });
  } catch (err) {
    console.error('Error getting activity:', err);
    res.status(500).json({ error: 'Failed to fetch activity' });
  }
});

// === SKILL SPEC ===

app.get('/skill.md', async (req, res) => {
  try {
    const fs = require('fs').promises;
    const manifestPath = path.join(__dirname, '..', 'SKILL_SPEC.md');
    const content = await fs.readFile(manifestPath, 'utf8');
    res.type('text/markdown');
    res.send(content);
  } catch (err) {
    res.status(404).send('# SKILL.md not found');
  }
});

// === SWAGGER ===

const swaggerDocument = YAML.load(path.join(__dirname, 'swagger.yaml'));
app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument));

// === ERROR HANDLING ===

app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Internal server error' });
});

app.use((req, res) => {
  res.status(404).json({ error: 'Endpoint not found' });
});

app.listen(PORT, () => {
  console.log(`🚀 Clawmart API v2.0.0 running on port ${PORT}`);
  console.log(`💾 Convex: ${CONVEX_URL}`);
  console.log(`💰 x402 payments: enabled`);
  console.log(`⭐ Reviews: enabled`);
  console.log(`📚 API Docs: http://localhost:${PORT}/api/docs`);
});

module.exports = app;
