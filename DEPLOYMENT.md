# Deployment Modes & Configuration

Gestionale-ETS supports four deployment modes, controlled by the `DEPLOYMENT_MODE` environment variable. This replaces the older boolean `ALLOW_ORG_CREATION` flag with a more flexible enum-based approach.

---

## Deployment Modes

### `single_org` (Default)

**Use case:** Organization installs and runs the app for themselves only.

**Setup:**
- Set `DEPLOYMENT_MODE = "single_org"` in `wrangler.toml` (default — no action needed)
- Deploy normally

**Behavior:**
- On first visit, users see an interactive setup wizard to create their organization
- Form state persists across browser refreshes (localStorage-backed)
- Once setup is complete, no additional organizations can be created
- The `/signup` endpoint is not available
- `POST /api/setup` returns `409 Conflict` if called after first org is created
- Google OAuth users on a fresh database are automatically routed to setup with email pre-filled

**Security:**
- Rate limiting: max 5 setup attempts per IP per hour
- CSRF protection: setup endpoint requires a signed session token
- First-time Google users can skip password entry (account created automatically)

**Database:** Single D1 instance with one `organization` row

---

### `open`

**Use case:** SaaS or self-hosted deployment supporting multiple independent organizations. Anyone can create an organization.

**Setup:**
- Set `DEPLOYMENT_MODE = "open"` in `wrangler.toml` `[vars]`
- Optionally set in environment-specific sections: `[env.staging.vars]` / `[env.production.vars]`
- Deploy with `wrangler deploy --env staging` (or `production`)

**Behavior:**
- First user to visit the app sees the setup wizard and creates organization #1
- Additional organizations can be created by visiting `/signup` (no authentication required)
- Each organization is isolated by `org_id` in the database
- Users can belong to multiple organizations with different roles per org
- API endpoints are scoped to the user's current organization (via JWT `orgId` claim)
- `/signup` link is visible in login error pages and post-login screens

**Security:**
- Rate limiting: max 5 setup attempts per IP per hour
- CSRF protection: setup endpoint requires a signed session token
- First-time Google users are routed to setup if no account exists

**Database:** Single D1 instance with multiple `organization` rows (one per tenant)

---

### `invite_only`

**Use case:** Controlled multi-tenant deployment. First organization created via setup wizard; additional organizations require an admin-issued invite token.

**Setup:**
- Set `DEPLOYMENT_MODE = "invite_only"` in `wrangler.toml`
- Deploy normally

**Behavior:**
- First user creates the first organization via setup wizard (no token required)
- Additional organization creation requires a valid invite token (issued by existing org admins)
- When a user attempts signup without a token, they see an error asking them to request an invite
- Admin users can issue org-creation invites (see Settings → Org Management)
- Each organization is fully isolated by `org_id`

**Security:**
- Rate limiting: max 5 setup attempts per IP per hour
- CSRF protection: setup endpoint requires a signed session token
- Org creation tokens are single-use and time-limited (24 hours)
- Audit log records who issued which invite tokens

**Database:** Single D1 instance with multiple `organization` rows

---

### `closed`

**Use case:** Fully locked-down deployment. No new organizations can be created; only pre-existing users can access the system.

**Setup:**
- Set `DEPLOYMENT_MODE = "closed"` in `wrangler.toml`
- Deploy normally

**Behavior:**
- The setup wizard is completely disabled
- `GET /api/setup/status` returns `423 Locked`
- `POST /api/setup` returns `423 Locked`
- Only users with existing accounts can log in
- Admin invitation workflow can still add new users to existing orgs

**Use case:** Post-launch maintenance, data freeze, or administrative lock.

**Database:** Existing data remains untouched; no new organizations or setup attempts allowed

---

## Environment Variable Reference

### `DEPLOYMENT_MODE`

Controls how organizations can be created and accessed.

| Value | Single Org | Multiple Orgs | Public Signup | Invite Required |
|-------|:----------:|:-------------:|:-------------:|:---------------:|
| `single_org` | ✓ | ✗ | ✗ | N/A |
| `open` | ✓ | ✓ | ✓ | ✗ |
| `invite_only` | ✓ | ✓ | ✗ | ✓ |
| `closed` | ✗ | ✗ | ✗ | N/A |

**Location:** Set in `wrangler.toml` `[vars]` or override in environment-specific sections.

**Development:** Set in `server/.dev.vars` for local testing (default: `"open"`).

### Backward Compatibility

If your deployment still uses the old `ALLOW_ORG_CREATION` variable, it will be automatically converted:
- `ALLOW_ORG_CREATION = "false"` → `DEPLOYMENT_MODE = "single_org"`
- `ALLOW_ORG_CREATION = "true"` → `DEPLOYMENT_MODE = "open"`

**Migration path:** Update `wrangler.toml` to use `DEPLOYMENT_MODE` at your next deployment window.

---

## Setup Wizard & Form Persistence

When deploying `single_org`, `open`, or `invite_only` modes, users see an interactive setup wizard on first visit. The wizard supports several advanced features:

### Form State Persistence

- All form data (except passwords) is persisted to browser localStorage
- If a user navigates away or closes the browser mid-setup, they can resume where they left off
- Form state is automatically cleared after successful organization creation
- Password and confirm-password fields are never stored locally

### Google OAuth Integration

