# Gestionale ETS — Volunteer & Member Management Platform

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

A full-stack web application for managing volunteer-based organizations and non-profits, designed to track member/volunteer tenure, board governance, assemblies, and compliance documentation in alignment with Italian law (Codice del Terzo Settore, D.Lgs. 117/2017).

**Live Demo:** [staging.gestionale-ets.pages.dev](https://staging.gestionale-ets.pages.dev)

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
- **Role-Based Access** — Fine-grained permissions (admin, editor, viewer) per user/org

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
- **Data Export** — Download volunteer list, member book, assembly records as CSV/JSON
- **Rate Limiting** — Protect setup endpoint from brute force

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
│   │   ├── db/
│   │   │   ├── schema.ts         # Drizzle table definitions
│   │   │   └── index.ts          # DB connection utilities
│   │   ├── routes/               # Hono route handlers
│   │   │   ├── auth.ts
│   │   │   ├── people.ts
│   │   │   ├── assemblies.ts
│   │   │   └── ... (other routes)
│   │   ├── middleware/           # Auth, error handling, CORS
│   │   ├── lib/                  # Business logic helpers
│   │   └── index.ts              # Hono app setup
│   ├── drizzle/
│   │   ├── migrations/           # SQL migration files (versioned)
│   │   │   ├── dev/              # Local development
│   │   │   ├── staging/          # Staging environment
│   │   │   └── production/       # Production environment
│   │   ├── seeds/                # Seed data (enum lookups, test data)
│   │   └── snapshot/             # Canonical schema state
│   ├── wrangler.toml             # Cloudflare Workers config
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
   git clone <repo-url>
   cd gestionale-ets
   npm install
   cd client && npm install
   cd ../server && npm install
   ```

2. **Create environment file:**
   ```bash
   cd server
   cp .dev.vars.example .dev.vars
   # Edit .dev.vars with your JWT_SECRET and CORS_ORIGIN
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
```

#### `wrangler.toml` (Build Configuration)

```toml
[vars]
DEPLOYMENT_MODE = "open"  # single_org, open, invite_only, or closed
```

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

The backend provides RESTful JSON APIs under `/api/v1/`:

### Authentication
- `POST /api/auth/google` — Google OAuth callback
- `POST /api/auth/login` — Email/password login
- `POST /api/auth/logout` — Invalidate session
- `GET /api/auth/me` — Current user info

### Organizations
- `GET /api/orgs` — List user's organizations
- `POST /api/orgs` — Create organization (if signup enabled)
- `GET /api/orgs/{orgId}` — Org details
- `PATCH /api/orgs/{orgId}/settings` — Update settings

### People
- `GET /api/orgs/{orgId}/people` — List people
- `POST /api/orgs/{orgId}/people` — Create person
- `GET /api/orgs/{orgId}/people/{personId}` — Person details
- `PATCH /api/orgs/{orgId}/people/{personId}` — Update person
- `DELETE /api/orgs/{orgId}/people/{personId}` — Archive person

### Assemblies
- `GET /api/orgs/{orgId}/assemblies` — List assemblies
- `POST /api/orgs/{orgId}/assemblies` — Create assembly
- `PATCH /api/orgs/{orgId}/assemblies/{assemblyId}` — Update assembly
- `POST /api/orgs/{orgId}/assemblies/{assemblyId}/generate-documents` — Generate convocation/minutes

### Volunteers & Members
- `GET /api/orgs/{orgId}/people/{personId}/volunteer-periods` — Volunteer history
- `POST /api/orgs/{orgId}/people/{personId}/volunteer-periods` — Enroll volunteer
- `GET /api/orgs/{orgId}/people/{personId}/member-periods` — Member history
- `POST /api/orgs/{orgId}/people/{personId}/member-periods` — Admit as member

### Compliance
- `GET /api/orgs/{orgId}/compliance/documents` — List documents
- `POST /api/orgs/{orgId}/compliance/documents` — Create document record
- `PATCH /api/orgs/{orgId}/compliance/documents/{docId}` — Update document

All routes require authentication. Organization access is scope-checked (org_id isolation).

For full API specification, see route handlers in `server/src/routes/`.

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
npm test
```

Project currently focuses on integration tests. Unit tests are welcome via PR.

---

## Deployment

### Staging Environment

Test schema changes and features on staging before production:

```bash
# Deploy backend & frontend to staging
npm run deploy:staging

# Run migrations on staging DB
npm run db:migrate:staging
```

### Production Deployment

**⚠️ Production requires careful coordination:**

1. **Test on staging first** — Always validate on staging
2. **Run migrations** — Never auto-migrate production
3. **Deploy services:**
   ```bash
   npm run db:migrate:production
   npm run deploy:production
   ```
4. **Verify** — Check live app, monitor logs

For detailed pre-flight checklist and rollback procedures, see [DEPLOYMENT.md](./DEPLOYMENT.md).

---

## Architecture & Design

### Multi-Tenancy

Every table has an `org_id` column (indexed) for organization isolation:
- Queries always filter by `org_id`
- Users can only access data within their assigned organizations
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
- **Payload:** `{ userId, orgId, iat, exp }`
- **Expiry:** 7 days (configurable)
- **Validation:** Middleware validates token on every protected route + checks user still exists in DB (prevents stale sessions after user deletion)

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
- ✅ Google OAuth 2.0 (delegated to Google's infrastructure)
- ✅ Rate-limited setup endpoint (max 5 attempts/IP/hour)
- ✅ CSRF tokens for state-changing operations
- ✅ Password hashing (bcrypt, 12 rounds)
- ✅ Session validation on every request

### Data Protection
- ✅ HTTPS only (Cloudflare enforces)
- ✅ CORS headers (restricted to configured origin)
- ✅ SQL injection prevention (Drizzle ORM parameterized queries)
- ✅ XSS protection (React auto-escapes content)
- ✅ Audit logging (all state changes recorded)

### Compliance
- ✅ GDPR: Consent tracking, right to deletion (via soft-delete), audit log
- ✅ Italian Law: Volunteer registry, member book, assembly tracking per D.Lgs. 117/2017
- ✅ Data isolation: Complete multi-tenant separation

---

## Roadmap

- [ ] Real-time collaboration on assemblies (WebSockets)
- [ ] Email notifications for pending documents
- [ ] Bulk import from CSV
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

- **Issues:** [GitHub Issues](https://github.com/yourusername/gestionale-ets/issues)
- **Email:** m.gdrzi77@gmail.com
- **Docs:** See [DEPLOYMENT.md](./DEPLOYMENT.md), [DATABASE.md](./DATABASE.md), [CLAUDE.md](./CLAUDE.md)

---

## Acknowledgments

Built with ❤️ for the Italian non-profit sector. Inspired by the complex governance requirements of Enti del Terzo Settore (D.Lgs. 117/2017) and conversations with volunteer organizations struggling to manage administration at scale.

---

**Last Updated:** May 2026  
**Version:** 0.1.0  
**Status:** Active Development (Production Ready)
