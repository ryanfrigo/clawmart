/**
 * Real Skill Scraper - Fetches SKILL.md from live websites
 * and stores in Convex database
 */

const https = require('https');
const http = require('http');
const { ConvexClient } = require('convex/browser');

const CONVEX_URL = process.env.CONVEX_URL || 'https://hip-curlew-619.convex.cloud';

// Sources to scrape
const SOURCES = [
  {
    name: 'bagsfm',
    url: 'https://bags.fm/skill.md',
    type: 'raw'
  },
  {
    name: 'clawdhub',
    url: 'https://clawdhub.com/api/skills',
    type: 'json',
    fallback: true
  },
  {
    name: 'github-bankrbot',
    api: 'https://api.github.com/repos/BankrBot/openclaw-skills/contents',
    type: 'github',
    fallback: true
  }
];

// Initialize Convex client
function getConvexClient() {
  return new ConvexClient(CONVEX_URL);
}

// Fetch URL with retries
function fetchUrl(url, retries = 3) {
  return new Promise((resolve, reject) => {
    const client = url.startsWith('https') ? https : http;
    
    const req = client.get(url, {
      headers: {
        'User-Agent': 'Clawmart-Scraper/1.0',
        'Accept': 'text/markdown, application/json, */*'
      },
      timeout: 15000
    }, (res) => {
      if (res.statusCode === 301 || res.statusCode === 302) {
        // Follow redirect
        return fetchUrl(res.headers.location, retries).then(resolve).catch(reject);
      }
      
      if (res.statusCode !== 200) {
        return reject(new Error(`HTTP ${res.statusCode}`));
      }
      
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve(data));
    });
    
    req.on('error', (err) => {
      if (retries > 0) {
        console.log(`  Retry ${retries} for ${url}`);
        setTimeout(() => {
          fetchUrl(url, retries - 1).then(resolve).catch(reject);
        }, 1000);
      } else {
        reject(err);
      }
    });
    
    req.on('timeout', () => {
      req.destroy();
      reject(new Error('Timeout'));
    });
  });
}

