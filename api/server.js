const express = require('express');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const swaggerUi = require('swagger-ui-express');
const YAML = require('yamljs');
const path = require('path');
const fs = require('fs').promises;

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: { error: 'Rate limit exceeded. Try again later.' }
});
app.use('/api/', limiter);

// Cache
let skillsCache = null;
let leaderboardCache = null;
let cacheTimestamp = null;
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

// Inline mock data for serverless deployment
const MOCK_SKILLS = {
  meta: { scrapedAt: new Date().toISOString(), count: 6, sources: ['clawdhub', 'bankrbot', 'bagsfm'] },
  skills: [
    { id: 'web-search@1.5.0', name: 'web-search', version: '1.5.0', author: '@searchmaster', tags: ['search', 'web', 'brave', 'api'], tools: ['search', 'fetch'], runtime: 'node', description: 'Search the web using Brave Search API', source: 'https://clawdhub.com/skills/web-search', sourceOrigin: 'clawdhub', verified: true, rating: 4.9, usage: 22145, level: 8, xp: 222345, lastUpdated: '2024-01-15T10:30:00Z' },
    { id: 'weather@1.2.0', name: 'weather', version: '1.2.0', author: '@openclaw', tags: ['weather', 'forecast', 'utility'], tools: ['getCurrent', 'getForecast'], runtime: 'node', description: 'Get weather information for any location', source: 'https://clawdhub.com/skills/weather', sourceOrigin: 'clawdhub', verified: true, rating: 4.8, usage: 15234, level: 7, xp: 153780, lastUpdated: '2024-01-15T10:30:00Z' },
    { id: 'github@2.1.0', name: 'github', version: '2.1.0', author: '@devtools', tags: ['github', 'git', 'api', 'developer'], tools: ['getRepo', 'createIssue', 'listPRs'], runtime: 'node', description: 'Interact with GitHub repositories and issues', source: 'https://clawdhub.com/skills/github', sourceOrigin: 'clawdhub', verified: true, rating: 4.6, usage: 8932, level: 6, xp: 90732, lastUpdated: '2024-01-15T10:30:00Z' },
    { id: 'crypto-price@1.0.0', name: 'crypto-price', version: '1.0.0', author: '@bankrbot', tags: ['crypto', 'bitcoin', 'price', 'finance'], tools: ['getPrice', 'getHistory'], runtime: 'node', description: 'Get cryptocurrency prices and historical data', source: 'https://github.com/BankrBot/openclaw-skills/crypto-price', sourceOrigin: 'bankrbot', verified: false, rating: 4.2, usage: 3421, level: 4, xp: 34620, lastUpdated: '2024-01-15T10:30:00Z' },
    { id: 'stock-data@1.1.0', name: 'stock-data', version: '1.1.0', author: '@traderjoe', tags: ['stocks', 'finance', 'market', 'api'], tools: ['getQuote', 'getChart'], runtime: 'node', description: 'Real-time stock market data and charts', source: 'https://github.com/BankrBot/openclaw-skills/stock-data', sourceOrigin: 'bankrbot', verified: true, rating: 4.5, usage: 5678, level: 5, xp: 57230, lastUpdated: '2024-01-15T10:30:00Z' },
    { id: 'tts@1.0.0', name: 'tts', version: '1.0.0', author: '@bags', tags: ['voice', 'tts', 'audio', 'elevenlabs'], tools: ['speak', 'listVoices'], runtime: 'node', description: 'Text-to-speech using ElevenLabs API', source: 'https://bags.fm/skill.md', sourceOrigin: 'bagsfm', verified: true, rating: 4.7, usage: 9876, level: 6, xp: 99370, lastUpdated: '2024-01-15T10:30:00Z' }
  ]
};

const MOCK_LEADERBOARD = {
  topOverall: MOCK_SKILLS.skills.slice(0, 10),
  byTag: {
    search: MOCK_SKILLS.skills.filter(s => s.tags.includes('search')),
    weather: MOCK_SKILLS.skills.filter(s => s.tags.includes('weather')),
    github: MOCK_SKILLS.skills.filter(s => s.tags.includes('github')),
    crypto: MOCK_SKILLS.skills.filter(s => s.tags.includes('crypto')),
    finance: MOCK_SKILLS.skills.filter(s => s.tags.includes('finance')),
    voice: MOCK_SKILLS.skills.filter(s => s.tags.includes('voice'))
  },
  byAuthor: {
    '@searchmaster': MOCK_SKILLS.skills.filter(s => s.author === '@searchmaster'),
    '@openclaw': MOCK_SKILLS.skills.filter(s => s.author === '@openclaw'),
    '@devtools': MOCK_SKILLS.skills.filter(s => s.author === '@devtools'),
    '@bankrbot': MOCK_SKILLS.skills.filter(s => s.author === '@bankrbot'),
    '@traderjoe': MOCK_SKILLS.skills.filter(s => s.author === '@traderjoe'),
    '@bags': MOCK_SKILLS.skills.filter(s => s.author === '@bags')
  },
  rising: MOCK_SKILLS.skills.filter(s => s.level >= 5 && !s.verified).slice(0, 5)
};

