# BullionTracker Pro

BullionTracker Pro is a modern bullion portfolio tracker with live spot pricing, seller comparisons, and performance analytics.

## Features

- Live spot prices (USD/AUD/INR) from Yahoo Finance
- Seller comparison cards with AUD pricing and currency conversion
- Portfolio tracking with profit/loss stats
- Daily cached seller data with fast UI refresh
- Docker deployment for Raspberry Pi / DietPi

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

## Additional Feature: Docker Deployment (DietPi / Raspberry Pi)

This project includes a production-ready Docker setup:

- `web` container: builds Vite and serves static files via Nginx
- `api` container: runs `server/index.mjs` on port `8787`
- Nginx reverse proxy routes `/api/*` from `web` to `api`

### Docker Prerequisites

- Docker Engine
- Docker Compose plugin

On DietPi, install Docker from `dietpi-software`, then verify:

```
docker --version
docker compose version
```

### Start with Docker

Run from project root:

```
docker compose up -d --build
```

App URL:

`http://<your-pi-ip>:3000`

### Stop / Restart

```
docker compose down
docker compose up -d
```

### Logs

```
docker compose logs -f web
docker compose logs -f api
```

### Docker Files Included

- `docker-compose.yml`
- `Dockerfile.web`
- `Dockerfile.api`
- `nginx.conf`
- `.dockerignore`

### Cache Tuning in Docker

You can tune server caches in `docker-compose.yml`:

```
PRICES_CACHE_MS=60000
COMPARISONS_CACHE_MS=86400000
TICKER_CACHE_MS=60000
FX_CACHE_MS=60000
```

## Deploy (Simple)

Serve `dist/` with any static host and run the API server separately:

```
node server/index.mjs
```

If you are deploying to a Raspberry Pi with DietPi, you can use Nginx for `dist/` and run the API as a systemd service. I can provide a production deployment script on request.
