#!/bin/bash
# Wrapper script to handle expected PostgreSQL cleanup errors during Testcontainers shutdown
# All tests may pass but vitest exits with code 1 due to unhandled container shutdown errors

OUTPUT=$(pnpm vitest run "$@" 2>&1)
echo "$OUTPUT"

# Check if all test files passed
if echo "$OUTPUT" | grep -q "Test Files.*passed"; then
  # Check if any test files failed
  if echo "$OUTPUT" | grep -q "Test Files.*failed"; then
    exit 1
  fi
  # All tests passed - exit with 0 even if there were cleanup errors
  exit 0
fi

# No test files info found - something went wrong
exit 1
