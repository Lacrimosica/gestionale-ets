# Gestionale ETS — Project Context for Claude Agents

This document provides essential context for Claude and other agents working on this project. It complements language model training and helps maintain consistency across sessions.

## What Is This Project?

**Gestionale ETS** is a full-stack web application for managing volunteer-based organizations (ETS = Ente del Terzo Settore, Italian non-profit legal classification).

Key features:
- Member and volunteer management (onboarding, roles, periods)
- Board term / governance tracking
- Assembly/meeting management (agenda, attendance, minutes)
- Consent/compliance document tracking (GDPR)
- Multi-tenant organization support

**Tech Stack:**
- **Frontend:** React + TypeScript (Vite)
- **Backend:** Hono (TypeScript) on Cloudflare Workers
- **Database:** SQLite via Cloudflare D1
- **ORM:** Drizzle ORM
- **Auth:** Google OAuth + JWT + custom password gate

## Project Structure

```
.
├── client/                 # React frontend (Vite)
├── server/                 # Hono backend (Cloudflare Workers)
│   ├── src/
│   │   ├── db/            # Schema & database utilities
│   │   ├── routes/        # HTTP route handlers
│   │   ├── middleware/    # Auth, error handling
│   │   └── index.ts       # App entry point
│   ├── drizzle/           # Database migrations & seeds
│   │   ├── migrations/    # Schema DDL
│   │   ├── seeds/         # Test fixtures & reference data
│   │   └── snapshot/      # Canonical schema snapshot
│   ├── wrangler.toml      # Cloudflare Workers config
│   └── package.json       # Server dependencies
├── SCHEMA_NORMALIZATION_PLAN.md
├── PHASE_3_IMPLEMENTATION.md
├── DEPLOYMENT.md
└── CLAUDE.md              # This file
```

## Code Style & Conventions

### Language
**All code identifiers, comments, and documentation in English.** Italian reserved only for:
- User-facing UI strings
- Document content (e.g., assembly descriptions in the database)
- Commit messages may mix languages if needed for clarity

### TypeScript
- Strict mode enabled
- Use `const` by default; `let` only when reassignment is needed
- Prefer named exports over default
- Avoid `any`; use `unknown` + type guards or generics
- Comment why, not what (identifiers should say what)

### Database / Drizzle ORM
- Define tables in `server/src/db/schema.ts` using Drizzle's `defineTable()`
- Column names: `camelCase` in TypeScript, mapped to `snake_case` in SQL (via Drizzle config)
- IDs are UUIDs (text, not integers)
- Timestamps are ISO 8601 strings (text, not DATE/TIMESTAMP)
- Foreign keys use Drizzle's `.references()` method
- See "Database Migrations & Seeds" section below for workflow details

### React
- Prefer functional components with hooks
- No prop drilling; consider context or state management for deep nesting
- Keep components under 400 lines; extract sub-components for clarity
- File naming: `ComponentName.tsx` for components, `useHookName.tsx` for hooks

---

## Database Migrations & Seeds

**Migration management is critical.** This section covers Cloudflare D1 SQLite workflows.

### Directory Structure

```
server/drizzle/
├── migrations/           # Schema-only SQL files (all environments)
│   ├── 0000_*.sql       # Initial baseline & incremental schema changes
│   └── meta/            # Drizzle internal tracking (_journal.json, snapshots)
├── seeds/
│   ├── common/          # Reference data (safe for all envs)
│   │   ├── 01_lookup_tables.sql
│   │   └── README.md
│   └── dev/             # Dev-only fixtures (NEVER staging/prod)
│       ├── 01_organization_setting.sql
│       ├── 02_users.sql
│       └── README.md
├── snapshot/
│   └── schema.sql       # Canonical DDL snapshot (generated)
└── tests/
    └── *.test.sql       # SQL assertion tests
```

### Workflow: Making Schema Changes

**1. Modify `server/src/db/schema.ts`** (Drizzle schema)

Edit table definitions, add columns, change constraints using Drizzle's `defineTable()` API.

**2. Generate migration**
```bash
npm run db:generate
```
Drizzle generates a new SQL file in `server/drizzle/migrations/`. Naming: `NNNN_*.sql` where `NNNN` is the next sequence number.

**3. Test locally**
```bash
npm run db:migrate
```
Applies all pending migrations to the local D1 database.

**4. Verify behavior**
```bash
npm run dev
```
Test your application locally to ensure the new schema works.

**5. Commit**
```bash
git add server/src/db/schema.ts server/drizzle/migrations/
git commit -m "feat: add email column to person table"
```

**6. Deploy (after PR approval)**

Staging:
```bash
npm run db:migrate:staging
```

Production:
```bash
npm run db:migrate:production
```

Migrations are idempotent (wrangler tracks applied files via the `d1_migrations` table).

### Workflow: Adding Test/Fixture Data

**Common Data (All Environments)**

