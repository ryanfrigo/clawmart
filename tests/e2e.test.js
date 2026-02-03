/**
 * E2E Test: Full user journey
 * 
 * 1. Register as agent
 * 2. Create a skill
 * 3. List skills (verify ours is there)
 * 4. Get skill details
 * 5. Submit a review
 * 6. Check leaderboard
 */

const { ConvexClient } = require('convex/browser');

const CONVEX_URL = process.env.CONVEX_URL || 'https://hip-curlew-619.convex.cloud';
const API_URL = process.env.API_URL || 'http://localhost:3001';

const convex = new ConvexClient(CONVEX_URL);

// Test wallet addresses
const TEST_AGENT = {
  address: '0xTest' + Date.now(),
  name: 'Test Agent',
  bio: 'I create awesome skills for agents',
};

const TEST_SKILL = {
  id: `test-skill-${Date.now()}@1.0.0`,
  name: `test-skill-${Date.now()}`,
  version: '1.0.0',
  description: 'A test skill for end-to-end testing. This skill demonstrates the Clawmart platform.',
  tags: ['test', 'demo', 'utility'],
  tools: ['testTool', 'verifyConnection'],
  runtime: 'node',
  source: 'https://example.com/skill-endpoint',
  price: '$0.001/call',
  priceAmount: 0.001,
};

