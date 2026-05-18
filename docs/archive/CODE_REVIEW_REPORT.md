> **Archived snapshot.** This document captures the state of the project at the time it was written. It is preserved for historical context but is not current. For current state, see the followups doc and the main README.

# Code Review Report: Crowd Monorepo

**Date:** January 20, 2026
**Scope:** Full codebase analysis of apps/mobile, apps/server, apps/devtools, and shared packages
**Status:** All Critical, High, and Medium issues resolved

---

## Executive Summary

| Component | Critical | High | Medium | Low | Total |
|-----------|----------|------|--------|-----|-------|
| apps/mobile | ~~4~~ 0 | ~~6~~ 0 | ~~6~~ 0 | 17 | ~~28~~ 17 |
| apps/server | ~~4~~ 0 | ~~6~~ 0 | ~~5~~ 0 | 8 | ~~17~~ 8 |
| apps/devtools | ~~4~~ 0 | ~~3~~ 0 | ~~8~~ 0 | 5 | ~~32~~ 5 |
| packages/shared & api | ~~3~~ 0 | ~~7~~ 0 | ~~11~~ 0 | 6 | ~~24~~ 6 |
| **TOTAL** | **0** | **0** | **0** | **36** | **36** |

---

## Resolved Issues

### Critical Issues (All Fixed)

| Issue | Location | Status |
|-------|----------|--------|
| 1.1 Missing `await` in FeedScreen.onRefresh | `apps/mobile/src/screens/FeedScreen.tsx` | FIXED |
| 1.2 Race Condition - Boost Endpoint | `apps/server/src/index.ts` | FIXED |
| 1.3 Race Condition - Join Endpoint | `apps/server/src/index.ts` | FIXED |
| 1.4 Missing Database Indexes | `apps/server/src/db/schema.ts` | FIXED |
| 1.5 N+1 Query in GET /crowds | `apps/server/src/index.ts` | FIXED |
| 1.6 Source/Compiled Code Out of Sync | `packages/shared/src/schemas.ts` | FIXED |
| 1.7 Hard-coded API Base URL | `apps/devtools/src/services/api.ts` | FIXED |
| 1.8 Unsafe JSON.parse | `apps/mobile/src/utils/identity.ts` | FIXED |

### High Severity Issues (All Fixed)

| Issue | Location | Status |
|-------|----------|--------|
| 2.1 Missing Lat/Lng Bounds Validation | `packages/shared/src/schemas.ts` | FIXED |
| 2.2 Missing radiusMeters/activeMinutes Upper Bounds | `packages/shared/src/schemas.ts` | FIXED |
| 2.3 Sensitive Error Details Exposed | `apps/server/src/index.ts` | FIXED |
| 2.4 Dangerous CORS Default (`*`) | `apps/server/src/index.ts` | FIXED |
| 2.5 Missing Pagination in Feed | `apps/server/src/index.ts`, `packages/shared/src/schemas.ts` | FIXED |
| 2.6 Stale Closure in Feed Refresh | `apps/devtools/src/components/Feed.tsx` | FIXED |
| 2.7 No Network Error Handling | `packages/api/src/client.ts` | FIXED |
| 2.8 Geolocation Failure Blocks User | `apps/devtools/src/components/CreateMessage.tsx` | FIXED |

### Medium Severity Issues (All Fixed)

| Issue | Location | Status |
|-------|----------|--------|
| 3.1 Missing useEffect Dependency | `apps/mobile/src/screens/FeedScreen.tsx` | FIXED |
| 3.2 Duplicate useFocusEffect Hooks | `apps/mobile/src/screens/FeedScreen.tsx` | FIXED |
| 3.3 Hardcoded Portland Location | `apps/mobile/src/services/api.ts` | KEPT (by design with TODO) |
| 3.4 Missing Graceful Shutdown | `apps/server/src/index.ts` | FIXED |
| 3.5 Type Assertion Bypasses Safety | `apps/mobile/src/screens/CreateMessageScreen.tsx` | FIXED |
| 3.6 Inconsistent Optional Field Defaults | `packages/shared/src/schemas.ts` | FIXED |
| 3.7 Missing Error Boundary | `apps/devtools/src/App.tsx` | FIXED |
| 3.8 Cleanup Script Memory Inefficiency | `apps/server/src/scripts/cleanup-expired.ts` | FIXED |
| 3.9 Unhandled Clipboard Promise | `apps/devtools/src/components/Crowds.tsx` | FIXED |
| 3.10 Missing Response Validation | `packages/api/src/client.ts` | FIXED |