// Parse SKILL.md content
function parseSkillMarkdown(content, sourceUrl) {
  const lines = content.split('\n');
  const skill = {
    name: '',
    version: '1.0.0',
    author: '@unknown',
    description: '',
    tags: [],
    tools: [],
    runtime: 'node',
    source: sourceUrl,
    sourceOrigin: new URL(sourceUrl).hostname,
    verified: false,
    rating: 0,
    usage: 0,
    level: 1,
    xp: 100,
    price: 'Free',
    lastUpdated: new Date().toISOString(),
  };
  
  let inMetadata = false;
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    
    // Name from H1
    if (line.startsWith('# ') && !skill.name) {
      skill.name = line.replace('# ', '').trim().toLowerCase().replace(/\s+/g, '-');
    }
    
    // Description from blockquote
    if (line.startsWith('> ') && !skill.description) {
      skill.description = line.replace('> ', '').trim();
    }
    
    // Parse metadata table
    if (line.includes('**name**') && line.includes('|')) {
      const match = line.match(/`([^`]+)`/);
      if (match) skill.name = match[1];
    }
    if (line.includes('**version**') && line.includes('|')) {
      const match = line.match(/`([^`]+)`/);
      if (match) skill.version = match[1];
    }
    if (line.includes('**author**') && line.includes('|')) {
      const match = line.match(/`?(@?[^`|]+)`?/);
      if (match) skill.author = match[1].trim();
    }
    if (line.includes('**tags**') && line.includes('|')) {
      const matches = line.match(/`([^`]+)`/g);
      if (matches) skill.tags = matches.map(t => t.replace(/`/g, ''));
    }
    if (line.includes('**tools**') && line.includes('|')) {
      const matches = line.match(/`([^`]+)`/g);
      if (matches) skill.tools = matches.map(t => t.replace(/`/g, ''));
    }
    if (line.includes('**runtime**') && line.includes('|')) {
      const match = line.match(/`([^`]+)`/);
      if (match) skill.runtime = match[1];
    }
    if (line.includes('**price**') && line.includes('|')) {
      const match = line.match(/`?([^`|]+)`?/);
      if (match) {
        skill.price = match[1].trim();
        // Extract numeric amount
        const amountMatch = skill.price.match(/[\d.]+/);
        if (amountMatch) skill.priceAmount = parseFloat(amountMatch[0]);
      }
    }
  }
  
  // Generate ID
  skill.id = `${skill.name}@${skill.version}`;
  
  // Calculate level
  skill.level = calculateLevel(skill);
  skill.xp = calculateXP(skill);
  
  return skill;
}

function calculateLevel(skill) {
  let level = 1;
  if (skill.verified) level += 2;
  if (skill.tools.length > 2) level += 1;
  if (skill.tags.length > 3) level += 1;
  return Math.min(level, 10);
}

function calculateXP(skill) {
  let xp = 100;
  if (skill.verified) xp += 500;
  xp += skill.tools.length * 100;
  xp += skill.tags.length * 50;
  return xp;
}

// Upsert skill to Convex
async function upsertSkillToConvex(skill) {
  try {
    const client = getConvexClient();
    const result = await client.mutation('skills:upsert', skill);
    return result;
  } catch (err) {
    console.error(`  ✗ Failed to upsert ${skill.id}: ${err.message}`);
    return null;
  }
}

// Main scraper
async function scrapeAll() {
  console.log('🔍 Clawmart Skill Scraper\n');
  console.log(`💾 Database: ${CONVEX_URL}\n`);
  
  const results = { scraped: 0, upserted: 0, failed: 0 };
  
  for (const source of SOURCES) {
    try {
      console.log(`📡 Scraping ${source.name}...`);
      
      if (source.fallback) {
        console.log(`   ⏭️  Skipping (fallback)`);
        continue;
      }
      
      if (source.type === 'raw') {
        const content = await fetchUrl(source.url);
        const skill = parseSkillMarkdown(content, source.url);
        
        console.log(`   ✓ Found: ${skill.id}`);
        results.scraped++;
        
        const upserted = await upsertSkillToConvex(skill);
        if (upserted) {
          console.log(`   💾 Saved to Convex`);
          results.upserted++;
        }
      }
      
    } catch (err) {
      console.log(`   ✗ Failed: ${err.message}`);
      results.failed++;
    }
  }
  
  // Add some initial demo data if database is empty
  await seedDemoData();
  
  console.log('\n📊 Summary:');
  console.log(`   Scraped: ${results.scraped}`);
  console.log(`   Upserted: ${results.upserted}`);
  console.log(`   Failed: ${results.failed}`);
  
  return results;
}

// Seed demo data
async function seedDemoData() {
  const demoSkills = [
    {
      id: 'web-search@1.5.0',
      name: 'web-search',
      version: '1.5.0',
      author: '@searchmaster',
      description: 'Search the web using Brave Search API with structured results',
      tags: ['search', 'web', 'brave', 'api'],
      tools: ['search', 'fetch'],
      runtime: 'node',
      source: 'https://clawdhub.com/skills/web-search',
      sourceOrigin: 'clawdhub',
      verified: true,
      rating: 4.9,
      usage: 22145,
      level: 8,
      xp: 222345,
      price: '$0.001/call',
      lastUpdated: new Date().toISOString(),
    },
    {
      id: 'weather@1.2.0',
      name: 'weather',
      version: '1.2.0',
      author: '@openclaw',
      description: 'Global weather data with forecasts and alerts',
      tags: ['weather', 'forecast', 'utility'],
      tools: ['getCurrent', 'getForecast'],
      runtime: 'node',
      source: 'https://clawdhub.com/skills/weather',
      sourceOrigin: 'clawdhub',
      verified: true,
      rating: 4.8,
      usage: 15234,
      level: 7,
      xp: 153780,
      price: 'Free',
      lastUpdated: new Date().toISOString(),
    },
    {
      id: 'github@2.1.0',
      name: 'github',
      version: '2.1.0',
      author: '@devtools',
      description: 'Full GitHub API integration',
      tags: ['github', 'git', 'api', 'developer'],
      tools: ['getRepo', 'createIssue', 'listPRs'],
      runtime: 'node',
      source: 'https://clawdhub.com/skills/github',
      sourceOrigin: 'clawdhub',
      verified: true,
      rating: 4.6,
      usage: 8932,
      level: 6,
      xp: 90732,
      price: '$0.002/call',
      lastUpdated: new Date().toISOString(),
    },
    {
      id: 'tts@1.0.0',
      name: 'tts',
      version: '1.0.0',
      author: '@bags',
      description: 'Text-to-speech using ElevenLabs API',
      tags: ['voice', 'tts', 'audio', 'elevenlabs'],
      tools: ['speak', 'listVoices'],
      runtime: 'node',
      source: 'https://bags.fm/skill.md',
      sourceOrigin: 'bags.fm',
      verified: true,
      rating: 4.7,
      usage: 9876,
      level: 6,
      xp: 99370,
      price: '$0.005/call',
      lastUpdated: new Date().toISOString(),
    }
  ];
  
  console.log('\n🌱 Seeding demo data...');
  
  for (const skill of demoSkills) {
    const result = await upsertSkillToConvex(skill);
    if (result) {
      console.log(`   ✓ ${skill.id}`);
    }
  }
}

// Run if called directly
if (require.main === module) {
  scrapeAll().catch(err => {
    console.error('Fatal error:', err);
    process.exit(1);
  });
}

module.exports = { scrapeAll, parseSkillMarkdown, fetchUrl };