async function loadData() {
  const now = Date.now();
  if (skillsCache && cacheTimestamp && (now - cacheTimestamp < CACHE_TTL)) {
    return { skills: skillsCache, leaderboard: leaderboardCache };
  }

  // In serverless/Vercel environment, use mock data
  if (process.env.VERCEL) {
    return { skills: MOCK_SKILLS, leaderboard: MOCK_LEADERBOARD };
  }

  try {
    const skillsPath = path.join(__dirname, '..', 'data', 'skills.json');
    const leaderboardPath = path.join(__dirname, '..', 'data', 'leaderboard.json');
    
    const skillsData = await fs.readFile(skillsPath, 'utf8');
    const leaderboardData = await fs.readFile(leaderboardPath, 'utf8');
    
    skillsCache = JSON.parse(skillsData);
    leaderboardCache = JSON.parse(leaderboardData);
    cacheTimestamp = now;
    
    return { skills: skillsCache, leaderboard: leaderboardCache };
  } catch (err) {
    console.error('Error loading data:', err);
    // Fallback to mock data
    return { skills: MOCK_SKILLS, leaderboard: MOCK_LEADERBOARD };
  }
}

// Health check
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'operational',
    service: 'clawmart-api',
    version: '1.0.0',
    timestamp: new Date().toISOString()
  });
});

// List all skills
app.get('/api/v1/skills', async (req, res) => {
  const { skills } = await loadData();
  let result = skills.skills || [];
  
  // Filtering
  const { tag, author, runtime, verified, minLevel, search } = req.query;
  
  if (tag) {
    result = result.filter(s => s.tags.includes(tag.toLowerCase()));
  }
  
  if (author) {
    result = result.filter(s => s.author.toLowerCase() === author.toLowerCase());
  }
  
  if (runtime) {
    result = result.filter(s => s.runtime === runtime);
  }
  
  if (verified !== undefined) {
    const isVerified = verified === 'true';
    result = result.filter(s => s.verified === isVerified);
  }
  
  if (minLevel) {
    result = result.filter(s => s.level >= parseInt(minLevel));
  }
  
  if (search) {
    const query = search.toLowerCase();
    result = result.filter(s => 
      s.name.toLowerCase().includes(query) ||
      s.description.toLowerCase().includes(query) ||
      s.tags.some(t => t.toLowerCase().includes(query))
    );
  }
  
  // Pagination
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 20;
  const start = (page - 1) * limit;
  const paginated = result.slice(start, start + limit);
  
  res.json({
    data: paginated,
    meta: {
      total: result.length,
      page,
      limit,
      pages: Math.ceil(result.length / limit)
    }
  });
});

// Get specific skill
app.get('/api/v1/skills/:id', async (req, res) => {
  const { skills } = await loadData();
  const skill = skills.skills.find(s => s.id === req.params.id);
  
  if (!skill) {
    return res.status(404).json({ error: 'Skill not found' });
  }
  
  res.json({ data: skill });
});

// Search skills
app.get('/api/v1/search', async (req, res) => {
  const { q } = req.query;
  
  if (!q) {
    return res.status(400).json({ error: 'Query parameter "q" is required' });
  }
  
  const { skills } = await loadData();
  const query = q.toLowerCase();
  
  const results = skills.skills.filter(s => 
    s.name.toLowerCase().includes(query) ||
    s.description.toLowerCase().includes(query) ||
    s.tags.some(t => t.toLowerCase().includes(query)) ||
    s.tools.some(t => t.toLowerCase().includes(query))
  );
  
  res.json({
    query: q,
    count: results.length,
    data: results
  });
});

// Get leaderboard
app.get('/api/v1/leaderboard', async (req, res) => {
  const { leaderboard } = await loadData();
  const { type = 'overall' } = req.query;
  
  let data;
  switch (type) {
    case 'tags':
      data = leaderboard.byTag || {};
      break;
    case 'authors':
      data = leaderboard.byAuthor || {};
      break;
    case 'rising':
      data = leaderboard.rising || [];
      break;
    default:
      data = leaderboard.topOverall || [];
  }
  
  res.json({ type, data });
});

// Get all tags
app.get('/api/v1/tags', async (req, res) => {
  const { skills } = await loadData();
  const tags = new Set();
  
  for (const skill of skills.skills) {
    skill.tags.forEach(tag => tags.add(tag));
  }
  
  const tagCounts = {};
  for (const tag of tags) {
    tagCounts[tag] = skills.skills.filter(s => s.tags.includes(tag)).length;
  }
  
  res.json({
    tags: Array.from(tags).sort(),
    counts: tagCounts
  });
});

// Get all runtimes
app.get('/api/v1/runtimes', async (req, res) => {
  const { skills } = await loadData();
  const runtimes = new Set(skills.skills.map(s => s.runtime));
  res.json({ runtimes: Array.from(runtimes) });
});

// Verification endpoint (mock)
app.post('/api/v1/skills/:id/verify', async (req, res) => {
  const { testResults } = req.body;
  
  res.json({
    skillId: req.params.id,
    status: 'pending',
    submittedAt: new Date().toISOString(),
    message: 'Verification request received. Results will be available shortly.'
  });
});

// Skill manifest (for agents to consume)
app.get('/skill.md', async (req, res) => {
  const manifestPath = path.join(__dirname, '..', 'SKILL_SPEC.md');
  try {
    const content = await fs.readFile(manifestPath, 'utf8');
    res.type('text/markdown');
    res.send(content);
  } catch (err) {
    res.status(404).send('# SKILL.md not found');
  }
});

// Swagger docs
const swaggerDocument = YAML.load(path.join(__dirname, 'swagger.yaml'));
app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument));

// Error handling
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Internal server error' });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Endpoint not found' });
});

app.listen(PORT, () => {
  console.log(`🚀 Clawmart API running on port ${PORT}`);
  console.log(`📚 API Docs: http://localhost:${PORT}/api/docs`);
  console.log(`🏥 Health: http://localhost:${PORT}/api/health`);
});

module.exports = app;