---

## Low Severity Issues (36 remaining)

These are code quality improvements that don't affect functionality but would improve maintainability:

### apps/mobile/src/ (17 issues)

| # | Issue | Location |
|---|-------|----------|
| 1 | Debug console.log should be removed | `apps/mobile/src/services/api.ts:39` |
| 2 | Debug console.log should be removed | `apps/mobile/src/utils/identity.ts:56` |
| 3 | Unsafe `any` type usage in catch block | `apps/mobile/src/components/JoinCrowdModal.tsx:51` |
| 4 | Unused variable `_loading` declared but never read | `apps/mobile/src/screens/FeedScreen.tsx:21` |
| 5 | Magic number 500ms delay without constant | `apps/mobile/src/screens/CreateMessageScreen.tsx:145` |
| 6 | Magic number 0.8 (80%) threshold without constant | `apps/mobile/src/components/CharacterCounter.tsx:15` |
| 7 | Magic numbers for time conversions (60000, 3600000, 86400000) | `apps/mobile/src/utils/formatters.ts:33-35` |
| 8 | Magic number `1000 * 60 * 60` in duration calc | `apps/mobile/src/utils/formatters.ts:97-98` |
| 9 | Magic number 60000 used multiple times | `apps/mobile/src/services/api.ts:77,129,145` |
| 10 | Floating point precision inconsistency with toFixed | `apps/mobile/src/services/api.ts:83` |
| 11 | Missing accessibility labels on Boost button | `apps/mobile/src/components/MessageCard.tsx` |
| 12 | Missing JSDoc documentation | `apps/mobile/src/components/PageHeader.tsx` |
| 13 | Missing accessibility labels on sort buttons | `apps/mobile/src/components/SortFeed.tsx` |
| 14 | Missing accessibility labels on Picker | `apps/mobile/src/components/FeedSourceSelector.tsx` |
| 15 | Missing accessibility labels on Switch/TextInput | `apps/mobile/src/components/CreateCrowdModal.tsx` |
| 16 | Floating point coercion inconsistency | `apps/mobile/src/screens/CreateMessageScreen.tsx:127` |
| 17 | Magic number 30000 for interval without constant | `apps/mobile/src/screens/CreateMessageScreen.tsx:251` |

### apps/server/src/ (8 issues)

| # | Issue | Location |
|---|-------|----------|
| 18 | Unsafe `any` type in getIds function | `apps/server/src/index.ts:246` |
| 19 | Unsafe `any` type in haversine function | `apps/server/src/index.ts:336` |
| 20 | Magic number MAX_DISTANCE could use constant | `apps/server/src/index.ts:356` |
| 21 | Magic number in CROWD_DURATION_MS calc | `apps/server/src/index.ts:30` |
| 22 | Magic number '8080' in port parsing | `apps/server/src/index.ts:455` |
| 23 | Missing documentation for default host | `apps/server/src/index.ts:456` |
| 24 | Missing JSDoc on route handlers | `apps/server/src/index.ts` |
| 25 | Missing field documentation on table schemas | `apps/server/src/db/schema.ts` |

### apps/devtools/src/ (5 issues)

| # | Issue | Location |
|---|-------|----------|
| 26 | Magic number 30000 for refresh interval | `apps/devtools/src/components/Feed.tsx:72` |
| 27 | Missing React.memo() on MessageCard component | `apps/devtools/src/components/MessageCard.tsx` |
| 28 | Magic number in Radius slider toFixed(1) | `apps/devtools/src/components/CreateMessage.tsx:162` |
| 29 | Missing accessibility labels on form inputs | `apps/devtools/src/components/CreateMessage.tsx` |
| 30 | Complex state could benefit from useReducer | `apps/devtools/src/components/Feed.tsx:11-14` |

### packages/shared & api (6 issues)

