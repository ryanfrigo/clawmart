/**
 * Integration tests for Clawmart
 */

const fs = require('fs').promises;
const path = require('path');

const DATA_DIR = path.join(__dirname, '..', 'data');

async function testSkillsData() {
  console.log('Testing skills data...');
  
  const skillsPath = path.join(DATA_DIR, 'skills.json');
  const data = JSON.parse(await fs.readFile(skillsPath, 'utf8'));
  
  // Check structure
  if (!data.meta) throw new Error('Missing meta field');
  if (!data.skills) throw new Error('Missing skills array');
  if (!Array.isArray(data.skills)) throw new Error('Skills is not an array');
  
  // Check required fields on each skill
  const required = ['id', 'name', 'version', 'author', 'tags', 'tools', 'level', 'xp'];
  for (const skill of data.skills) {
    for (const field of required) {
      if (!(field in skill)) {
        throw new Error(`Skill ${skill.id || 'unknown'} missing field: ${field}`);
      }
    }
    
    // Validate types
    if (!Array.isArray(skill.tags)) throw new Error(`${skill.id}: tags should be array`);
    if (!Array.isArray(skill.tools)) throw new Error(`${skill.id}: tools should be array`);
    if (typeof skill.level !== 'number') throw new Error(`${skill.id}: level should be number`);
    if (skill.level < 1 || skill.level > 10) throw new Error(`${skill.id}: level should be 1-10`);
  }
  
  console.log(`✓ ${data.skills.length} skills validated`);
  return data;
}

async function testLeaderboard() {
  console.log('Testing leaderboard...');
  
  const lbPath = path.join(DATA_DIR, 'leaderboard.json');
  const data = JSON.parse(await fs.readFile(lbPath, 'utf8'));
  
  if (!data.topOverall) throw new Error('Missing topOverall');
  if (!data.byTag) throw new Error('Missing byTag');
  if (!data.byAuthor) throw new Error('Missing byAuthor');
  
  console.log('✓ Leaderboard structure validated');
  return data;
}

async function testSkillSpec() {
  console.log('Testing SKILL_SPEC.md...');
  
  const specPath = path.join(__dirname, '..', 'SKILL_SPEC.md');
  const content = await fs.readFile(specPath, 'utf8');
  
  // Check key sections exist
  const requiredSections = ['Metadata', 'Tools Provided', 'Configuration', 'Verification'];
  for (const section of requiredSections) {
    if (!content.includes(section)) {
      throw new Error(`SKILL_SPEC.md missing section: ${section}`);
    }
  }
  
  console.log('✓ SKILL_SPEC.md validated');
}

async function testExampleSkill() {
  console.log('Testing example skill...');
  
  const skillPath = path.join(__dirname, '..', 'examples', 'hello-world', 'SKILL.md');
  const content = await fs.readFile(skillPath, 'utf8');
  
  // Check required fields
  if (!content.includes('name')) throw new Error('Missing name field');
  if (!content.includes('version')) throw new Error('Missing version field');
  if (!content.includes('Metadata')) throw new Error('Missing Metadata section');
  
  console.log('✓ Example skill validated');
}

async function runAllTests() {
  console.log('═══════════════════════════════════════');
  console.log('  CLAWMART INTEGRATION TEST SUITE');
  console.log('═══════════════════════════════════════\n');
  
  try {
    await testSkillsData();
    await testLeaderboard();
    await testSkillSpec();
    await testExampleSkill();
    
    console.log('\n═══════════════════════════════════════');
    console.log('  ALL TESTS PASSED ✓');
    console.log('═══════════════════════════════════════');
    process.exit(0);
  } catch (err) {
    console.error('\n✗ TEST FAILED:', err.message);
    process.exit(1);
  }
}

runAllTests();
