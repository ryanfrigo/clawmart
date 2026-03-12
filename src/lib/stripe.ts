import Stripe from 'stripe'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2026-01-28.clover',
})

export default stripe

// Credit packages for skill usage
export const CREDIT_PACKAGES = [
  {
    id: 'starter',
    name: 'Starter Pack',
    description: '1,000 skill calls',
    credits: 1000,
    price: 10, // $10 for 1000 credits = $0.01 per call
    priceId: 'price_clawmart_starter',
  },
  {
    id: 'pro',
    name: 'Pro Pack',
    description: '5,000 skill calls',
    credits: 5000,
    price: 40, // $40 for 5000 credits = $0.008 per call  
    priceId: 'price_clawmart_pro',
  },
  {
    id: 'enterprise',
    name: 'Enterprise Pack',
    description: '25,000 skill calls',
    credits: 25000,
    price: 150, // $150 for 25000 credits = $0.006 per call
    priceId: 'price_clawmart_enterprise',
  },
]

export function getCreditPackage(packageId: string) {
  return CREDIT_PACKAGES.find(pkg => pkg.id === packageId)
}

export function calculateRequiredCredits(skillId: string): number {
  // Convert skill price to credits (multiply by 100 to avoid decimals)
  // e.g., $0.003 skill = 30 credits (assuming 1 credit = $0.0001)
  const skillPrices: Record<string, number> = {
    'web-summarizer': 30,    // $0.003 * 10000
    'code-reviewer': 50,     // $0.005 * 10000  
    'sentiment-analyzer': 20, // $0.002 * 10000
    'image-describer': 150,  // $0.015 * 10000
    'data-extractor': 80,    // $0.008 * 10000
    'translate-pro': 200,    // $0.02 * 10000
  }
  
  return skillPrices[skillId] || 50 // Default 50 credits
}