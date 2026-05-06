# Crowd — Follow-ups and Need-to-Knows

A running document of work that's been deferred, observations worth carrying forward, and things future-you will want to know. Keep this updated as new items surface; treat it as a working backlog rather than a static list.

Last updated mid-May 2026 (after the stale-location fix, the Crowds design pass, and proximity-token implementation).

---

## Working principles to keep applying

These emerged from doing the work across Phases A through D. Worth holding onto for any future project, not just Crowd.

- **Verify before remediate.** Prompts and reports describe state; the code is the source of truth. Run the cheap commands that confirm state before acting on described state.

- **Honesty over deferral.** When drift surfaces inside a phase, fix it inside that phase. Booking it for "later" usually means it accumulates with other deferrals into a thorny pile.

- **Treat described state as hypothesis.** Whether the source is a prompt, a previous report, or your own mental model, "what's true now" needs verification. Cheap verification beats building on a wrong assumption.

- **Don't expand the testing surface inside cleanup phases.** "Fix or delete what exists" is the rule; standing up new test infrastructure is its own piece of work that deserves dedicated attention.

- **Migration filenames are part of the deploy timeline.** Rename auto-generated names to read like changelog entries. Codified in CONTRIBUTING.md.

- **The continue-on-error round-trip pattern.** When you have to land a known-broken state to enable later work, gate it explicitly with a comment naming the next phase that removes it. Future-you grepping for `continue-on-error` finds the trail.

- **Layer of testing matters.** Test behavior at the layer the contract lives, not below it. HTTP integration tests beat ORM-layer assertions because the HTTP boundary is what consumers depend on; the ORM is an implementation choice that can change.

- **Job independence over CI minutes.** A failing job's name should tell you specifically what's broken. Don't merge separate concerns into one job to save CI time; useful redundancy is worth its cost.

- **Verify the diagnosis before applying the fix.** Phase C5's "What I got wrong" surfaced this: pushing a fix without confirming it actually addresses the symptom (e.g., bundle still had unresolved require()) costs a round-trip. Cheap verification commands like grep against the built artifact would have caught the issue on iteration zero.

---

## Crowd Feed bugs (Phase B testing surfaced, addressed in fix-pass)

Status: fixed in the post-Phase-B fix-pass. Listed here for completeness.

- Ring tick rate too coarse under 60 seconds (now adaptive: 1s/10s/30s based on min remaining time across visible posts)
- Expired posts didn't disappear until next fetch (now client-side filtered in addition to server-side)
- 5 km reach cap was UI-only; schema accepted up to 100 km (now `.max(5000)` at the schema level)
- Lifespan cap was UI-only; schema accepted up to 7 days (now `.min(5).max(720)` at the schema level)

---

## Stale-location bug (real-world testing surfaced, addressed in fix-pass)

Status: fixed in the stale-location fix-pass. Listed here for completeness.

- `useLocation` mount-time capture meant post submission used coordinates from when the screen mounted, not when the user tapped Post — could be hours stale after backgrounding. Real privacy issue (post broadcasts from where user *was*, not where they are).
- Fix: new explicit `getFreshLocation()` async method on the hook with discriminated-union return type. Submit handler awaits a fresh location with a 5-second timeout and 30-second staleness threshold. Three-state submit machine (idle / locating / submitting). 1-second-delayed "Locating..." label so fast fetches don't flicker.
- Same pattern applied to FeedScreen cold-open: skeleton + Concentric + "Finding posts near you..." while waiting; "Can't find you" retry block on failure.
- Toast for transient errors, native iOS Alert with "Open Settings" affordance for permission_denied.
- Discovered: the existing FeedScreen `loadMessages` previously called `getMessages(undefined)` when location was absent, returning data without coords. New code hard-errors instead. Aligned with the privacy reasoning.

---

## Crowds design pass (mid-May 2026)

Status: largely shipped. The design pass produced the populated Crowds list redesign, refined Create and Join modals, the QR scan flow, and the proximity-token server endpoints.

Followups specifically from this pass:

- **QR generation flow on the Invite button.** The receive flow (scan → token validation → confirmation → join) is built. The send flow (Invite button generates QR code and proximity token, displays for the other person to scan) is not. Until built, the proximity-join can only be tested via curl-minted tokens. This is a coherent design pass of its own, probably 1-2 hours.
- ~~**Lookup-token endpoint for pre-join confirmation.**~~ Shipped in the follow-up pass. `POST /crowds/lookup-token` returns crowd metadata without consuming the token; the QR scan flow is now scan → lookup → "Join [Crowd Name]?" sheet → consume on confirm. Cancel leaves the token usable until it expires.
- ~~**Crowd-specific user-id rotation when joining via token.**~~ Fallback removed. `parseCrowdInvite` now requires a valid `cid=<uuid>` for token-shaped payloads, and `joinCrowdWithToken` requires `crowdId` (no main-user-id fallback path). Malformed token URLs surface as the existing "Not a Crowd code" toast.
- ~~**Server tests for proximity token endpoints.**~~ Added in the follow-up pass. 7 new tests in `apps/server/__tests__/integration/crowds.test.ts` cover owner mint, non-owner reject, lookup idempotency, single-use consume, backdated-expiry reject, unknown token, malformed payload. 45/45 server tests pass.

Crowds list controls (sort/filter): **defer until testing shows a real need.**
- Current: two-section split (Expiring soon ≤2h, Active everything else). Each crowd appears in exactly one section.
- The product is designed for small trusted groups. 1-5 crowds is the realistic count. Sort/filter UI on a list of three crowds is overhead, not utility.
- Better targeted improvements if any controls are added: an "Active now" or "New posts" indicator on cards for activity surfacing; a pin-to-top affordance for a single primary crowd. Skip sort and filter unless real users say "I can't find [crowd name]" or "this list got cluttered."
- Watch tester feedback for "I have too many crowds" or "I can't find [name]" before designing the controls.

---

## Deferred design surfaces (from the Ember migration)

These were intentionally out of scope for the design migration but will need attention as the app matures.

- **Post-detail screen.** When a user taps a post, what do they see? Privacy-aware design: should show context without revealing exact origin coordinates. A relative-distance diagram, not a map pin.
- ~~**Populated Crowds state full redesign.**~~ Addressed in the Crowds design pass (May 2026). New section split, owned/joined visual distinction via paper-tint background, expiring-soon ember treatment.
- **Settings/preferences screen.** Doesn't exist yet. Will need: location permission status, notification preferences (when notifications exist), identity rotation, app version, sign out / wipe data.
- **Error/loading states beyond toast.** Today: toasts for everything. Better: empty states for failure modes, inline retry affordances, contextual error messages. (Partially addressed in stale-location fix: FeedScreen now has a "Can't find you" retry block; CreateMessageScreen has the locating state machine.)
- ~~**Proximity-join flow for private crowds.**~~ QR receive flow shipped in the Crowds design pass. Send flow (generating QR codes from the Invite button) and NFC tap remain.
- **NFC tap flow.** Currently a "coming soon" modal with honest copy. Adding `react-native-nfc-manager` requires switching to a dev client (different from Expo Go) and adding iOS NFC entitlements. Real platform work; defer until use-case justifies the complexity.
- **Onboarding / first-launch identity rotation UX.** Currently identity is generated silently on first launch. Worth a real "this is what anonymous means here" first-launch screen.
- **Accessibility audit.** VoiceOver labels on every interactive element, Dynamic Type support beyond `allowFontScaling=false` on the Ring, color-contrast verification, focus order through screens.

---

## Deep linking and invite share flow (paired work)

Currently the invite link `crowd://join/<id>` exists as a string the server returns but isn't tappable: tapping it from outside the app doesn't open the app because the URL scheme isn't registered.

Two pieces, best done together:

1. **Invite share flow (the send side).** The Invite button on a populated crowd card needs to generate a shareable invite (link or QR code). For open crowds: `crowd://join/<id>`. For private crowds: `crowd://join-token/<token>?cid=<id>` with a freshly-minted proximity token. Should integrate with the iOS share sheet so users can paste into Messages, Mail, etc.
2. **Deep link registration and handling (the receive side).** Add `"scheme": "crowd"` to `app.json`. Wire React Navigation's `linking` config to route `crowd://join/:id` and `crowd://join-token/:token` to the appropriate screens. Handle cold launch, warm launch, app-already-in-different-state, malformed URLs, nonexistent crowds, expired tokens. Use the same confirmation modal as the QR scan path.

Realistic estimate together: 3-5 hours including testing.

