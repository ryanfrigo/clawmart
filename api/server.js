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

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: { error: 'Rate limit exceeded' }
});
app.use('/api/', limiter);

// === HEALTH ===
app.get('/api/health', async (req, res) => {
  try {
    await convex.query('skills:list', { limit: 1 });
    res.json({
      status: 'operational',
      service: 'clawmart-api',
      version: '3.0.0',
      database: 'connected',
      timestamp: new Date().toISOString()
    });
  } catch (err) {
    res.status(500).json({ status: 'error', error: err.message });
  }
});

// === AGENT ONBOARDING ===

// Register new agent
app.post('/api/v1/agents/register', async (req, res) => {
  try {
    const { address, name, bio } = req.body;
    
    if (!address) {
      return res.status(400).json({ error: 'Address is required' });
    }
    
    const result = await convex.mutation('agents:register', {
      address,
      name,
      bio,
    });
    
    res.status(201).json({ data: result });
  } catch (err) {
    console.error('Registration error:', err);
    res.status(400).json({ error: err.message });
  }
});

// Get agent profile
app.get('/api/v1/agents/:address', async (req, res) => {
  try {
    const agent = await convex.query('agents:get', { address: req.params.address });
    
    if (!agent) {
      return res.status(404).json({ error: 'Agent not found' });
    }
    
    res.json({ data: agent });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// List agents
app.get('/api/v1/agents', async (req, res) => {
  try {
    const { limit = 50 } = req.query;
    const agents = await convex.query('agents:list', { limit: parseInt(limit) });
    res.json({ data: agents });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// === SKILLS ===

// List all skills
app.get('/api/v1/skills', async (req, res) => {
  try {
    const { tag, author, verified, minLevel, search, limit = 20 } = req.query;
    
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
      meta: { total: result.total, limit: parseInt(limit) }
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
    
    res.json({ data: skill });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// CREATE SKILL - Platform core functionality
app.post('/api/v1/skills', async (req, res) => {
  try {
    const {
      id, name, version, description,
      tags, tools, runtime, source,
      price, priceAmount
    } = req.body;
    
    // Validation
    if (!id || !name || !version || !description) {
      return res.status(400).json({ 
        error: 'Required: id, name, version, description' 
      });
    }
    
    if (!id.includes('@')) {
      return res.status(400).json({ 
        error: 'ID must be in format: name@version' 
      });
    }
    
    const result = await convex.mutation('skills:create', {
      id,
      name,
      version,
      description,
      tags: tags || [],
      tools: tools || [],
      runtime: runtime || 'node',
      source: source || '',
      price: price || 'Free',
      priceAmount: priceAmount || 0,
    });
    
    res.status(201).json({ 
      data: { 
        id: result.skillId,
        message: 'Skill created successfully. You can now receive payments!'
      } 
    });
  } catch (err) {
    console.error('Create skill error:', err);
    res.status(400).json({ error: err.message });
  }
});

// Update skill
app.patch('/api/v1/skills/:id', async (req, res) => {
  try {
    const result = await convex.mutation('skills:update', {
      id: req.params.id,
      ...req.body,
    });
    
    res.json({ data: result });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Delete skill
app.delete('/api/v1/skills/:id', async (req, res) => {
  try {
    await convex.mutation('skills:deleteSkill', { id: req.params.id });
    res.json({ data: { deleted: true } });
  } catch (err) {
    res.status(400).json({ error: err.message });
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
    res.json({ query: q, count: skills.length, data: skills });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// === REVIEWS ===

app.get('/api/v1/skills/:id/reviews', async (req, res) => {
  try {
    const { limit = 10 } = req.query;
    const reviews = await convex.query('reviews:list', {
      skillId: req.params.id,
      limit: parseInt(limit)
    });
    res.json(reviews);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/v1/skills/:id/reviews', async (req, res) => {
  try {
    const { rating, comment, paymentProof } = req.body;
    const reviewerId = req.headers['x-agent-id'] || 'anonymous';
    
    const reviewId = await convex.mutation('reviews:submit', {
      skillId: req.params.id,
      reviewerId,
      rating,
      comment,
      paymentProof: JSON.stringify(paymentProof || {}),
    });
    
    res.status(201).json({ data: { id: reviewId } });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// === LEADERBOARD ===

app.get('/api/v1/leaderboard', async (req, res) => {
  try {
    const { type = 'top_rated' } = req.query;
    const data = await convex.query('skills:leaderboard', { type });
    res.json({ type, data });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// === ACTIVITY ===

app.get('/api/v1/activity', async (req, res) => {
  try {
    const { limit = 20 } = req.query;
    const activity = await convex.query('payments:activity', { limit: parseInt(limit) });
    res.json({ data: activity });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// === SWAGGER ===

try {
  const swaggerDocument = YAML.load(path.join(__dirname, 'swagger.yaml'));
  app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument));
} catch (err) {
  console.log('Swagger docs not available');
}

// === ERROR HANDLING ===

app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Internal server error' });
});

app.use((req, res) => {
  res.status(404).json({ error: 'Endpoint not found' });
});

app.listen(PORT, () => {
  console.log(`🚀 Clawmart API v3.0.0 running on port ${PORT}`);
  console.log(`💾 Database: ${CONVEX_URL}`);
  console.log(`📝 User onboarding: POST /api/v1/agents/register`);
  console.log(`➕ Add skill: POST /api/v1/skills`);
  console.log(`📚 API Docs: http://localhost:${PORT}/api/docs`);
});

module.exports = app;
