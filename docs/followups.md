# Crowd — Active Followups

The working backlog of what's pending. Lean by design — when items ship, they move to `docs/decisions.md` rather than accumulating here as completion records.

For working principles, historical decisions, and lessons from completed work, see `docs/decisions.md`.

Last updated: late-May 2026 (post-morning-arc reconciliation).

---

## Crowds design pass — open items

- **Crowds list controls (sort/filter):** **defer until testing shows a real need.** Watch tester feedback for "I have too many crowds" or "I can't find [name]" before designing the controls.

---

## Wider TestFlight readiness

Internal TestFlight has been painful for adding testers. Moving to external testing (up to 10,000 users) requires Apple's Beta App Review on the operational side, plus a small set of followups items that meaningfully affect first-impression quality. Listed here as a filtered view of the items below.

**Genuine blockers:** both shipped.
- Cleanup script for production — shipped, see `docs/decisions.md`.
- Server validation of post coordinates — shipped (rate-limit version), see `docs/decisions.md`.

**Strong-soft blockers (would meaningfully reduce first-impression quality):**

- Onboarding / first-launch identity rotation UX — see Deferred design surfaces. Internal testers can have the privacy model explained; wider testers can't.
- Field-level error rendering for server validation errors — see Mobile-specific. More testers surface more edge cases; generic toasts won't scale.

**Not actually on this track (despite previous framing):**

- Deploy notifications. Filed in Deploy and CI. At current team shape (solo dev, 1-2 testers, one collaborator joining), failed deploys get noticed within hours via tester reports or your own check-ins. Worth wiring up when the team shape — number of collaborators, tester pool size, time-zone spread — actually justifies a notification channel. Until then it's premature ceremony.

**Not a code item but on the same track:**

- Apple Beta App Review for TestFlight external testing. Operational work (app metadata, screenshots, beta description, content warnings, export compliance). Can run in parallel with the code items above; typically a few days to a week of Apple review time after submission.