Why paired: doing the deep-link receive side without the invite share flow means you've built the receiving end of a feature whose sending end doesn't exist (no real `crowd://` links exist in the wild yet). Doing them together means one verification path covers both: generate a share link on one phone, tap it on another, app opens to confirmation, join works.

Universal Links / App Links (`https://crowd.app/...`) are a separate, larger piece of work for production. Custom scheme is fine for dev and TestFlight.

---

## Technical follow-ups (cross-phase)

### Testing infrastructure

- **React Native component testing setup.** Mobile's Jest is `testEnvironment: 'node'` and has never been wired for RN component rendering. Decision needed: jest-expo + @testing-library/react-native, vs. Maestro for flows, vs. Detox for E2E. The work isn't just preset config; also writing native-module mocks (Appearance, expo-location) and tuning `transformIgnorePatterns`. Single deliberate piece of work, not folded into another phase.
- **Test helper drift from real migrations.** `apps/server/__tests__/helpers/testDb.ts` hand-mirrors migration SQL inline. This is what allowed the 6-index schema/migration drift to go unnoticed. Replace inlined SQL with the actual Drizzle migration runner so tests exercise the same code path production will. Auto-fixes the test environment's missing `idx_messages_active_geo` and prevents future drift.
- **`createApp.ts` test-app drift.** Same shape of problem as the `testDb.ts` migration-SQL inlining: `apps/server/__tests__/helpers/createApp.ts` is a hand-mirrored copy of the production routes in `apps/server/src/app.ts`. Surfaced during the proximity-token follow-up — adding endpoints to the production app alone left tests hitting 404s until the handlers were duplicated in the helper. Fix is the same shape: delete `createApp.ts` and have integration tests instantiate the real `buildApp()` (passing the test connection string via env or a small DI seam). Right time to address this is during the React Native component testing infrastructure pass — both helpers' lifetimes are tied to the testing-infra story.
- **ZodError → 400 standardization.** Several handlers use the convention `try { Schema.parse(body); ... } catch (err) { return reply.status(500).send(...) }`, so malformed inputs surface as 500 Internal Server Error rather than 400 Bad Request. The proximity-token tests assert this current behavior so they pass today, but it's wrong — schema-validation failures are client errors. Cross-cutting cleanup: catch `ZodError` specifically and return 400 with the issues, falling back to 500 for everything else. Update the existing tests to expect 400 in the same change. Low priority but a real polish item before production.

### Build and dependency hygiene

- **Source-direct workspace exports.** Workspaces consume each other via compiled `dist/` (`@repo/shared`, `@repo/api` have `"main": "dist/index.js"`). Every CI step that touches workspace types has to remember to run the build first; we hit this pattern bug at least three times in Phase A and again in Phase C's Vercel build. The clean fix is the `exports` field with TS resolution, or publishing ESM. This eliminates a class of "I forgot to build first" bugs.
- **Phantom-dependency audit.** The Zod 3-vs-4 split in Phase A was an unused dep affecting hoisting. Suspect more exist. Run `depcheck` or `knip` across the monorepo. Standalone follow-up, not gated to any phase.
- **`packages/api` CJS-only emit.** Works but is the older module format. ESM migration of the workspace would simplify Rollup's job in devtools and eliminate the `commonjsOptions` config entirely. Cross-cutting (server consumes shared directly), so this is a real piece of work.

### Server-side defense in depth

- **Server validation of post coordinates.** `POST /messages` currently trusts client-supplied lat/lng verbatim. The accidental-stale-location case is fixed at the client; the malicious case (a bad actor posting at arbitrary coordinates) is not. Possible defenses, in order of complexity: rate-limit posts per user with location attached; reject posts whose location is more than X km from the user's recent posts in the last Y hours; require signed location attestations (heavy). Filed as a real future ticket, not urgent.
- **Accuracy threshold in post validation.** GPS readings carry an `accuracy` field (radius of confidence in meters). A 0.1 km post with ±500 m accuracy is essentially randomly geotagged. Reject readings where `accuracy > radiusMeters / 2` (so a 100m post needs ±50m or better; a 5km post is happy with ±2.5km). Worth implementing once we have data on what real-world accuracy distributions look like.

### Deploy and CI

