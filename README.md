<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# BullionTracker Pro

BullionTracker Pro is a modern bullion portfolio tracker with live spot pricing, seller comparisons, and performance analytics.

## Features

- Live spot prices (USD/AUD/INR) from Yahoo Finance
- Seller comparison cards with AUD pricing and currency conversion
- Portfolio tracking with profit/loss stats
- Daily cached seller data with fast UI refresh

## Tech Stack

- React + Vite
- Node.js API server
- Yahoo Finance market data

## Prerequisites

- Node.js 18+ (LTS recommended)
- npm

## Quick Start (Local Development)

1. Install dependencies:
   `npm install`
2. Start the API server:
   `npm run dev:api`
3. Start the frontend:
   `npm run dev`

Or run both together:
`npm run dev:all`

Open the app at `http://localhost:3000`.

## Environment Variables

Create a `.env.local` in the project root (kept out of git) if you want AI analysis:

```
GEMINI_API_KEY=your_api_key_here
```

## API Endpoints

- `GET /api/prices` - Live spot prices (USD, AUD, INR)
- `GET /api/fx` - FX rates used for conversions
- `GET /api/comparisons` - Seller offers (AUD)

## Cache Configuration

Cache values are centralized in `server/index.mjs` and can be overridden via environment variables:

```
PRICES_CACHE_MS=60000
COMPARISONS_CACHE_MS=86400000
TICKER_CACHE_MS=60000
FX_CACHE_MS=60000
```

## Build for Production

```
npm run build
```

This creates a static build in `dist/`.

## Deploy (Simple)

Serve `dist/` with any static host and run the API server separately:

```
node server/index.mjs
```

If you are deploying to a Raspberry Pi with DietPi, you can use Nginx for `dist/` and run the API as a systemd service. I can provide a production deployment script on request.