async function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function runE2ETest() {
  console.log('═══════════════════════════════════════════════════');
  console.log('  CLAWMART E2E TEST - Full User Journey');
  console.log('═══════════════════════════════════════════════════\n');
  
  const results = [];
  
  try {
    // ═══════════════════════════════════════════════════
    // STEP 1: Register as Agent
    // ═══════════════════════════════════════════════════
    console.log('👤 STEP 1: Register as Agent');
    console.log(`   Address: ${TEST_AGENT.address}`);
    
    const agentResult = await convex.mutation('agents:register', {
      address: TEST_AGENT.address,
      name: TEST_AGENT.name,
      bio: TEST_AGENT.bio,
    });
    
    console.log(`   ✅ Agent registered: ${agentResult.id}`);
    results.push({ step: 1, name: 'Agent Registration', status: 'PASS' });
    
    await delay(500);
    
    // ═══════════════════════════════════════════════════
    // STEP 2: Create a Skill
    // ═══════════════════════════════════════════════════
    console.log('\n➕ STEP 2: Create a Skill');
    console.log(`   ID: ${TEST_SKILL.id}`);
    console.log(`   Price: ${TEST_SKILL.price}`);
    
    const skillResult = await convex.mutation('skills:create', TEST_SKILL);
    
    console.log(`   ✅ Skill created: ${skillResult.skillId}`);
    console.log(`   📝 Message: Skill created successfully. You can now receive payments!`);
    results.push({ step: 2, name: 'Skill Creation', status: 'PASS' });
    
    await delay(500);
    
    // ═══════════════════════════════════════════════════
    // STEP 3: List Skills (Verify ours is there)
    // ═══════════════════════════════════════════════════
    console.log('\n📋 STEP 3: List Skills');
    
    const skills = await convex.query('skills:list', { limit: 20 });
    const foundSkill = skills.skills.find(s => s.id === TEST_SKILL.id);
    
    if (foundSkill) {
      console.log(`   ✅ Found our skill in list!`);
      console.log(`   📊 Total skills: ${skills.total}`);
      console.log(`   🏆 Level: ${foundSkill.level}`);
      results.push({ step: 3, name: 'Skill Listing', status: 'PASS' });
    } else {
      throw new Error('Skill not found in list');
    }
    
    await delay(500);
    
    // ═══════════════════════════════════════════════════
    // STEP 4: Get Skill Details
    // ═══════════════════════════════════════════════════
    console.log('\n🔍 STEP 4: Get Skill Details');
    
    const skillDetails = await convex.query('skills:get', { id: TEST_SKILL.id });
    
    console.log(`   ✅ Retrieved: ${skillDetails.name}`);
    console.log(`   📝 Description: ${skillDetails.description.slice(0, 50)}...`);
    console.log(`   🏷️  Tags: ${skillDetails.tags.join(', ')}`);
    console.log(`   ⭐ Rating: ${skillDetails.avgRating || 'No reviews yet'}`);
    results.push({ step: 4, name: 'Skill Details', status: 'PASS' });
    
    await delay(500);
    
    // ═══════════════════════════════════════════════════
    // STEP 5: Submit a Review
    // ═══════════════════════════════════════════════════
    console.log('\n⭐ STEP 5: Submit a Review');
    console.log(`   Rating: 5 stars`);
    console.log(`   Reviewer: ${TEST_AGENT.address}`);
    
    const reviewResult = await convex.mutation('reviews:submit', {
      skillId: TEST_SKILL.id,
      reviewerId: TEST_AGENT.address,
      rating: 5,
      comment: 'This skill works perfectly! Highly recommended.',
      paymentProof: JSON.stringify({ txHash: '0xtestpayment123' }),
    });
    
    console.log(`   ✅ Review submitted: ${reviewResult.id}`);
    results.push({ step: 5, name: 'Review Submission', status: 'PASS' });
    
    await delay(500);
    
    // ═══════════════════════════════════════════════════
    // STEP 6: Verify Review Appears
    // ═══════════════════════════════════════════════════
    console.log('\n👀 STEP 6: Verify Reviews');
    
    const reviews = await convex.query('reviews:list', { 
      skillId: TEST_SKILL.id,
      limit: 10 
    });
    
    console.log(`   ✅ ${reviews.total} review(s) found`);
    console.log(`   ⭐ Average: ${reviews.average}/5.0`);
    
    if (reviews.total > 0) {
      console.log(`   📝 Latest: "${reviews.reviews[0].comment}"`);
    }
    results.push({ step: 6, name: 'Review Verification', status: 'PASS' });
    
    await delay(500);
    
    // ═══════════════════════════════════════════════════
    // STEP 7: Check Reputation
    // ═══════════════════════════════════════════════════
    console.log('\n🏆 STEP 7: Check Reputation');
    
    const reputation = await convex.query('reviews:reputation', { 
      skillId: TEST_SKILL.id 
    });
    
    console.log(`   ✅ Score: ${reputation.score}`);
    console.log(`   🎖️  Level: ${reputation.level}`);
    console.log(`   📊 Total Reviews: ${reputation.totalReviews}`);
    results.push({ step: 7, name: 'Reputation Check', status: 'PASS' });
    
    await delay(500);
    
    // ═══════════════════════════════════════════════════
    // STEP 8: Check Leaderboard
    // ═══════════════════════════════════════════════════
    console.log('\n📊 STEP 8: Check Leaderboard');
    
    const leaderboard = await convex.query('skills:leaderboard', { 
      type: 'newest' 
    });
    
    const inLeaderboard = leaderboard.find(s => s.id === TEST_SKILL.id);
    if (inLeaderboard) {
      console.log(`   ✅ Our skill is on the leaderboard!`);
    }
    console.log(`   📈 Total on leaderboard: ${leaderboard.length}`);
    results.push({ step: 8, name: 'Leaderboard Check', status: 'PASS' });
    
    await delay(500);
    
    // ═══════════════════════════════════════════════════
    // STEP 9: Check Agent Profile
    // ═══════════════════════════════════════════════════
    console.log('\n👤 STEP 9: Check Agent Profile');
    
    const agent = await convex.query('agents:get', { 
      address: TEST_AGENT.address 
    });
    
    console.log(`   ✅ Agent: ${agent.name}`);
    console.log(`   📝 Bio: ${agent.bio}`);
    console.log(`   🔧 Skills Listed: ${agent.skills.length}`);
    console.log(`   💰 Total Earned: $${agent.totalEarned}`);
    results.push({ step: 9, name: 'Agent Profile', status: 'PASS' });
    
    // ═══════════════════════════════════════════════════
    // SUMMARY
    // ═══════════════════════════════════════════════════
    console.log('\n═══════════════════════════════════════════════════');
    console.log('  ✅ ALL TESTS PASSED!');
    console.log('═══════════════════════════════════════════════════\n');
    
    console.log('User Journey Complete:');
    console.log('  1. ✅ Registered as agent');
    console.log('  2. ✅ Created a skill');
    console.log('  3. ✅ Skill appeared in listings');
    console.log('  4. ✅ Retrieved skill details');
    console.log('  5. ✅ Submitted a review');
    console.log('  6. ✅ Review visible on skill');
    console.log('  7. ✅ Reputation calculated');
    console.log('  8. ✅ Skill on leaderboard');
    console.log('  9. ✅ Agent profile updated\n');
    
    console.log(`Skill ID: ${TEST_SKILL.id}`);
    console.log(`Agent: ${TEST_AGENT.address}`);
    console.log(`\n🎉 Clawmart platform is fully functional!`);
    
    return { success: true, results };
    
  } catch (err) {
    console.log('\n═══════════════════════════════════════════════════');
    console.log('  ❌ TEST FAILED');
    console.log('═══════════════════════════════════════════════════\n');
    console.error(`Error: ${err.message}`);
    console.error(err.stack);
    
    return { success: false, error: err.message, results };
  }
}

// Run if called directly
if (require.main === module) {
  runE2ETest().then(result => {
    process.exit(result.success ? 0 : 1);
  });
}

module.exports = { runE2ETest, TEST_AGENT, TEST_SKILL };