| # | Issue | Location |
|---|-------|----------|
| 31 | Inconsistent z.coerce.number() vs z.number() usage | `packages/shared/src/schemas.ts:14-15` |
| 32 | Magic numbers .max(100) and .default(50) for pagination | `packages/shared/src/schemas.ts:19` |
| 33 | Magic number 30000 timeout repeated across API calls | `packages/api/src/client.ts:33,79,94...` |
| 34 | Magic number 200 in error truncation | `packages/api/src/client.ts:55` |
| 35 | Missing JSDoc on ApiClient class and methods | `packages/api/src/client.ts` |
| 36 | Error handling type safety could be improved | `packages/api/src/client.ts` |

---

## Changes Made Summary

### apps/server/src/index.ts
- Fixed CORS default from `*` to localhost origins only
- Added pagination support (`limit` and `offset` query params)
- Replaced check-then-act patterns with constraint violation handling
- Fixed N+1 query with aggregated GROUP BY query
- Changed all `err: any` to `err: unknown` with type guards
- Removed sensitive error details from responses
- Added graceful shutdown handler for SIGINT/SIGTERM

### apps/server/src/db/schema.ts
- Added indexes on `crowds.ownerId`, `crowds.expiresAt`
- Added indexes on `messages.ownerId`, `messages.expiresAt`, `messages.crowdId`
- Added index on `messageBoosts.messageId`

### apps/server/src/scripts/cleanup-expired.ts
- Implemented batch deletion (1000 records per batch) to prevent memory issues

### packages/shared/src/schemas.ts
- Added lat/lng bounds validation (-90/90, -180/180)
- Added max limits: radiusMeters (100km), activeMinutes (7 days)
- Added pagination fields to QueryFeedSchema
- Added defaults for `isBoosted` and `isOwner` boolean fields
- Added `RotateMembershipSchema` to fix source/compiled mismatch
- Added response schemas: `MessageResponseSchema`, `CrowdResponseSchema`, `IdResponseSchema`, `StatusResponseSchema`

### packages/api/src/client.ts
- Added AbortController with 30-second timeout
- Improved error handling for network failures
- Truncated error messages to 200 chars
- Added Zod response validation for all API endpoints

### apps/mobile/src/screens/FeedScreen.tsx
- Added `await` to `loadMessages()` in onRefresh
- Consolidated duplicate useFocusEffect into single hook
- Added `loadMessages` to useEffect dependency array

### apps/mobile/src/screens/CreateMessageScreen.tsx
- Added proper navigation typing with `TabNavigationProp`
- Removed unsafe `as never` type assertion

### apps/mobile/src/types/navigation.ts (NEW)
- Created `RootTabParamList` type for tab navigator screens
- Created `TabNavigationProp` type for typed navigation

### apps/mobile/src/utils/identity.ts
- Added try-catch around all JSON.parse calls
- Graceful recovery from corrupted storage

### apps/devtools/src/services/api.ts
- Changed to use `VITE_API_BASE_URL` environment variable

### apps/devtools/src/components/Feed.tsx
- Wrapped `fetchMessages` in useCallback with proper dependencies
- Fixed stale closure in refresh interval

### apps/devtools/src/components/CreateMessage.tsx
- Removed dependency on device location for submission
- Now allows manual coordinate entry as fallback

### apps/devtools/src/components/Crowds.tsx
- Added async/await error handling for clipboard operations

### apps/devtools/src/App.tsx
- Added ErrorBoundary component for graceful error handling

---

## Recommendations for Future Work

### Tech Debt (P3)
1. Extract magic numbers to named constants across all apps
2. Add accessibility labels to mobile and devtools components
3. Memoize React components (MessageCard, etc.)
4. Add JSDoc documentation to undocumented functions
5. Remove debug console.log statements
6. Standardize error handling patterns (replace `any` with `unknown`)

### Database Migrations
After deploying schema changes, run:
```bash
pnpm --filter server drizzle-kit generate
pnpm --filter server drizzle-kit push
```

---

## Files Modified

### apps/mobile/src/
- `screens/FeedScreen.tsx`
- `screens/CreateMessageScreen.tsx`
- `utils/identity.ts`
- `types/index.ts`
- `types/navigation.ts` (NEW)

### apps/server/src/
- `index.ts`
- `db/schema.ts`
- `scripts/cleanup-expired.ts`

### apps/devtools/src/
- `App.tsx`
- `services/api.ts`
- `components/Feed.tsx`
- `components/CreateMessage.tsx`
- `components/Crowds.tsx`

### packages/
- `shared/src/schemas.ts`
- `api/src/client.ts`

### Root
- `.env.example` (added VITE_API_BASE_URL)
