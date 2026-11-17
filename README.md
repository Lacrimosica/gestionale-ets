# Gestionale ETS — Volunteer & Member Management Platform

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

A full-stack web application for managing volunteer-based organizations and non-profits, designed to track member/volunteer tenure, board governance, assemblies, and compliance documentation in alignment with Italian law (Codice del Terzo Settore, D.Lgs. 117/2017).

**Live Demo:** [demo.gestionale-ets.pages.dev](https://demo.gestionale-ets.pages.dev) — sign in with `demo@example.org` / `demo-gestionale`, or create your own organization. All data is fictional and is wiped and recreated every night at 03:00 UTC; please don't enter real personal data.

---

## Table of Contents

- [Overview](#overview)
- [Key Features](#key-features)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Quick Start](#quick-start)
- [Configuration](#configuration)
- [API Routes](#api-routes)
- [Development Guide](#development-guide)
- [Deployment](#deployment)
- [Architecture & Design](#architecture--design)
- [License](#license)

---

## Overview

**Gestionale ETS** (ETS = Ente del Terzo Settore, Italian non-profit legal classification) is a production-grade platform for managing the administrative and governance backbone of voluntary organizations:

- **Multi-tenant SaaS:** Support for unlimited organizations with complete data isolation
- **Compliance-first:** Built to satisfy Italian nonprofit governance law and GDPR requirements
- **Document generation:** Auto-generate convocation notices and meeting minutes with customizable templates
- **Audit trail:** Comprehensive logging of all administrative actions
- **Google Workspace integration:** Sync documents to Drive, use templates for generation

### Problem Solved

Managing volunteers, membership, board elections, assemblies, and statutory compliance is complex. Spreadsheets don't scale; existing solutions are expensive or non-compliant with Italian law. Gestionale ETS consolidates:
- Volunteer registry & timesheet tracking
- Member admission/resignation workflows
- Board generation & elections
- Assembly convocations, attendance, & minutes
- Statutory compliance documents & consent tracking

---

## Key Features

### 📋 Core Management

- **People Directory** — Add/edit/archive people with full personal details, contact info, tax ID validation
- **Volunteer Registry** — ISO 8601 enrollment/exit dates, status tracking (active/suspended/resigned)
- **Member Book** — Track admission (with assembly reference), resignation reasons, article citations
- **Board Terms** — Define board generations with start/end dates; assign members to roles (president, treasurer, secretary, etc.)

### 🏛️ Governance & Assemblies

- **Assembly Management** — Create ordinary/extraordinary/constituent assemblies with two-call system support
- **Convocation System** — Generate formal notices with customizable modality formulas
- **Attendance Tracking** — Record presence (in-person/remote/proxy) with delegation limits
- **Agenda Builder** — Create agenda items with workflow support (member admission, board election, budget approval, etc.)
- **Minutes Generation** — Auto-generate meeting minutes from assembled data; upload to Google Drive as PDF/Docs

### 🔐 Compliance & GDPR

- **Consent Records** — Track explicit consent/withdrawal for data uses with policy versioning
- **Compliance Documents** — Manage signed documents (privacy policies, waivers, agreements) with version control
- **Document Flags** — Auto-identify missing signatures, expired agreements, incomplete documentation
- **Audit Logging** — Immutable event log of who did what, when, and from which IP
- **Role-Based Access** — Roles (`core_admin`, `admin`, `manager`, `viewer`) plus per-user permissions; nobody can grant a role or permission above their own

### 🌐 Multi-Tenant & Deployment

- **Flexible Deployment Modes:**
  - `single_org` — Self-hosted for one organization
  - `open` — Public SaaS with unrestricted signup
  - `invite_only` — Controlled multi-tenant (invitations required)
  - `closed` — Locked down (no new organization creation)

- **Setup Wizard** — First-time users guided through organization setup with persistent localStorage
- **Google OAuth** — Single-sign-on with optional password fallback
- **Invite System** — Email invitations with expiring tokens; role assignment

### 📊 Analytics & Exports

- **Dashboard** — Quick stats (active volunteers, members, upcoming assemblies), deadline alerts
- **Historical Snapshots** — View membership/volunteers as of any date for quorum verification
- **Backup & Restore** — Export an organization's data as a ZIP of TSV files and import it back

---

## Tech Stack

| Layer | Technology | Purpose |
|-------|-----------|---------|
| **Frontend** | React 18 + TypeScript | Type-safe UI components |
| | Vite | Fast development & bundling |
| | TailwindCSS | Utility-first styling |
| | Zod | Runtime schema validation |
| **Backend** | Cloudflare Workers | Serverless compute |
| | Hono | Minimal, type-safe HTTP framework |
| | Drizzle ORM | Type-safe database access |
| **Database** | Cloudflare D1 | SQLite at edge |
| **Auth** | Google OAuth 2.0 | Single-sign-on |
| | JWT (HS256) | Session tokens |
| **Infrastructure** | Cloudflare Pages | CDN + edge compute |
| | Google Workspace API | Document generation (Docs → PDF) |

---

## Project Structure

```
gestionale-ets/
├── client/                       # React SPA frontend
│   ├── src/
│   │   ├── components/           # Reusable UI components
│   │   ├── pages/                # Page-level components (routing)
│   │   ├── hooks/                # Custom React hooks
│   │   ├── lib/                  # Utilities (API client, date helpers)
│   │   ├── types/                # Shared TypeScript types
│   │   ├── App.tsx               # Main app layout
│   │   └── index.css             # Global styles
│   ├── index.html
│   ├── vite.config.ts
│   └── package.json
│
├── server/                       # Cloudflare Workers backend
│   ├── src/
│   │   ├── db/schema.ts          # Drizzle table definitions
│   │   ├── routes/               # Hono route handlers (people, assemblies, auth, ...)
│   │   ├── lib/                  # Business logic (org-context, roles, retention, ...)
│   │   ├── services/             # Google Drive / Docs clients
│   │   ├── workflows/            # Document generation workflows
│   │   ├── demo-reset.ts         # Nightly reset worker for the public demo
│   │   └── index.ts              # Hono app, auth and session middleware
│   ├── drizzle/
│   │   ├── migrations/           # SQL migrations: dev/, staging/, prod/
│   │   ├── seeds/
│   │   │   ├── common/           # Lookup tables (all environments)
│   │   │   └── demo/             # Fictional demo data (generated)
│   │   └── snapshot/             # Canonical schema state
│   ├── scripts/                  # generate-demo-seed.mjs
│   ├── tests/                    # unit/ and integration/ (Vitest + Miniflare)
│   ├── wrangler.toml             # Workers config (top level = production)
│   ├── wrangler.demo-reset.toml  # Demo reset worker config
│   └── package.json
│
├── DATABASE.md                   # Complete schema documentation
├── DEPLOYMENT.md                 # Production deployment guide
├── CLAUDE.md                     # Development instructions for agents
├── README.md                     # This file
└── package.json                  # Root monorepo config

```

---

## Quick Start

### Prerequisites

- Node.js 18+
- npm or pnpm
- Cloudflare account (for production deployment)
- Google OAuth credentials (for authentication)

### Local Development Setup

1. **Clone and install:**
   ```bash
   git clone https://github.com/Lacrimosica/gestionale-ets.git
   cd gestionale-ets
   npm install                # npm workspaces: installs client and server
   ```

2. **Create environment file:**
   ```bash
   cd server
   cp .dev.vars.example .dev.vars
   # Edit .dev.vars with your JWT_SECRET and CORS_ORIGIN.
   # DEPLOYMENT_MODE=open here lets the local setup wizard create orgs freely.
   ```

3. **Start development servers:**
   ```bash
   # Terminal 1: Backend
   cd server
   npm run dev                # Starts on http://localhost:8787

   # Terminal 2: Frontend
   cd client
   npm run dev                # Starts on http://localhost:5173
   ```

4. **Access the app:**
   - Open http://localhost:5173 in your browser
   - Complete the setup wizard to create your first organization
   - Log in with Google OAuth or email/password

### Database Reset

To clear the local database and re-run all migrations + seed data:
```bash
cd server
npm run db:reset:local
```

---

## Configuration

### Environment Variables

All configuration is managed via environment variables and the database. See `.dev.vars.example`:

#### `.dev.vars` (Local Development)

```env
JWT_SECRET=your-local-secret-key-change-in-production
CORS_ORIGIN=http://localhost:5173
DEPLOYMENT_MODE=open
```

#### `wrangler.toml` (Deployed Environments)

The **top-level** config is what production deploys, so keep it on the production mode.
Local-only overrides belong in `.dev.vars`, which `wrangler dev` reads on top of it.

```toml
[vars]
DEPLOYMENT_MODE = "single_org"  # single_org, open, invite_only, or closed
```

Staging and demo use `[env.staging]` and `[env.demo]` sections.

### Deployment Modes

| Mode | Use Case | Signup | Multi-Org | Notes |
|------|----------|--------|-----------|-------|
| `single_org` | Self-hosted | ✗ | ✗ | Single org; no public signup |
| `open` | Public SaaS | ✓ | ✓ | Anyone can create org |
| `invite_only` | Controlled | ✗ | ✓ | Invitations required |
| `closed` | Locked | ✗ | ✗ | Admin creates orgs only |

For production setup, see [DEPLOYMENT.md](./DEPLOYMENT.md).

---

## API Routes

All routes live under `/api`. The organization always comes from the signed-in
session, never from the URL or request body, and every query is scoped to it.

| Prefix | Purpose |
|---|---|
| `/api/auth` | Password and Google login, invites, Drive authorization |
| `/api/setup` | First-run setup wizard (`GET /status`, `GET /token`, `POST /`) |
| `/api/people` | People directory, tax-code checks, linked user accounts |
| `/api/periods` | Volunteer and member periods |
| `/api/generations` | Board terms and board members |
| `/api/assemblies` | Assemblies, attendance, eligible members |
| `/api/convocations` | Convocations and agenda items |
| `/api/documents` | Document generation and generation history |
| `/api/compliance` | Compliance roles, documents, consents, rules, retention |
| `/api/timeline` | Membership timeline |
| `/api/settings` | Users, branding, addresses, document templates |
| `/api/export`, `/api/import` | Organization backup (ZIP of TSV files) and restore |

Everything except `/api/auth`, `/api/setup` and `/health` requires a session token.
For details, see the route handlers in `server/src/routes/`.

---

## Development Guide

### TypeScript & Type Safety

Both frontend and backend use strict TypeScript. Run type checking:
```bash
npm run typecheck
```

All code identifiers, comments, and documentation are in **English** (Italian reserved for user-facing UI strings only).

### Database Migrations

When you modify the schema:

1. Edit `server/src/db/schema.ts`
2. Generate migration:
   ```bash
   cd server
   npm run db:generate
   ```
3. Test locally:
   ```bash
   npm run db:migrate
   npm run dev
   ```
4. Commit both `schema.ts` and the new migration file
5. Deploy:
   ```bash
   npm run db:migrate:staging
   npm run db:migrate:production
   ```

See [server/drizzle/CLAUDE.md](server/drizzle/CLAUDE.md) for detailed migration workflows.

### Code Style

- **Identifiers:** camelCase in TS, snake_case in SQL
- **Comments:** Explain *why*, not *what* (good naming speaks for itself)
- **No premature abstraction:** Three similar lines is fine; don't abstract early
- **Error handling:** Only validate at system boundaries (user input, external APIs)

### Testing

```bash
cd server
npx vitest run tests/unit        # pure logic: roles, retention, Google identity, ...
npm run test:integration         # real routes against a local D1 (Miniflare)
```

`tests/integration/tenant-isolation-http.test.ts` sends real requests with one
organization's session against another organization's data; every route that
reads or writes org data should have a case there.

A few older integration suites (rate limiting, invite races, some migration checks)
currently fail and are pending a fix.

---

## Deployment

### Demo Environment

The public demo runs separately from staging, with its own worker, database and nightly reset:

```bash
cd server
npm run deploy:demo          # API worker (gestionale-server-demo, [env.demo])
npm run deploy:demo-reset    # nightly reset worker (wrangler.demo-reset.toml)
npm run demo:seed:generate   # regenerate drizzle/seeds/demo/01_demo_data.sql
cd ../client
npm run deploy:demo          # frontend on demo.gestionale-ets.pages.dev
```

### Staging Environment

Staging is for pre-production testing and is `closed` (no public signups):

```bash
npm run deploy:staging           # backend + frontend
npm run db:migrate:staging       # staging migrations
```

### Production Deployment

The production worker (`gestionale-server`) **deploys automatically on every push to
`main`** (Cloudflare Workers Builds). To deploy by hand, or after migrations:

```bash
npm run db:migrate:production    # run migrations first; never auto-migrated
npm run deploy:production        # backend (gestionale-server) + frontend
```

Don't run `wrangler deploy --env production`: it creates a separate
`gestionale-server-production` worker instead of updating production.

For the pre-flight checklist and rollback procedures, see [DEPLOYMENT.md](./DEPLOYMENT.md).

---

## Architecture & Design

### Multi-Tenancy

Every table has an `org_id` column (indexed) for organization isolation:
- The org id comes from the verified session; handlers use `orgContext()` (`server/src/lib/org-context.ts`) to scope queries
- Ids taken from a request body are checked with `ownedByOrg()` before they are stored or linked
- Update bodies cannot set server-owned fields (`id`, `orgId`, `createdAt`)
- Row-level security is enforced at the application layer (D1 lacks native RLS)

### Schema Normalization (Phase 1-5)

The database went through a systematic enum-to-lookup refactor:

1. **Phase 1-2:** Created lookup tables for assembly types, statuses, modes, etc.
2. **Phase 3:** Migrated volunteer status & attendance modes to FKs
3. **Phase 4:** Migrated compliance enums (document types, consent statuses, roles)
4. **Phase 5:** Renamed Italian columns to English; maintained backward compatibility

**Current State:** All lookups use foreign keys. Old text columns remain for backward compatibility (will be removed in v2.0).

### JWT & Session Management

- **Token:** HS256 JWT signed with `JWT_SECRET`
- **Payload:** `{ sub, email, orgId, role, permissions, exp }`
- **Expiry:** 24 hours
- **Validation:** On every protected request the middleware checks the membership still exists and reloads role and permissions from the database, so demotions and removals apply immediately

### Document Generation

- **Templates:** Google Docs templates stored in org settings
- **Process:** 
  1. User clicks "Generate Convocation"
  2. API fetches template, injects data (assembly info, people, etc.)
  3. Google Docs API creates a copy with replacements
  4. Export to PDF and save link
  5. Audit log records generation event
- **Storage:** Document URLs stored in `documentGenerationLog`

### Error Handling

- **Input validation:** Zod schemas at route handlers
- **Business logic errors:** Custom error classes with status codes
- **Database errors:** Caught and wrapped in meaningful messages
- **Logging:** All errors logged to `auditEvent` table

---

## Security Considerations

### Authentication
- ✅ Google OAuth 2.0; sign-in requires a verified Google email matching the linked account
- ✅ Password hashing with PBKDF2-SHA256 (100,000 iterations), constant-time comparison
- ✅ Session, membership, role and permissions validated on every request
- ✅ Setup requires a short-lived setup token and writes the new organization atomically
- ⚠️ No rate limiting on login or setup yet

### Data Protection
- ✅ HTTPS only (Cloudflare enforces)
- ✅ CORS restricted to the configured origin
- ✅ SQL injection prevention (Drizzle ORM / parameterized queries)
- ✅ XSS protection (React auto-escapes content)
- ✅ Exports neutralise spreadsheet formulas (CSV/TSV injection)

### Compliance
- ✅ GDPR: consent tracking, retention flags, audit log
- ✅ Italian law: volunteer registry, member book, assembly tracking per D.Lgs. 117/2017
- ✅ Multi-tenant isolation enforced in every route, with HTTP-level isolation tests

### Reporting a Vulnerability

Please report security issues privately by email (see [Support & Contact](#support--contact))
rather than in a public issue.

---

## Roadmap

- [ ] Real-time collaboration on assemblies (WebSockets)
- [ ] Email notifications for pending documents
- [ ] Rate limiting on login and setup
- [ ] Advanced reporting & analytics
- [ ] Mobile app (React Native)
- [ ] SAML/LDAP SSO for enterprise deployments
- [ ] Offline-first sync (PWA)

---

## Contributing

Contributions are welcome! Please:

1. Fork the repository
2. Create a feature branch: `git checkout -b feat/amazing-feature`
3. Follow the code style guide (see [CLAUDE.md](./CLAUDE.md))
4. Run type checking: `npm run typecheck`
5. Commit with semantic messages (e.g., `feat(auth): add SSO support`)
6. Push and open a pull request

---

## License

This project is licensed under the MIT License. See [LICENSE](./LICENSE) for details.

---

## Support & Contact

- **Issues:** [GitHub Issues](https://github.com/Lacrimosica/gestionale-ets/issues)
- **Email:** m.gdrzi77@gmail.com
- **Docs:** See [DEPLOYMENT.md](./DEPLOYMENT.md), [DATABASE.md](./DATABASE.md), [CLAUDE.md](./CLAUDE.md)

---

## Acknowledgments

Built with ❤️ for the Italian non-profit sector. Inspired by the complex governance requirements of Enti del Terzo Settore (D.Lgs. 117/2017) and conversations with volunteer organizations struggling to manage administration at scale.

---

**Last Updated:** November 2026  
**Version:** 0.1.0  
**Status:** Active Development (Production Ready)
