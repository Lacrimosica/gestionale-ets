# Newman Test Runner Guide

Running Postman collections via Newman for API contract testing across all deployment modes.

## Prerequisites

```bash
npm install newman
```

## Running Collections

### Single Mode
```bash
# Start backend in test mode
npm run dev:test

# In another terminal, run collection
newman run tests/api-collections/single-org.postman_collection.json \
  --environment tests/api-collections/env.json \
  --reporters cli,json \
  --reporter-json-export tests/results/single-org-results.json
```

### All Modes (Sequential)
```bash
#!/bin/bash
for mode in single-org open invite-only closed; do
  echo "Testing $mode mode..."
  newman run tests/api-collections/$mode.postman_collection.json \
    --environment tests/api-collections/env.json \
    --timeout 30000
done
```

### With Coverage Report
```bash
newman run tests/api-collections/single-org.postman_collection.json \
  --environment tests/api-collections/env.json \
  --reporters cli,json,html \
  --reporter-html-export tests/results/single-org.html
```

## Test Results

Results are saved to:
- `tests/results/single-org-results.json` — Machine-readable
- `tests/results/single-org.html` — Human-readable HTML report

## Debugging Failed Tests

### View Response Details
```bash
newman run tests/api-collections/single-org.postman_collection.json \
  --environment tests/api-collections/env.json \
  -v  # Verbose output
```

### Check Variables
```bash
newman run tests/api-collections/single-org.postman_collection.json \
  --environment tests/api-collections/env.json \
  --reporter cli \
  --reporter-cli-no-summary  # Show variable values
```

### Run Specific Request
Edit the collection in Postman UI, disable all but one request, then run.

## CI/CD Integration

Add to `.github/workflows/test.yml`:

```yaml
- name: Run API tests (all modes)
  run: |
    npm run dev:test &
    sleep 2
    for mode in single-org open invite-only closed; do
      echo "Testing $mode mode..."
      newman run tests/api-collections/$mode.postman_collection.json \
        --environment tests/api-collections/env.json \
        --timeout 30000 || exit 1
    done
    pkill -f "npm run dev:test"
```

## Environment Variables

Shared variables in `env.json`:
- `baseUrl`: Backend URL (default: http://localhost:8787)
- `setupToken`: Captured from /api/setup/token
- `signupToken`: For subsequent org creation in open mode
- `orgId`: Captured from setup response
- `userId`: Captured from setup response

Variables are **auto-populated** by test scripts in each request.

## Exporting Results

### JSON Report
```bash
newman run collection.json \
  --reporter-json-export report.json
```

### JUnit XML (for CI)
```bash
# Install XML reporter
npm install newman-reporter-junit

newman run collection.json \
  --reporters cli,junit \
  --reporter-junit-export results.xml
```

### HTML Report
```bash
newman run collection.json \
  --reporters html \
  --reporter-html-export results.html
```

## Troubleshooting

**Connection refused on localhost:8787**
```bash
# Ensure backend is running
npm run dev:test

# Verify port is open
curl http://localhost:8787/api/setup/status
```

**Token capture fails**
- Check that `/api/setup/token` returns `{ "setupToken": "..." }`
- Verify test script: `pm.environment.set('setupToken', json.setupToken);`

**Rate limiting test fails**
- Rate limits are per IP
- Newman sends all requests from localhost
- For distributed testing, use different client IPs

## Advanced: Parameterized Testing

Create variants for different scenarios:

```bash
# Single org with rate limiting
newman run single-org.postman_collection.json \
  --env env-rate-limit.json

# Open mode with 5 concurrent orgs
newman run open.postman_collection.json \
  --env env-multi-org.json
```

## Performance

Expect timing per collection:
- `single-org`: ~2-3s (5 requests)
- `open`: ~4-5s (8 requests)
- `invite-only`: ~4-5s (8 requests)
- `closed`: ~2-3s (3 requests)

**Total for all modes**: ~15-20s