- When a user attempts Google OAuth login on a fresh database, they are automatically routed to the setup wizard
- The wizard pre-fills the user's email from their Google account
- No password entry required for Google-authenticated users
- Account is created automatically with the Google ID linked

### Security

- CSRF protection: All setup submissions require a signed session token (30-minute expiry)
- Rate limiting: Maximum 5 setup attempts per IP address per hour (tracked in `setup_attempt` table)
- Audit logging: All successful setup operations are recorded in the `audit_event` table for compliance

---

## Migrating Between Modes

### Single-org → Open (or any multi-org mode)

1. Edit `wrangler.toml`: change `DEPLOYMENT_MODE` from `"single_org"` to `"open"` (or `"invite_only"`)
2. Redeploy: `wrangler deploy`
3. The existing organization is preserved; users can now create additional orgs
4. The `/signup` link will appear in the UI

No database migration needed — the mode only controls the app's acceptance of creation requests.

### Open/Invite-only → Single-org (not recommended)

1. Edit `wrangler.toml`: change `DEPLOYMENT_MODE` to `"single_org"`
2. Redeploy: `wrangler deploy`
3. Existing organizations remain but no new ones can be created
4. To remove unused organizations, delete them manually from the D1 dashboard (destructive operation — use with care)

### Any mode → Closed

1. Edit `wrangler.toml`: change `DEPLOYMENT_MODE` to `"closed"`
2. Redeploy: `wrangler deploy`
3. All setup endpoints immediately return 423 Locked
4. Existing users can still log in; no new orgs or users can be created

---

## Production Checklist

- [ ] Choose appropriate `DEPLOYMENT_MODE` for your use case
- [ ] Set `DEPLOYMENT_MODE` in `[env.production.vars]` section of `wrangler.toml`
- [ ] Run all pending migrations: `npm run db:migrate:production`
- [ ] Verify `CORS_ORIGIN` is set to your production frontend URL
- [ ] Verify `GOOGLE_REDIRECT_BASE_URL` matches your Workers URL (registered in Google Cloud Console)
- [ ] Set `JWT_SECRET` via Cloudflare dashboard: `wrangler secret put JWT_SECRET --env production`
- [ ] If using `invite_only` mode, ensure admin users can issue org-creation invites (Settings → Org Management)
- [ ] Test org creation (if applicable):
  - Visit the setup wizard (should pre-fill email if Google OAuth was used)
  - Verify setup token is issued and required on POST
  - Complete setup and verify org is created
  - Reload browser mid-setup and verify form state is restored
- [ ] Verify rate limiting works: attempt 6 rapid setup requests from same IP, expect 429 on 6th
- [ ] Review audit logs to confirm setup events are recorded
- [ ] Verify JWT payload includes `orgId` for multi-tenant setups
- [ ] Test deployment mode behavior:
  - Single-org mode: Verify 2nd org creation is rejected with 409
  - Open mode: Verify unlimited orgs can be created
  - Invite-only mode: Verify org creation without token is rejected
  - Closed mode: Verify all setup endpoints return 423

---

## Troubleshooting

**Setup wizard shows "Account non trovato" on Google login (fresh database)?**
- This should be automatically handled: fresh DB should redirect to setup with email pre-filled
- Verify that migrations 0059 and 0060 have been applied
- Check `DEPLOYMENT_MODE` is not set to `"closed"`
- Restart the backend: `npm run dev` or restart wrangler

**Setup endpoint returns 401 Unauthorized?**
- The setup token may have expired (30-minute TTL)
- Frontend should automatically refresh the token before submission
- If the issue persists, clear browser localStorage and reload: `localStorage.clear()`

**Rate limiting: "Too many setup attempts" but user hasn't tried 5 times?**
- Rate limiting is per IP address, not per user
- Multiple users on the same network will share the limit
- For development, test from different IPs or wait 1 hour for the limit to reset

**`/signup` link not visible in UI?**
- Verify `DEPLOYMENT_MODE` is set to `"open"` or `"invite_only"` (not `"single_org"`)
- Check browser console — frontend logs the deployment mode on load
- Restart the dev server: `npm run dev`
- Clear browser cache and localStorage

**Setup wizard form state not persisting?**
- Verify browser allows localStorage (not in incognito/private mode)
- Check browser console for errors: `localStorage.getItem('setup_wizard_v2')`
- If localStorage is disabled, form state will not persist (but setup can still complete)

**CSRF token issue: "Invalid setup session token"?**
- Ensure frontend fetches setup token before submitting: `GET /api/setup/token`
- Verify token is sent as `Authorization: Bearer <token>` header
- Tokens expire after 30 minutes; frontend should refresh if necessary
- If issues persist, the server may be on a different time than client — check system clocks

---

## Database Migrations

The following migrations support the new deployment mode system:

- **0059_audit_event.sql**: Creates `audit_event` table for logging setup attempts and org creation
- **0060_setup_attempt.sql**: Creates `setup_attempt` table for rate limiting (IP-based, 5/hour)

These must be applied before using the new deployment modes:

```bash
npm run db:migrate:production
```

---

## Future Enhancements

- Email domain whitelist/blacklist for org creation (open mode)
- Organization deletion endpoint with cascade delete
- Org quota management and billing integration
- Invite token UI in admin settings (currently implemented in API only)
- Setup wizard analytics and funnel tracking
