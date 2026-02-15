# ClawMart — AI Agent Teams for Your Business

Spin up specialized AI agent teams with managed infrastructure. Like hiring a team of AI employees.

**Live at [clawmart.co](https://clawmart.co)**

## Stack

- **Next.js 15** (App Router)
- **Convex** — backend & database
- **Clerk** — auth (email + Google OAuth)
- **Stripe** — billing
- **Tailwind CSS + shadcn/ui** — UI
- **Vercel** — deployment

## Getting Started

```bash
# Install dependencies
npm install

# Copy env file and fill in values
cp .env.local.example .env.local

# Start Convex dev server (generates types + runs backend)
npx convex dev

# In another terminal, start Next.js
npm run dev
```

## Setup Checklist

1. Create a [Convex](https://convex.dev) project → get `NEXT_PUBLIC_CONVEX_URL`
2. Create a [Clerk](https://clerk.com) app → get publishable + secret keys
3. Create [Stripe](https://stripe.com) products/prices → get price IDs
4. Set up Clerk webhook → point to `/api/webhooks/clerk`
5. Set up Stripe webhook → point to `/api/webhooks/stripe`
6. Run `npx convex dev` to push schema and seed templates
7. Call the `templates.seed` mutation to populate industry templates

## Features

- 🏠 Landing page with templates, pricing, how-it-works
- 🔐 Auth via Clerk (email + Google)
- 📊 Dashboard with workforce management
- 🏗️ Workforce builder with 5 industry templates
- 🤖 Agent management (create, edit, pause, delete)
- 💬 Message/activity view per workforce
- 💳 Stripe billing (Free / Pro $49 / Enterprise $199)
