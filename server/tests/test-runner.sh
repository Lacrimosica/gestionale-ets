#!/bin/bash

# Test runner for Gestionale ETS
# Usage: ./test-runner.sh [mode] [vitest-args]

DEPLOYMENT_MODE="${1:-open}"
VITEST_ARGS="${2:-}"

echo "=== Gestionale ETS Test Suite ==="
echo "Deployment Mode: $DEPLOYMENT_MODE"
echo ""

# Reset database
echo "Resetting test database..."
npm run db:reset:local > /dev/null 2>&1

# Run tests
echo "Running integration tests..."
export DEPLOYMENT_MODE=$DEPLOYMENT_MODE
vitest run tests/integration $VITEST_ARGS

TEST_RESULT=$?

if [ $TEST_RESULT -eq 0 ]; then
  echo ""
  echo "✓ All tests passed!"
  exit 0
else
  echo ""
  echo "✗ Tests failed"
  exit 1
fi