- **Test gating before deploy.** C6's deploy workflows fire on push to main directly; the existing test workflow runs in parallel, not as a blocker. A future tightening would make `Deploy Server`'s `needs:` reference the test job. Filed as Phase E concern (let deploy workflows stabilize first; isolate test-gating bugs from deploy-config bugs).
- **Cleanup script for production.** `apps/server/src/scripts/cleanup-expired.ts` is a one-shot script with `process.exit` at the end. To run on a schedule: refactor to extract a testable function, write a real test, and wire it as a Fly cron (or GitHub Actions schedule for dev). Required before production traffic, where stale rows accumulate.
- **`/health` could go deeper.** Currently verifies DB connection via SELECT 1. Could verify schema version, all expected tables exist, etc. Probably not worth doing until production failures motivate it; deeper probes can fail-loop a deploy if migrations are mid-application.
- **Deploy notifications.** Workflow status only visible in Actions tab. Slack/Discord/email hooks would be straightforward additions when the dev environment becomes the thing real testers hit.
- **Shared schema changes require server image rebuild.** `packages/shared` isn't bind-mounted into the dev compose container; schema changes need `docker compose up -d --build server` before the running server picks them up. Bind-mount `packages/shared/dist` into the dev compose so a host `pnpm --filter @repo/shared build` propagates without an image rebuild. Low priority while shared schema churn is rare.

### Mobile-specific

- **Slider thumb fidelity.** The Ember design called for paper background + 2px ember border on slider thumbs. `@react-native-community/slider` doesn't support custom thumb components. Switching to `@miblanchard/react-native-slider` (which does) or building a slider from scratch with `react-native-gesture-handler` + `react-native-reanimated` are the two paths.
- **`useRelaySettings` singleton under Suspense.** Today it's a singleton via `useSyncExternalStore`. If it ever needs to render in Suspense / Concurrent contexts, the in-memory state could drift from AsyncStorage. Wrap in a Provider if scaling.
- **Pre-existing TS errors in `apps/mobile/tests/`.** Resolved by deletion in Phase A. Listed here only because the historical reports reference it.
- **`refreshLocation` cleanup for consistency.** The existing `refreshLocation` on `useLocation` still calls `requestForegroundPermissionsAsync` on every invocation (re-prompts every time). It's no longer on the hot path (replaced by `getFreshLocation` for action-time use), but worth collapsing to use the same `getFreshLocation` semantics (read permission first, request only when missing) for consistency. Small future cleanup.
- **Background location strategy.** Independent of the stale-location fix: do we ever want the app to refresh location in the background, or on app-resume via `AppState` listeners? If yes, separate design conversation about battery, permissions, iOS background modes. The on-demand fresh fetch at action time covers the immediate need; background tracking is a future optimization with real costs.

### Repo hygiene observations

- **Build-before-typecheck pattern.** Same root cause as the source-direct exports item above. Every new CI step that touches workspace types has to remember the prereqs. The Vercel build command is verbose because of it. Fixed structurally by switching to source-direct workspace exports.
- **`pnpm.packageExtensions` and `.npmrc public-hoist-pattern[]=*@babel/*`.** Load-bearing for the React Native build. Documented in CONTRIBUTING.md as "don't delete these without reading this." If a new contributor strips them, Metro breaks.
- **`vite.config.ts process.env shim`.** `define: { 'process.env': {} }` is load-bearing for some dependency that does a runtime check. Devtools' own consumer code correctly uses `import.meta.env`, but if anyone adds a new dependency that reads `process.env` at runtime, it'll silently get `{}`. Comment-on-line in a future cleanup.
- **PR-merge path not exercised.** Every Phase C commit went directly to main via admin push. The deploy workflows fire on `push: branches: [main]`, so a merge commit triggers them identically to a direct push, but the full PR-review-and-Vercel-preview round trip wasn't visually confirmed. First real PR after Phase C closes the gap incidentally.

### Stale references

- **Web target.** `app.json` references `favicon.png` and there's a Web tab in some Expo configs, but Crowd has no web app. Worth either deleting the web target entirely or treating it as latent. Not blocking anything.
- **Bundle size in devtools.** 578KB raw / 142KB gzipped. Acceptable for dev tooling; if it grows further, code-splitting via dynamic `import()` is the path.

---

## Production rollout (Phase E or whenever)

Production is structurally unblocked. The architecture supports adding it as a parallel set of resources without code changes. When you're ready, the steps:

- New Fly app: `fly apps create crowd-prod` + parallel `fly.toml` (or single fly.toml with conditional config; either works).
- New Neon project (or branch off `crowd-dev`): produces a separate connection string.
- New Vercel project for production devtools (or use Vercel's preview/production environment split on the same project).
- New App Store Connect record with a different bundle identifier (e.g., `dev.anthonyliddle.crowd.prod` or split-by-environment naming).
- Parallel GitHub Actions workflows: copies of `deploy-server.yml`, `deploy-devtools.yml`, `deploy-mobile.yml` with `--app crowd-prod` (Fly), `VERCEL_PROJECT_ID=<prod-id>` (Vercel), and a `dev-deployed` profile vs. a future `production` profile (mobile).
- Production manual gate on TestFlight submit (vs. the auto-submit currently used for dev).
- Production-only secrets in GitHub Actions: `FLY_API_TOKEN_PROD`, `VERCEL_PROJECT_ID_PROD`, etc. Don't reuse dev tokens.
- Production CORS allowlist will be different (only the production devtools origin).

No new architecture. New configurations, new resources, but the same shapes.

---

## Things to know about the deployed dev environment

- **Server**: `https://crowd-dev.fly.dev` — Fastify on Fly.io, scale-to-zero, sjc region, 512MB shared CPU, free hobby tier.
- **Database**: Neon project `crowd-dev`, us-west-2, free tier (0.5 GB / 3 GB-month compute / 5min autosuspend).
- **Devtools**: `https://crowd-dev-devtools.vercel.app` — Vite + React, Vercel free hobby tier.
- **Mobile**: TestFlight internal testing group "Crowd Internal," builds via EAS Build's free tier (30 builds/month).
- **Apple Developer**: $99/year, active.
- **Expected dev cost**: $8-12/month, almost entirely Apple's fee.

### URLs worth bookmarking

- App: TestFlight invite (specific URL from App Store Connect)
- Server health: `https://crowd-dev.fly.dev/health`
- Fly dashboard: `https://fly.io/apps/crowd-dev`
- Vercel dashboard: `https://vercel.com/dashboard` → crowd-dev-devtools
- Neon dashboard: `https://console.neon.tech` → crowd-dev project
- App Store Connect: `https://appstoreconnect.apple.com/apps/<app-id>`
- GitHub Actions: `https://github.com/anthony-liddle/crowd/actions`

### Secrets and where they live

- **Fly.io secrets store**: `DATABASE_URL` (rotated post-C8), `CORS_ORIGIN`.
- **GitHub Actions secrets**: `FLY_API_TOKEN`, `VERCEL_TOKEN`, `VERCEL_ORG_ID`, `VERCEL_PROJECT_ID`, `EXPO_TOKEN`, `ASC_API_KEY_ID`, `ASC_API_ISSUER_ID`, `ASC_API_KEY_P8`, `APPLE_ID`, `APPLE_TEAM_ID`.
- **Vercel project env vars**: `VITE_API_BASE_URL`.
- **EAS-managed credentials**: iOS Distribution Certificate, provisioning profile (stored by EAS, not in your repo).

---

## What to do with tester feedback

When testers start using the app, log feedback verbatim somewhere durable (Discord channel, Notion doc, group text, whatever). Don't filter or aggregate yet. After two weeks, look for patterns. Signal is in the repeats. One person saying "the ring is confusing" might be a one-off; three people saying it independently is real.

Specific things to listen for:

- Do users understand what relay does? Do they relay things?
- Does the radius slider feel right? Is 5km the right max in practice?
- Does the lifespan slider feel right? Do people wish for longer? Shorter?
- What screens have empty states that get hit in practice but feel underdeveloped?
- Are there gestures users try that don't work?
- Does anyone misunderstand the privacy model?
- What's the first thing testers do that the app doesn't support?
- **Crowds list specific:** does anyone say "I have too many crowds" or "I can't find [name]"? That's the signal that sort/filter UI needs designing.
- **Proximity-join specific:** does anyone try to scan a QR code from someone who hasn't generated one yet (because the send flow doesn't exist)? That's the signal that the Invite share flow is the next priority.
- **Location permission specific:** does anyone get stuck on the permission_denied flow? Does the "Open Settings" affordance work? Do they re-grant successfully?

The decisions worth making in Phase E will be informed by these answers, not by the backlog above.

---

## Add new follow-ups below

(reserve space for items that surface during testing, in future phases, or in the natural drift of working on the project)