For reference data or lookup tables safe for all environments:
1. Create SQL file in `server/drizzle/seeds/common/`
2. Name with pattern: `NN_descriptive_name.sql` (e.g., `02_payment_methods.sql`)
3. Use `INSERT OR IGNORE` for idempotency

Apply:
```bash
npm run db:seed:common
```

**Development Fixtures (Local Only)**

For test data, real-world scenarios, or PII used in development:
1. Create SQL file in `server/drizzle/seeds/dev/`
2. Name with pattern: `NN_descriptive_name.sql` (numbering tracks dependencies)
3. Use `INSERT OR IGNORE` for idempotency
4. Files are applied in alphabetical order; order matters if there are foreign keys

Apply:
```bash
npm run db:seed:dev
```

**Why Separate Seeds from Migrations?**
- **Migrations** (`migrations/`) = schema structure applied to all environments
- **Common seeds** (`seeds/common/`) = reference data safe for all environments
- **Dev seeds** (`seeds/dev/`) = test fixtures/PII for local development only

This prevents dev test users from being accidentally deployed to staging/production.

### Workflow: Resetting Local Database

During development, start fresh:
```bash
npm run db:reset:local
```

This:
1. Deletes local D1 state (`.wrangler/state/v3/d1/`)
2. Re-applies all schema migrations
3. Applies common seeds
4. Applies dev seeds

Duration: ~10 seconds instead of replaying 50+ sequential migrations.

### Workflow: Updating the Schema Snapshot

After completing a feature or set of migrations, regenerate the canonical schema snapshot:
```bash
npm run db:snapshot
```

This:
1. Resets local D1
2. Applies all schema migrations
3. Queries `sqlite_master` to extract all table/index definitions
4. Writes to `drizzle/snapshot/schema.sql`

**When to update:**
- After each completed feature/milestone
- Before major releases
- When on-boarding new environments
- Included in CI/CD for documentation

**Why snapshot?**
- Single file represents current schema (not scattered across 50+ migrations)
- Used for fresh environment setup
- Easy to review in PRs for schema changes
- Serves as documentation

### Environment-Specific Rules

**Local Development** (`npm run db:migrate` + `npm run db:seed:*`)
- ✓ Migrations applied in order
- ✓ Common seeds applied
- ✓ Dev seeds applied
- ✓ Can reset with `npm run db:reset:local`
- ✓ PII and test data loaded

