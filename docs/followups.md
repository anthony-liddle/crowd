# Crowd — Active Followups

The working backlog of what's pending. Lean by design — when items ship, they move to `docs/decisions.md` rather than accumulating here as completion records.

For working principles, historical decisions, and lessons from completed work, see `docs/decisions.md`.

Last updated: early-June 2026 (Expo SDK 54 → 55 shipped without requiring TS 6; relay affordance redesign and loading-state wire-up shipped; orphaned `composite` flag dropped; the TS-6/SDK-coupling lesson and the relay-redesign arc moved to `docs/decisions.md`).

---

## Crowds design pass — open items

- **Crowds list controls (sort/filter):** **defer until testing shows a real need.** Watch tester feedback for "I have too many crowds" or "I can't find [name]" before designing the controls.

---

## Wider TestFlight readiness

Internal TestFlight has been painful for adding testers. Moving to external testing (up to 10,000 users) requires Apple's Beta App Review on the operational side. The code-side first-impression blockers have shipped; what remains is the operational review plus the not-on-this-track notes below.

**Genuine blockers:** both shipped.
- Cleanup script for production — shipped, see `docs/decisions.md`.
- Server validation of post coordinates — shipped (rate-limit version), see `docs/decisions.md`.

**Not actually on this track (despite previous framing):**

- Deploy notifications. Filed in Deploy and CI. At current team shape (solo dev, 1-2 testers, one collaborator joining), failed deploys get noticed within hours via tester reports or your own check-ins. Worth wiring up when the team shape — number of collaborators, tester pool size, time-zone spread — actually justifies a notification channel. Until then it's premature ceremony.

**Not a code item but on the same track:**

- Apple Beta App Review for TestFlight external testing. Operational work (app metadata, screenshots, beta description, content warnings, export compliance). Can run in parallel with the code items above; typically a few days to a week of Apple review time after submission.

With the blockers shipped, the path to wider TestFlight is open — the remaining gate is operational (Apple Beta App Review). Everything else in this doc is either polish, longer-horizon work, or pending tester feedback.

## Deferred design surfaces (from the Ember migration)

These were intentionally out of scope for the design migration but will need attention as the app matures.

