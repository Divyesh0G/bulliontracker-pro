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
- `caddy` container: TLS reverse proxy on ports `80/443`
- Hostname routing for `bulliontracker.home.arpa`

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

App URL (after DNS setup below):

`https://bulliontracker.home.arpa`

### Stop / Restart

```
docker compose down
docker compose up -d
```

### Logs

```
docker compose logs -f web
docker compose logs -f api
docker compose logs -f caddy
```

### Docker Files Included

- `docker-compose.yml`
- `Dockerfile.web`
- `Dockerfile.api`
- `nginx.conf`
- `Caddyfile`
- `.dockerignore`

### Cache Tuning in Docker

You can tune server caches in `docker-compose.yml`:

```
PRICES_CACHE_MS=60000
COMPARISONS_CACHE_MS=86400000
TICKER_CACHE_MS=60000
FX_CACHE_MS=60000
```

### Local DNS Setup (Pi-hole)

In Pi-hole, add a Local DNS A record:

`bulliontracker.home.arpa -> 192.168.20.4`

You can add more app names later on the same IP (for example `notes.home.arpa`, `photos.home.arpa`) and route each name in `Caddyfile`.

### Trust HTTPS Certificate (One-time per Device)

Because this is a local/private hostname, Caddy uses an internal CA. To remove browser "Not secure" warning, trust Caddy root certificate on each client device.

1. Export certificate from container:

```
docker cp bulliontracker-caddy:/data/caddy/pki/authorities/local/root.crt ./caddy-root.crt
```

2. Import `caddy-root.crt` into trusted root store on your device.

After this, open:

`https://bulliontracker.home.arpa`

## Deploy (Simple)

Serve `dist/` with any static host and run the API server separately:

```
node server/index.mjs
```

If you are deploying to a Raspberry Pi with DietPi, you can use Nginx for `dist/` and run the API as a systemd service. I can provide a production deployment script on request.
