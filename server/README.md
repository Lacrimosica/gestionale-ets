# Backend ETS Gestionale

This module contains the serverless backend infrastructure for the Third Sector organization management system (ETS), fully based on the Cloudflare ecosystem.

## Stack
- Cloudflare Workers (Serverless runtime)
- Cloudflare D1 (Distributed SQLite database)
- Hono (Edge/serverless web framework)
- Drizzle ORM (Strongly-typed db D1 validation and queries)

## Prerequisites
- Node.js and npm
- Wrangler CLI (used by npm commands for local Cloudflare emulation)

## Installation

From `/server`:
```bash
npm install
```

## Available Scripts

In `package.json` the essential commands are configured for web development and database management:

- `npm run dev`: Starts local development server using Wrangler. Emulates Cloudflare Workers and local D1.
- `npm run db:generate`: Uses Drizzle to read table definitions in code and generate migration SQL files.
- `npm run db:migrate`: Applies generated database migrations to local D1 (Wrangler emulated).
- `npm run db:migrate:remote`: Applies migrations directly to production Cloudflare D1.
- `npm run deploy`: Deploys the latest Worker + APIs to production on Cloudflare.

## Production Setup

For first production deploy, configure secrets/env vars in Cloudflare:

1. Create D1 database:
   ```bash
   npx wrangler d1 create deb-gestionale-db
   ```
   Copy `database_id` into `wrangler.toml`.

2. Set secrets:
   ```bash
   npx wrangler secret put JWT_SECRET
   ```
   Enter a long random string.

3. Optional CORS:
   If frontend is on specific domain, set in `wrangler.toml` under `[vars]` or Cloudflare dashboard as `CORS_ORIGIN`.

## Architecture Notes
- Avoid Node.js-specific libraries (`fs`, `path`) because code runs inside Cloudflare Workers V8 isolate.
- D1 uses SQLite syntax/limitations.

