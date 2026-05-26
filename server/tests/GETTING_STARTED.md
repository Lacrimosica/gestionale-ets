# Getting Started with Phase 1 Testing

## 5-Minute Quick Start

### 1. Install Dependencies
```bash
cd server
npm install
```

### 2. Run Integration Tests
```bash
npm run test:integration
```

**Expected output:**
```
✓ tests/integration/setup-endpoint.test.ts (5)
✓ tests/integration/migrations.test.ts (4)
✓ tests/integration/open-mode.test.ts (4)
✓ tests/integration/invite-only-mode.test.ts (3)
✓ tests/integration/closed-mode.test.ts (3)

Test Files  5 passed (5)
     Tests  19 passed (19)
```

### 3. Run API Contract Tests (Optional)
```bash
# Terminal 1: Start backend in test mode
npm run dev:test

# Terminal 2: Run Postman collection for single_org mode
newman run tests/api-collections/single-org.postman_collection.json
```

---

## What Each Test File Tests

| File | Purpose | Scenarios |
|---|---|---|
| `setup-endpoint.test.ts` | Basic setup flow | Fresh DB, duplicate slug, org lookup |
| `migrations.test.ts` | Schema correctness | Tables exist, lookups seeded, columns present |
| `open-mode.test.ts` | Multi-org behavior | Unlimited orgs, isolation by org_id |
| `invite-only-mode.test.ts` | Token gating | First org free, invites 24h TTL |
| `closed-mode.test.ts` | Locked state | All endpoints return 423, users still access |

---

## Common Commands

```bash
# Run all tests
npm run test

# Watch mode (re-run on file save)
npm run test:watch

# Run specific test file
npm run test:integration -- setup-endpoint.test.ts

# Reset database (if stuck)
npm run db:reset:local

# Check database state
npm run debug:db
```

---

## Adding Your First Test

Create `server/tests/integration/my-feature.test.ts`:

```typescript
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { initializeMiniflare, cleanupMiniflare, getMiniflareDB } from '../setup/miniflare-context';
import { resetTestDatabase } from '../setup/db-reset';
import { createTestOrganization } from '../setup/fixtures';

describe('My Feature', () => {
  beforeEach(async () => {
    await initializeMiniflare('open');
    await resetTestDatabase();
  });

  afterEach(async () => {
    await cleanupMiniflare();
  });

  it('should work as expected', async () => {
    const org = await createTestOrganization({
      slug: 'test-org',
      name: 'Test Organization',
    });

    expect(org.id).toBeTruthy();
    expect(org.slug).toBe('test-org');
  });
});
```

Then run:
```bash
npm run test:watch
```

---

## Next: Creating Tests for Your Endpoints

When you have API endpoints to test:

### Step 1: Create Integration Test (Vitest)
Test the database/business logic:

```typescript
// tests/integration/my-endpoint.test.ts
it('should create resource correctly', async () => {
  const org = await createTestOrganization({ slug: 'test' });
  const result = await myFunction(org.id);
  expect(result).toHaveProperty('id');
});
```

### Step 2: Create Postman Collection
Test the HTTP contract:

```json
{
  "request": {
    "method": "POST",
    "url": "{{baseUrl}}/api/my-endpoint",
    "body": { "orgId": "{{orgId}}" }
  },
  "event": [{
    "listen": "test",
    "script": {
      "exec": ["pm.test('Status 200', () => pm.response.code === 200);"]
    }
  }]
}
```

### Step 3: Run Both
```bash
npm run test:integration
npm run dev:test  # Terminal 1
newman run tests/api-collections/my-collection.json  # Terminal 2
```

---

## Troubleshooting

### "Cannot find module 'vitest'"
```bash
npm install
```

### Tests hanging/timing out
```bash
# Check database state
npm run debug:db

# Reset and retry
npm run db:reset:local
npm run test:integration
```

### "Database not initialized"
Ensure each test has:
```typescript
beforeEach(async () => {
  await initializeMiniflare();      // ← Required
  await resetTestDatabase();         // ← Required
});
```

### Postman collection won't connect to backend
```bash
# Ensure backend is running in test mode
npm run dev:test

# Verify port 8787 is accessible
curl http://localhost:8787/api/setup/status
```

---

## File Structure Cheat Sheet

```
server/tests/
├── setup/                    ← Test utilities
│   ├── miniflare-context.ts
│   ├── db-reset.ts
│   ├── fixtures.ts           ← Use these to create test data
│   └── mocks/
│       └── time.ts           ← For mocking Date.now()
├── integration/              ← Write your tests here
│   ├── setup-endpoint.test.ts
│   ├── migrations.test.ts
│   ├── open-mode.test.ts
│   ├── invite-only-mode.test.ts
│   ├── closed-mode.test.ts
│   └── [YOUR-TESTS-HERE].test.ts
├── api-collections/          ← Postman collections
│   ├── single-org.postman_collection.json
│   ├── open.postman_collection.json
│   ├── invite-only.postman_collection.json
│   ├── closed.postman_collection.json
│   └── env.json              ← Shared variables
├── README.md                 ← Full documentation
├── PHASE1_SUMMARY.md         ← Implementation details
└── GETTING_STARTED.md        ← This file
```

---

## Key Fixtures Available

```typescript
// Create test data (all on-demand)
const org = await createTestOrganization({ slug: 'my-org' });
const user = await createTestUser({ email: 'user@example.com' });
await createTestOrganizationUser(user.id, org.id);
const person = await createTestPerson(org.id);
await createTestorganizationSetting(org.id);

// Lookups
const found = await getOrganizationBySlug('my-org');
const userFound = await getUserByEmail('user@example.com');
const count = await countOrganizations();
```

---

## Running on CI/CD

Add to `.github/workflows/test.yml`:

```yaml
- name: Install dependencies
  run: npm install
  
- name: Run integration tests
  run: npm run test:integration
  
- name: Run API tests
  run: |
    npm run dev:test &
    sleep 2
    newman run tests/api-collections/single-org.postman_collection.json
```

---

## Need Help?

- **Test structure:** See `tests/integration/setup-endpoint.test.ts` for example
- **Fixtures:** See `tests/setup/fixtures.ts` for what's available
- **API tests:** See `tests/api-collections/single-org.postman_collection.json` for structure
- **Full docs:** See `tests/README.md`

---

**You're ready to go! Run `npm run test:integration` to see tests pass.** ✅