When the strong-soft blockers are addressed (or you decide they don't apply), the path to wider TestFlight is open. Everything else in this doc is either polish, longer-horizon work, or pending tester feedback.

## Deferred design surfaces (from the Ember migration)

These were intentionally out of scope for the design migration but will need attention as the app matures.

- **Post-detail screen.** When a user taps a post, what do they see? Privacy-aware design: should show context without revealing exact origin coordinates. A relative-distance diagram, not a map pin.
- **Settings/preferences screen.** Doesn't exist yet. Will need: location permission status, notification preferences (when notifications exist), identity rotation, app version, sign out / wipe data.
- **Error/loading states beyond toast.** Today: toasts for everything. Better: empty states for failure modes, inline retry affordances, contextual error messages. (Partially addressed in stale-location fix: FeedScreen now has a "Can't find you" retry block; CreateMessageScreen has the locating state machine.)
- **NFC tap flow.** Currently a "coming soon" modal with honest copy. Adding `react-native-nfc-manager` requires switching to a dev client (which the project effectively now uses for local builds, so the dev-client switch is no longer the blocker it was) and adding iOS NFC entitlements. When implemented, fold into the unified `JoinCrowdModal` state machine alongside the QR flow rather than as a sibling Modal.
- **Onboarding / first-launch identity rotation UX.** Currently identity is generated silently on first launch. Worth a real "this is what anonymous means here" first-launch screen, especially given the now-coherent two-tier identity model (globalUserId + crowd-specific IDs). The user should understand what each is for.
- **Accessibility audit.** VoiceOver labels on every interactive element, Dynamic Type support beyond `allowFontScaling=false` on the Ring, color-contrast verification, focus order through screens.

---

## Identity model — open items

Background: `docs/decisions.md` → Identity model rearchitecture.

- **Eight orphaned crowds in the production dev DB from Round 2 testing.** Memberships keyed by mainUserId from before Round 4. Will self-clean within 24h via expiration; no action needed.

---

## QR scan saga — open items

Background: `docs/decisions.md` → QR scan modal-stacking saga.

- **TapNfcModal is a sibling Modal.** Safe today because it's a one-shot info modal with no follow-up coordination. If NFC ever grows into a real lookup-confirm-consume flow, fold it into the unified `JoinCrowdModal` state machine alongside the QR flow. Filed in PR #70 body.

---

## Technical follow-ups (cross-phase)

### Testing infrastructure

- **React Native component testing setup.** Mobile's Jest is `testEnvironment: 'node'` and has never been wired for RN component rendering. Decision needed: jest-expo + @testing-library/react-native, vs. Maestro for flows, vs. Detox for E2E. The work isn't just preset config; also writing native-module mocks (Appearance, expo-location) and tuning `transformIgnorePatterns`. Single deliberate piece of work, not folded into another phase. Especially relevant after PR #70: the unified Modal state machine has internal states that would benefit from component-level tests rather than integration tests.
- **Test helper drift from real migrations.** `apps/server/__tests__/helpers/testDb.ts` hand-mirrors migration SQL inline. This is what allowed the 6-index schema/migration drift to go unnoticed. Replace inlined SQL with the actual Drizzle migration runner so tests exercise the same code path production will.

### Build and dependency hygiene

- **Source-direct workspace exports.** Workspaces consume each other via compiled `dist/` (`@repo/shared`, `@repo/api` have `"main": "dist/index.js"`). Every CI step that touches workspace types has to remember to run the build first; we hit this pattern bug at least three times in Phase A and again in Phase C's Vercel build. The clean fix is the `exports` field with TS resolution, or publishing ESM. This eliminates a class of "I forgot to build first" bugs.
- **Phantom-dependency audit.** The Zod 3-vs-4 split in Phase A was an unused dep affecting hoisting. Suspect more exist. Run `depcheck` or `knip` across the monorepo. Standalone follow-up, not gated to any phase.
- **`packages/api` CJS-only emit.** Works but is the older module format. ESM migration of the workspace would simplify Rollup's job in devtools and eliminate the `commonjsOptions` config entirely. Cross-cutting (server consumes shared directly), so this is a real piece of work.

### Server-side defense in depth

- **Accuracy threshold in post validation.** GPS readings carry an `accuracy` field (radius of confidence in meters). A 0.1 km post with ±500 m accuracy is essentially randomly geotagged. Reject readings where `accuracy > radiusMeters / 2` (so a 100m post needs ±50m or better; a 5km post is happy with ±2.5km). Worth implementing once we have data on what real-world accuracy distributions look like.

### Deploy and CI

- **Test gating before deploy.** C6's deploy workflows fire on push to main directly; the existing test workflow runs in parallel, not as a blocker. A future tightening would make `Deploy Server`'s `needs:` reference the test job. Filed as Phase E concern (let deploy workflows stabilize first; isolate test-gating bugs from deploy-config bugs).
- **`/health` could go deeper.** Currently verifies DB connection via SELECT 1. Could verify schema version, all expected tables exist, etc. Probably not worth doing until production failures motivate it; deeper probes can fail-loop a deploy if migrations are mid-application.
- **Deploy notifications.** Workflow status only visible in Actions tab. Slack/Discord/email hooks would be straightforward additions when the dev environment becomes the thing real testers hit.
- **Shared schema changes require server image rebuild.** `packages/shared` isn't bind-mounted into the dev compose container; schema changes need `docker compose up -d --build server` before the running server picks them up. Bind-mount `packages/shared/dist` into the dev compose so a host `pnpm --filter @repo/shared build` propagates without an image rebuild. Low priority while shared schema churn is rare.

### Mobile-specific

- **Slider thumb fidelity.** The Ember design called for paper background + 2px ember border on slider thumbs. `@react-native-community/slider` doesn't support custom thumb components. Switching to `@miblanchard/react-native-slider` (which does) or building a slider from scratch with `react-native-gesture-handler` + `react-native-reanimated` are the two paths.
- **`useRelaySettings` singleton under Suspense.** Today it's a singleton via `useSyncExternalStore`. If it ever needs to render in Suspense / Concurrent contexts, the in-memory state could drift from AsyncStorage. Wrap in a Provider if scaling.
- **Pre-existing TS errors in `apps/mobile/tests/`.** Resolved by deletion in Phase A. Listed here only because the historical reports reference it.
- **`refreshLocation` cleanup for consistency.** The existing `refreshLocation` on `useLocation` still calls `requestForegroundPermissionsAsync` on every invocation (re-prompts every time). It's no longer on the hot path (replaced by `getFreshLocation` for action-time use), but worth collapsing to use the same `getFreshLocation` semantics (read permission first, request only when missing) for consistency. Small future cleanup.
- **Field-level error rendering for server validation errors.** The server now returns `{ error: 'ValidationError', issues: [...] }` with structured field paths and messages on 400s (per the ZodError → 400 standardization). The mobile client's API service falls back to a generic toast instead of surfacing per-field messages. Worth implementing when the next screen with multiple fields lands (Settings/preferences, onboarding identity rotation) — those screens benefit most from "this field is wrong, here's why" feedback. Until then, the toast fallback is fine for the existing single-field flows.
- **Background location strategy.** Independent of the stale-location fix: do we ever want the app to refresh location in the background, or on app-resume via `AppState` listeners? If yes, separate design conversation about battery, permissions, iOS background modes. The on-demand fresh fetch at action time covers the immediate need; background tracking is a future optimization with real costs.

### Repo hygiene observations

- **Build-before-typecheck pattern.** Same root cause as the source-direct exports item above. Every new CI step that touches workspace types has to remember the prereqs. The Vercel build command is verbose because of it. Fixed structurally by switching to source-direct workspace exports.
- **`pnpm.packageExtensions` and `.npmrc public-hoist-pattern[]=*@babel/*`.** Load-bearing for the React Native build. Documented in CONTRIBUTING.md as "don't delete these without reading this." If a new contributor strips them, Metro breaks.
- **`vite.config.ts process.env shim`.** `define: { 'process.env': {} }` is load-bearing for some dependency that does a runtime check. Devtools' own consumer code correctly uses `import.meta.env`, but if anyone adds a new dependency that reads `process.env` at runtime, it'll silently get `{}`. Comment-on-line in a future cleanup.
- **PR-merge path now exercised.** PRs #68, #69, and #70 went through the full PR review and merge cycle, so the deploy workflows are validated for that path.

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

### Local dev environment setup

After the May 2026 yak-shave, the steps to get a fresh machine running:

1. `pnpm install` from repo root.
2. `apps/mobile/.env` with `EXPO_PUBLIC_API_URL` pointing at either the Fly URL (for testing against production-like backend) or your Mac's LAN IP (for fully-local dev).
3. For local dev: ensure Docker isn't holding port 8080 (`lsof -i :8080`); start `docker compose up -d` for Postgres; run `pnpm migrate` from `apps/server`; start `pnpm dev:server`.
4. For mobile dev builds on a physical device: open `apps/mobile/ios/Crowd.xcworkspace` in Xcode once, ensure team is selected and automatic signing is on. After that, `pnpm expo run:ios --device` works from CLI.
5. Make sure your phone's iOS version has matching platform support installed in Xcode → Settings → Components.

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
- **Proximity-join specific:** does the QR scan flow feel natural, or do people get confused about who scans whom?
- **Deep link specific:** does anyone try to tap a `crowd://` link and get confused when nothing happens? That's the signal that deep-link receive is the next priority.
- **Location permission specific:** does anyone get stuck on the permission_denied flow? Does the "Open Settings" affordance work? Do they re-grant successfully?
- **Identity rotation specific:** does anyone notice when their globalUserId rotates? Does anything feel "lost" to them in that moment? (It shouldn't, by design — Crowds and crowd-specific identity survive — but watch for confusion.)

The decisions worth making in Phase E will be informed by these answers, not by the backlog above.

---

## Add new follow-ups below

(reserve space for items that surface during testing, in future phases, or in the natural drift of working on the project)