**Staging** (`npm run db:migrate:staging`)
- ✓ Migrations applied in order
- ✗ Seed files NOT auto-applied (they're in `seeds/`, not `migrations/`)
- To seed staging: manually run `npm run db:seed:common --env staging` if needed

**Production** (`npm run db:migrate:production`)
- ✓ Migrations applied in order (same as staging)
- ✗ NO dev seeds (obviously)
- ✗ Common seeds only if explicitly deployed

### Known Issues & Workarounds

**Duplicate Migration Numbers:** Files like `0027_seed_lookup_data.sql` and `0027_seed_consent_records.sql` exist due to incremental development. This is harmless:
- Wrangler applies files alphabetically by full filename, not by number
- Both files already applied to staging/prod (recorded in `d1_migrations` table)
- No action needed; future migrations should continue the sequence

**Seed Files Still in Migrations?** If you see seed files in `migrations/`, they are legacy. Copy to appropriate seed directory, delete from `migrations/`, and commit with message: `chore: move legacy seed file to seeds/`

**Rollback/Downgrade:** Drizzle Kit's `migrate down` does NOT work with D1. To rollback:
1. **If not yet deployed:** simply delete the new migration file and re-generate
2. **If deployed:** create a new migration that reverses the changes (e.g., `0057_drop_new_column.sql`)
3. Document the reversal clearly in commit message

### Scripts Reference

| Script | Effect | Environment |
|--------|--------|-------------|
| `npm run db:generate` | Diff schema.ts and generate new migration SQL | All |
| `npm run db:migrate` | Apply pending migrations | Local only |
| `npm run db:migrate:staging` | Apply pending migrations | Staging |
| `npm run db:migrate:production` | Apply pending migrations | Production |
| `npm run db:seed:common` | Apply reference data seeds | Local (or manual staging/prod) |
| `npm run db:seed:dev` | Apply dev test fixtures | Local only |
| `npm run db:reset:local` | Wipe and rebuild local DB | Local only |
| `npm run db:snapshot` | Generate canonical schema.sql | Local (generates artifact) |

---

## Known Project State

### Recent Work (Milestones 1-6)

1. **Milestone 1-2:** User role consolidation (org-scoped users/roles)
2. **Milestone 3-4:** Setup wizard & password gate for first-time Google users
3. **Milestone 5-6:** Multi-org support with org-scoped settings
4. **Current (Apr 2026):** Migration reorganization for better dev experience

### Completed Initiatives

**Schema Normalization (Phases 1-5):** ✓ **COMPLETE**
- Phase 1: Created lookup tables for enums (assembly types, statuses, etc.)
- Phase 2a: Migrated assembly enums (type, subtype, status, location, modality)
- Phase 2b: Consolidated assembly & attendance modes under `mode_option` table
- Phase 3: Migrated volunteer status and attendance modes to FK references
- Phase 4: Migrated user roles and compliance enums to FK references
- Phase 5: Renamed Italian columns to English (person & organizationSetting tables)

**Current State:** All lookup tables created; dual columns in place for backward compatibility. Old text columns remain alongside new FK columns. A future cleanup phase can drop the old columns once all API code is migrated to use FK references exclusively.

---

## Development Setup

### Prerequisites

- Node.js 18+
- `wrangler` CLI (Cloudflare Workers)
- `npm` or `pnpm`

### Initial Setup

```bash
npm install
cd server && npm install
cd ../client && npm install

# Create local Google OAuth credentials (see DEPLOYMENT.md)
# Add to server/.dev.vars:
# GOOGLE_CLIENT_ID=...
# GOOGLE_SERVICE_ACCOUNT_KEY=...
# JWT_SECRET=...
```

### Running Locally

```bash
# Terminal 1: Backend
cd server
npm run dev              # Starts on http://localhost:8787

# Terminal 2: Frontend
cd client
npm run dev              # Starts on http://localhost:5173
```

Browser: http://localhost:5173 (frontend proxies API to backend)

### Testing

```bash
# Type checking
npm run typecheck

# Unit/integration tests (if configured)
npm test
```

---

## Git Conventions

### Commit Message Format

```
<type>: <subject> (<scope>)

<body>

<footer>
```

**Type:** `feat`, `fix`, `docs`, `style`, `refactor`, `test`, `chore`, `perf`

**Scope:** e.g., `auth`, `migrations`, `ui`, `db`

**Subject:** Imperative, lowercase, no period. ~50 chars max.

**Body:** What and why, not what. Wrap at ~72 chars. Reference issue #123 if applicable.

**Example:**
```
feat(migrations): separate seed data from schema DDL

Move seed files out of migrations/ into seeds/dev and seeds/common
to enable fast local resets and prevent accidental PII deployment.

Closes #456
```

### Branch Naming

Branches follow pattern: `<type>/<short-description>`

Examples: `feat/multi-org-support`, `fix/google-auth-bug`, `chore/update-deps`

---

## Deployment

**Staging and production deployments require careful coordination.** See [DEPLOYMENT.md](DEPLOYMENT.md) for:

- Environment setup (D1 databases, secrets)
- Migration deployment sequence
- Rollback procedures
- Performance/compliance considerations

### Environments

| Environment | D1 Database ID | Use Case |
|---|---|---|
| Local | `.wrangler/state/` | Development |
| Staging | `a0aba6f8-...` | Pre-production testing |
| Production | `4df11d70-...` | Live service |

**Caution:** Staging and production share the same D1 ID in some config. Check `wrangler.toml` carefully before deploying.

---

## Common Tasks for Agents

### "I need to add a new feature"

1. Plan the database changes (new tables, columns, relationships)
2. Update `server/src/db/schema.ts`
3. `npm run db:generate` to create migration
4. Test with `npm run db:reset:local && npm run dev`
5. Add frontend component(s) in `client/src/`
6. Commit both backend + frontend changes together
7. Create PR with description of changes
8. After approval: `npm run db:migrate:staging` then :production if stable

### "I need to debug a bug"

1. `npm run db:reset:local` to start from known state
2. `npm run dev` and reproduce in browser
3. Add `console.log()` or use debugger (backend runs with `--inspector-port 9229`)
4. Check server logs, browser DevTools, and Network tab
5. Look at migration/seed files to understand current data state

### "I'm getting a TypeScript error"

1. Run `npm run typecheck` to see all errors
2. Fix type mismatches (prefer explicit types over `any`)
3. Commit the fix separately from logic changes if helpful

### "I need to reset everything"

```bash
npm run db:reset:local    # Clears local D1, reapplies all migrations + seeds
npm run dev               # Restart backend with fresh database
```

---

## Resources & References

- [DATABASE.md](DATABASE.md) — Complete schema documentation
- [DEPLOYMENT.md](DEPLOYMENT.md) — Production deployment guide
- [Hono Docs](https://hono.dev/) — Backend framework
- [Drizzle Docs](https://orm.drizzle.team/) — ORM
- [Cloudflare D1 Docs](https://developers.cloudflare.com/d1/) — Database

---

## Questions or Issues?

If you encounter unclear code, conflicting instructions, or missing documentation:

1. **Check existing documentation first** (files listed above)
2. **Look at git history** (`git log --oneline`, `git blame`)
3. **Read commit messages** for context on changes
4. **Ask in code comments** if assumptions are unsafe

**For new agents:** Start with a simple feature (bug fix, UI improvement) to get familiar with the codebase before tackling architecture changes.

---

**Last updated:** April 22, 2026  
**Maintained by:** Claude Code agents  
**Next review:** When major architectural changes are made