- **Post-detail screen.** When a user taps a post, what do they see? Privacy-aware design: should show context without revealing exact origin coordinates. A relative-distance diagram, not a map pin.
- **Error/loading states beyond toast.** Today: toasts for everything. Better: empty states for failure modes, inline retry affordances, contextual error messages. (Partially addressed in stale-location fix: FeedScreen now has a "Can't find you" retry block; CreateMessageScreen has the locating state machine.)
- **NFC tap flow.** Currently a "coming soon" modal with honest copy. Adding `react-native-nfc-manager` requires switching to a dev client (which the project effectively now uses for local builds, so the dev-client switch is no longer the blocker it was) and adding iOS NFC entitlements. When implemented, fold into the unified `JoinCrowdModal` state machine alongside the QR flow rather than as a sibling Modal.
- **Identity-model education.** First-launch onboarding shipped (#109) with the privacy framing ("Built to forget"; "No accounts. No logins. No trace."; "your identity rotates with them") and the location ask, re-accessible after first launch via "How Crowd works" on the You tab. What's still deferred: deeper identity-model education explaining the two-tier system (globalUserId rotating with content; crowd-specific IDs persisting per crowd). Today the user understands ephemerality at a high level, but the mechanics of which identity rotates when are not surfaced.
- **Accessibility audit.** VoiceOver labels on every interactive element, Dynamic Type support beyond `allowFontScaling=false` on the Ring, color-contrast verification, focus order through screens.
- **Background location refresh.** Should the app ever refresh location in the background, or on app-resume via `AppState` listeners? The on-demand fresh fetch at action time (from the stale-location fix) covers the immediate need; background tracking is a future optimization with real costs — battery, permissions, iOS background modes — and deserves its own design conversation if pursued.

---

## QR scan saga — open items

Background: `docs/decisions.md` → QR scan modal-stacking saga.

- **TapNfcModal is a sibling Modal.** Safe today because it's a one-shot info modal with no follow-up coordination. If NFC ever grows into a real lookup-confirm-consume flow, fold it into the unified `JoinCrowdModal` state machine alongside the QR flow. Filed in PR #70 body.

---

## Technical follow-ups (cross-phase)

### Testing infrastructure

- **React Native component testing setup.** **Deferred by policy** — standing up new test infrastructure is its own piece of work and is deliberately not folded into any cleanup phase (see the "don't expand the testing surface inside cleanup phases" principle in `docs/decisions.md`). Mobile's Jest is `testEnvironment: 'node'` and has never been wired for RN component rendering. Decision needed when picked up: jest-expo + @testing-library/react-native, vs. Maestro for flows, vs. Detox for E2E. The work isn't just preset config; also writing native-module mocks (Appearance, expo-location) and tuning `transformIgnorePatterns`. Pick up as dedicated work when component-level coverage of the unified Modal state machine (PR #70 — internal states that would benefit from component-level rather than integration tests) becomes worth the preset/mock setup cost.

### Build and dependency hygiene

- **Phantom-dependency audit.** **Deferred until a hoisting/build oddity motivates it.** The Zod 3-vs-4 split in Phase A was an unused dep affecting hoisting. Suspect more exist. When something surfaces, run `depcheck` or `knip` across the monorepo. Standalone follow-up, not gated to any phase.
- **`packages/api` CJS-only emit.** Works but is the older module format. ESM migration of the workspace would simplify Rollup's job in devtools and eliminate the `commonjsOptions` config entirely. Cross-cutting (server consumes shared directly), so this is a real piece of work.
- **`process.env` reference in `packages/api/src/client.ts`.** Source-direct workspace exports surfaced a latent environment dependency that compiled output was hiding. The current code works in every consumer (Vite substitutes `process.env`, Node has it natively, Metro's babel handles it via the env preset), but it's not strictly isomorphic — the package presents as portable code while quietly requiring an ambient `process` object. Probably worth replacing with an explicit config-passed-in pattern when next touched. Not blocking; the code works today.

### Server-side defense in depth

- **Accuracy threshold in post validation.** Investigated and set aside as a security defense. The proposed rule (`accuracy > radiusMeters / 2`) inverts under its own threat model — a spoofer fabricates the whole payload including the accuracy value, so it sails through; the rule only catches honest users with a genuinely poor GPS fix, and its binding cases (small radii) fail exactly in Crowd's core environments (dense crowds, indoors, urban canyons). See `docs/decisions.md` → "Accuracy threshold on POST /messages (investigated, not shipping)" for the full reasoning. If location-accuracy is ever revisited, the honest shapes are a client-side soft warning (a user-help nudge, not a defense) or plumb accuracy through and persist it without acting on it, then pick any threshold from real data.

### Deploy and CI

- **Test gating before deploy.** C6's deploy workflows fire on push to main directly; the existing test workflow runs in parallel, not as a blocker. A future tightening would make `Deploy Server`'s `needs:` reference the test job. Filed as Phase E concern (let deploy workflows stabilize first; isolate test-gating bugs from deploy-config bugs).
- **`/health` could go deeper.** Currently verifies DB connection via SELECT 1. Could verify schema version, all expected tables exist, etc. Probably not worth doing until production failures motivate it; deeper probes can fail-loop a deploy if migrations are mid-application.
- **Deploy notifications.** Workflow status only visible in Actions tab. Slack/Discord/email hooks would be straightforward additions when the dev environment becomes the thing real testers hit.
- **Shared schema changes require server image rebuild.** `packages/shared` isn't bind-mounted into the dev compose container; schema changes need `docker compose up -d --build server` before the running server picks them up. Bind-mount `packages/shared/dist` into the dev compose so a host `pnpm --filter @repo/shared build` propagates without an image rebuild. Low priority while shared schema churn is rare.

### Mobile-specific

- **Slider thumb fidelity.** The Ember design called for paper background + 2px ember border on slider thumbs. `@react-native-community/slider` doesn't support custom thumb components. Switching to `@miblanchard/react-native-slider` (which does) or building a slider from scratch with `react-native-gesture-handler` + `react-native-reanimated` are the two paths.
- **RelayButton chip border is 0.5px.** May render too faintly on some lower-density Android screens. When Android scope opens, verify the chip is visible at native density; if not, switch to `StyleSheet.hairlineWidth` or 1px. One of several Android-readiness checks for the chip surface.

### Repo hygiene observations

- **`pnpm.packageExtensions` and `.npmrc public-hoist-pattern[]=*@babel/*`.** Load-bearing for the React Native build. Documented in CONTRIBUTING.md as "don't delete these without reading this." If a new contributor strips them, Metro breaks.
- **`vite.config.ts process.env shim`.** `define: { 'process.env': {} }` is load-bearing for some dependency that does a runtime check. Devtools' own consumer code correctly uses `import.meta.env`, but if anyone adds a new dependency that reads `process.env` at runtime, it'll silently get `{}`. Comment-on-line in a future cleanup.
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
