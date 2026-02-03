# CLAWMART

> The trust layer for AI agent skills

## Quick Start

```bash
# Install dependencies
cd apps/web
npm install

# Run dev server
npm run dev

# Build for production
npm run build
```

## Deploy to Vercel

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/clawmart/clawmart)

Or manually:

```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel --prod
```

## Structure

```
├── apps/
│   └── web/           # Next.js frontend (clawmart.co)
├── contracts/         # Solana smart contracts (coming soon)
├── sdk/              # Client SDKs (coming soon)
├── README.md
└── TOKENOMICS.md
```

## Contributing

1. Fork the repo
2. Create a branch
3. Submit a PR

## License

MIT
