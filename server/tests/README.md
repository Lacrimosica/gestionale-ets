# Gestionale ETS — Testing Suite

This directory contains test infrastructure for Gestionale ETS, organized by testing layer.

## Structure

```
tests/
├── setup/                          # Test infrastructure & utilities
│   ├── miniflare-context.ts        # Miniflare D1 initialization
│   ├── db-reset.ts                 # Database reset & migration runner
│   ├── fixtures.ts                 # On-demand test data creators
│   ├── mocks/
│   │   └── time.ts                 # Date.now() mocking for rate limiting
│
├── integration/                    # Vitest integration tests
│   ├── setup-endpoint.test.ts      # Setup flow tests
│   ├── migrations.test.ts          # Migration validation
│   └── ...
│
├── api-collections/                # Postman collections for Newman
│   ├── single-org.postman_collection.json
│   ├── open.postman_collection.json
│   ├── invite-only.postman_collection.json
│   └── closed.postman_collection.json
│
└── README.md                       # This file
```

## Quick Start

### Unit & Integration Tests (Vitest + Miniflare)

```bash
# Run all integration tests
npm run test:integration

# Watch mode
npm run test:watch

# Run specific test file
npm run test:integration -- setup-endpoint.test.ts
```

**Tests use:**
- **Miniflare** for local D1 emulation
- **Drizzle ORM** for type-safe queries
- On-demand fixtures (no pre-seeded data)
- Automatic database reset before each test

### API Contract Tests (Newman + Postman Collections)

```bash
# Start backend in test mode
npm run dev:test

# In another terminal, run Newman
newman run tests/api-collections/single-org.postman_collection.json

# Or run all modes
npm run test:api
```

**Collections test:**
- HTTP contract (status codes, headers, payloads)
- Deployment mode constraints (single_org, open, invite_only, closed)
- Rate limiting with mocked time

---

## Test Examples

### Integration Test with Fixtures

```typescript
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { initializeMiniflare, cleanupMiniflare } from '../setup/miniflare-context';
import { resetTestDatabase } from '../setup/db-reset';
import { createTestOrganization } from '../setup/fixtures';

describe('My Feature', () => {
  beforeEach(async () => {
    await initializeMiniflare('open'); // Deployment mode
    await resetTestDatabase();
  });

  afterEach(async () => {
    await cleanupMiniflare();
  });

  it('should do something', async () => {
    const org = await createTestOrganization({
      slug: 'my-org',
      name: 'My Organization',
    });

    expect(org.id).toBeTruthy();
  });
});
```

### Time Mocking for Rate Limiting

```typescript
import { mockTime, advanceTime, resetTime } from '../setup/mocks/time';

describe('Rate Limiting', () => {
  it('should block after 5 attempts per hour', () => {
    const now = Date.now();
    mockTime(now);

    // Attempt 1-5: should succeed
    // Attempt 6: should be blocked
    
    advanceTime(1000 * 60 * 61); // Advance 61 minutes
    // Now should be unblocked
    
    resetTime();
  });
});
```

---

## Deployment Mode Testing

Tests are organized by `DEPLOYMENT_MODE`:

| Mode | File | Behavior |
|---|---|---|
| `single_org` | `single-org.postman_collection.json` | Single org only; 2nd creation → 409 |
| `open` | `open.postman_collection.json` | Unlimited orgs; anyone can create |
| `invite_only` | `invite-only.postman_collection.json` | Org creation requires invite token |
| `closed` | `closed.postman_collection.json` | No new orgs; setup → 423 Locked |

To add tests for a new mode:

1. Create `tests/api-collections/{mode}.postman_collection.json`
2. Create `tests/integration/{mode}/` directory
3. Add npm script: `"test:api:{mode}": "DEPLOYMENT_MODE={mode} npm run dev:test & sleep 2 && newman run tests/api-collections/{mode}.postman_collection.json"`

---

## Available Fixtures

All fixtures are created on-demand (not pre-seeded):

```typescript
// Create test organization
const org = await createTestOrganization({
  slug: 'custom-slug',
  name: 'Custom Name',
});

// Create user
const user = await createTestUser({
  email: 'custom@example.com',
});

// Link user to organization
await createTestOrganizationUser(user.id, org.id, {
  role: 'admin',
  isOwner: 1,
});

// Create person
const person = await createTestPerson(org.id, {
  firstName: 'John',
  lastName: 'Doe',
});

// Create app settings
const settings = await createTestOrganizationSetting(org.id, {
  city: 'Milan',
});

// Lookups
const org = await getOrganizationBySlug('my-org');
const user = await getUserByEmail('user@example.com');
const count = await countOrganizations();
```

---

## Database Reset Strategy

Each test suite:

1. **Initialize Miniflare** with specified deployment mode
2. **Reset database**: Drop all tables, re-apply all migrations, seed lookup tables
3. **Run tests** against clean state
4. **Cleanup**: Dispose Miniflare instance

This ensures **test isolation** without managing transaction rollbacks.

---

## CI/CD Integration

Add to your CI workflow:

```yaml
# .github/workflows/test.yml
- name: Run integration tests
  run: npm run test:integration

- name: Run API tests (single_org)
  run: npm run test:api:single_org

- name: Run API tests (open)
  run: npm run test:api:open

- name: Run API tests (invite_only)
  run: npm run test:api:invite_only

- name: Run API tests (closed)
  run: npm run test:api:closed
```

---

## Troubleshooting

### "Miniflare already initialized"
Ensure `beforeEach` calls `initializeMiniflare()` and `afterEach` calls `cleanupMiniflare()`.

### "Database not initialized"
Call `initializeMiniflare()` before using `getMiniflareDB()`.

### "UNIQUE constraint failed"
Use `crypto.randomUUID()` or timestamp suffixes in fixture creation to avoid collisions:

```typescript
const org = await createTestOrganization({
  slug: `test-org-${Date.now()}`,
});
```

### "Time not mocked"
Ensure `mockTime()` is called before `advanceTime()`. Call `resetTime()` in `afterEach`.

### Newman collection fails with 401
Verify the setup token is being captured and passed correctly in subsequent requests:

```json
{
  "listen": "test",
  "script": {
    "exec": [
      "const json = pm.response.json();",
      "pm.environment.set('setupToken', json.token);"
    ]
  }
}
```

---

## Next Steps

- [ ] **Phase 2:** Add deployment-mode-specific integration tests
- [ ] **Phase 3:** Add end-to-end flow tests (signup → org creation → login)
- [ ] **Phase 4:** Add multi-tenant isolation tests
- [ ] **Phase 5:** Integrate with staging/prod pipelines
