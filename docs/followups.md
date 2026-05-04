# Crowd — Follow-ups and Need-to-Knows

A running document of work that's been deferred, observations worth carrying forward, and things future-you will want to know. Keep this updated as new items surface; treat it as a working backlog rather than a static list.

Last updated at the end of Phase D (TestFlight automation), May 2026.

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

---

## Crowd Feed bugs (Phase B testing surfaced, addressed in fix-pass)

Status: fixed in the post-Phase-B fix-pass. Listed here for completeness.

- Ring tick rate too coarse under 60 seconds (now adaptive: 1s/10s/30s based on min remaining time across visible posts)
- Expired posts didn't disappear until next fetch (now client-side filtered in addition to server-side)
- 5 km reach cap was UI-only; schema accepted up to 100 km (now `.max(5000)` at the schema level)
- Lifespan cap was UI-only; schema accepted up to 7 days (now `.min(5).max(720)` at the schema level)

---

## Deferred design surfaces (from the Ember migration)

These were intentionally out of scope for the design migration but will need attention as the app matures.

- **Post-detail screen.** When a user taps a post, what do they see? Privacy-aware design: should show context without revealing exact origin coordinates. A relative-distance diagram, not a map pin.
- **Populated Crowds state full redesign.** Phase 6 only did a tokens-only sweep on `CrowdCard`, `CreateCrowdModal`, `JoinCrowdModal`. The populated state needs a real design pass: how do many crowds list, what's the visual hierarchy between owned/joined/expiring, what does the populated state look like as crowds approach expiration.
- **Settings/preferences screen.** Doesn't exist yet. Will need: location permission status, notification preferences (when notifications exist), identity rotation, app version, sign out / wipe data.
- **Error/loading states beyond toast.** Today: toasts for everything. Better: empty states for failure modes, inline retry affordances, contextual error messages.
- **Proximity-join flow for private crowds.** Currently the "Scan QR" / "Tap NFC" buttons toast "coming soon." The actual flow needs design and implementation.
- **Onboarding / first-launch identity rotation UX.** Currently identity is generated silently on first launch. Worth a real "this is what anonymous means here" first-launch screen.
- **Accessibility audit.** VoiceOver labels on every interactive element, Dynamic Type support beyond `allowFontScaling=false` on the Ring, color-contrast verification, focus order through screens.

---

## Technical follow-ups (cross-phase)

### Testing infrastructure

- **React Native component testing setup.** Mobile's Jest is `testEnvironment: 'node'` and has never been wired for RN component rendering. Decision needed: jest-expo + @testing-library/react-native, vs. Maestro for flows, vs. Detox for E2E. The work isn't just preset config; also writing native-module mocks (Appearance, expo-location) and tuning `transformIgnorePatterns`. Single deliberate piece of work, not folded into another phase.
- **Test helper drift from real migrations.** `apps/server/__tests__/helpers/testDb.ts` hand-mirrors migration SQL inline. This is what allowed the 6-index schema/migration drift to go unnoticed. Replace inlined SQL with the actual Drizzle migration runner so tests exercise the same code path production will. Auto-fixes the test environment's missing `idx_messages_active_geo` and prevents future drift.

### Build and dependency hygiene

- **Source-direct workspace exports.** Workspaces consume each other via compiled `dist/` (`@repo/shared`, `@repo/api` have `"main": "dist/index.js"`). Every CI step that touches workspace types has to remember to run the build first; we hit this pattern bug at least three times in Phase A and again in Phase C's Vercel build. The clean fix is the `exports` field with TS resolution, or publishing ESM. This eliminates a class of "I forgot to build first" bugs.
- **Phantom-dependency audit.** The Zod 3-vs-4 split in Phase A was an unused dep affecting hoisting. Suspect more exist. Run `depcheck` or `knip` across the monorepo. Standalone follow-up, not gated to any phase.
- **`packages/api` CJS-only emit.** Works but is the older module format. ESM migration of the workspace would simplify Rollup's job in devtools and eliminate the `commonjsOptions` config entirely. Cross-cutting (server consumes shared directly), so this is a real piece of work.

### Deploy and CI

- **Test gating before deploy.** C6's deploy workflows fire on push to main directly; the existing test workflow runs in parallel, not as a blocker. A future tightening would make `Deploy Server`'s `needs:` reference the test job. Filed as Phase E concern (let deploy workflows stabilize first; isolate test-gating bugs from deploy-config bugs).
- **Cleanup script for production.** `apps/server/src/scripts/cleanup-expired.ts` is a one-shot script with `process.exit` at the end. To run on a schedule: refactor to extract a testable function, write a real test, and wire it as a Fly cron (or GitHub Actions schedule for dev). Required before production traffic, where stale rows accumulate.
- **`/health` could go deeper.** Currently verifies DB connection via SELECT 1. Could verify schema version, all expected tables exist, etc. Probably not worth doing until production failures motivate it; deeper probes can fail-loop a deploy if migrations are mid-application.
- **Deploy notifications.** Workflow status only visible in Actions tab. Slack/Discord/email hooks would be straightforward additions when the dev environment becomes the thing real testers hit.

### Mobile-specific

- **Slider thumb fidelity.** The Ember design called for paper background + 2px ember border on slider thumbs. `@react-native-community/slider` doesn't support custom thumb components. Switching to `@miblanchard/react-native-slider` (which does) or building a slider from scratch with `react-native-gesture-handler` + `react-native-reanimated` are the two paths.
- **`useRelaySettings` singleton under Suspense.** Today it's a singleton via `useSyncExternalStore`. If it ever needs to render in Suspense / Concurrent contexts, the in-memory state could drift from AsyncStorage. Wrap in a Provider if scaling.
- **Pre-existing TS errors in `apps/mobile/tests/`.** Resolved by deletion in Phase A. Listed here only because the historical reports reference it.

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

The decisions worth making in Phase E will be informed by these answers, not by the backlog above.

---

## Add new follow-ups below

(reserve space for items that surface during testing, in future phases, or in the natural drift of working on the project)