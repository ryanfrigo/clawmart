# First Agent Skill for ClawMart: VoiceCharm AI Receptionist API

## Skill Definition

**Name**: VoiceCharm AI Receptionist
**Endpoint**: `https://api.voicecharm.ai/x402/receptionist-call`
**Price**: $0.25 per call handling request
**Category**: Voice AI / Customer Service

## Description

Professional AI receptionist that handles inbound calls with natural conversation, appointment booking, and lead qualification. Specifically trained for home services, medical practices, and professional services.

## API Specification

```http
POST https://api.voicecharm.ai/x402/receptionist-call
Content-Type: application/json
Authorization: Bearer x402_payment_required

{
  "business_name": "Ryan's HVAC",
  "business_type": "hvac",
  "phone_number": "+15551234567",
  "service_area": "Oakland, CA",
  "services": ["heating repair", "ac installation", "maintenance"],
  "calendar_url": "https://calendly.com/ryanhvac",
  "emergency_number": "+15559876543",
  "business_hours": {
    "monday": "8:00-18:00",
    "tuesday": "8:00-18:00",
    // ... etc
  }
}
```

## Response Format

```json
{
  "call_id": "call_abc123",
  "status": "handled",
  "duration": "3m 45s",
  "outcome": "appointment_booked",
  "transcript": "...",
  "customer_info": {
    "name": "Sarah Johnson",
    "phone": "+15551239999",
    "email": "sarah@email.com",
    "address": "123 Main St, Oakland CA"
  },
  "appointment": {
    "service": "AC Repair",
    "date": "2026-03-15",
    "time": "10:00",
    "notes": "Unit not cooling, urgent"
  },
  "follow_up_sent": true
}
```

## Use Cases

- **Service Businesses**: Handle customer inquiries and book appointments
- **Medical Practices**: Patient scheduling with HIPAA compliance
- **Professional Services**: Lead qualification and consultation booking
- **After-Hours Coverage**: 24/7 customer service without human staff

## Integration Example

```javascript
// Agent calls the VoiceCharm skill via x402
const response = await fetch('https://api.voicecharm.ai/x402/receptionist-call', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    business_name: 'ABC Plumbing',
    business_type: 'plumbing',
    phone_number: '+15551234567',
    // ... other config
  })
});

// If 402 Payment Required, agent pays and retries
if (response.status === 402) {
  const paymentInfo = await response.json();
  await payWithUSDC(paymentInfo.amount, paymentInfo.address);
  // Retry the request...
}

const result = await response.json();
console.log('Call handled:', result);
```

## Performance Metrics

- **Response Time**: <2 seconds
- **Uptime**: 99.9%
- **Success Rate**: 95%+ call resolution
- **Customer Satisfaction**: 4.8/5 average rating

## Pricing Model

- **Base Rate**: $0.25 per call handling request
- **Duration-based**: +$0.05 per minute over 5 minutes
- **Success Bonus**: -$0.10 if appointment booked
- **Volume Discounts**: 10% off for 100+ calls/month

## Getting Started

1. Test the API with the live demo endpoint
2. Configure your business profile and integrations
3. Set up x402 payment wallet with USDC on Base
4. Start routing calls to your AI receptionist

---

# Additional Skills to Add

## 1. Web Scraping Skill
**Name**: Scrapling Pro Scraper
**Endpoint**: `https://api.scrapling.com/x402/scrape`
**Price**: $0.02 per page scraped
**Description**: Bypass Cloudflare and anti-bot systems, adaptive parsing

## 2. Content Generation Skill
**Name**: SEO Blog Writer
**Endpoint**: `https://api.content-ai.com/x402/blog-post`
**Price**: $2.50 per 1000 words
**Description**: SEO-optimized blog posts with research and citations

## 3. Image Generation Skill
**Name**: Nano Banana Pro Images
**Endpoint**: `https://api.nanobana.com/x402/generate`
**Price**: $0.15 per image
**Description**: High-quality image generation with Gemini 3 Pro

## 4. Code Review Skill
**Name**: Claude Code Reviewer
**Endpoint**: `https://api.claude-code.com/x402/review`
**Price**: $0.50 per review
**Description**: Professional code review with security analysis

## 5. Data Analysis Skill
**Name**: Cortex Insights
**Endpoint**: `https://api.cortex-ai.com/x402/analyze`
**Price**: $1.00 per analysis
**Description**: Statistical analysis and insights generation

## Implementation Strategy

1. **Start with VoiceCharm skill** - Proven, valuable service
2. **Add 2-3 complementary skills** - Cover different agent needs
3. **Test x402 payment flow** - Ensure frictionless micropayments
4. **Gather usage data** - Optimize pricing and performance
5. **Scale to 20+ skills** - Build comprehensive marketplace

## Success Metrics

- **First transaction within 7 days**
- **10 different agents using skills within 30 days**
- **$1,000+ in monthly skill revenue within 90 days**
- **50+ skills listed within 6 months**