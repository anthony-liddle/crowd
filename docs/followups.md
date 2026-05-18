# Crowd — Follow-ups and Need-to-Knows

A running document of work that's been deferred, observations worth carrying forward, and things future-you will want to know. Keep this updated as new items surface; treat it as a working backlog rather than a static list.

Last updated early-May 2026 (after the identity model rearchitecture, the testing-blockers fix-pass, the QR scan modal-stacking saga, and the structural rewrite to a unified Modal).

---

## Working principles to keep applying

These emerged from doing the work across all phases. Worth holding onto for any future project, not just Crowd.

- **Verify before remediate.** Prompts and reports describe state; the code is the source of truth. Run the cheap commands that confirm state before acting on described state.

- **Honesty over deferral.** When drift surfaces inside a phase, fix it inside that phase. Booking it for "later" usually means it accumulates with other deferrals into a thorny pile.

- **Treat described state as hypothesis.** Whether the source is a prompt, a previous report, or your own mental model, "what's true now" needs verification. Cheap verification beats building on a wrong assumption.

- **Don't expand the testing surface inside cleanup phases.** "Fix or delete what exists" is the rule; standing up new test infrastructure is its own piece of work that deserves dedicated attention.

- **Migration filenames are part of the deploy timeline.** Rename auto-generated names to read like changelog entries. Codified in CONTRIBUTING.md.

- **The continue-on-error round-trip pattern.** When you have to land a known-broken state to enable later work, gate it explicitly with a comment naming the next phase that removes it. Future-you grepping for `continue-on-error` finds the trail.

- **Layer of testing matters.** Test behavior at the layer the contract lives, not below it. HTTP integration tests beat ORM-layer assertions because the HTTP boundary is what consumers depend on; the ORM is an implementation choice that can change.

- **Job independence over CI minutes.** A failing job's name should tell you specifically what's broken. Don't merge separate concerns into one job to save CI time; useful redundancy is worth its cost.

- **Verify the diagnosis before applying the fix.** Phase C5's "What I got wrong" surfaced this: pushing a fix without confirming it actually addresses the symptom (e.g., bundle still had unresolved require()) costs a round-trip. Cheap verification commands like grep against the built artifact would have caught the issue on iteration zero.

- **Instrument first, fix second on hard bugs.** When a hypothesis-driven fix doesn't resolve a symptom, the next move isn't another hypothesis. It's adding diagnostic logs to find ground truth. The QR scan saga went through two iterations of guessing at modal stacking before instrumentation revealed the actual mechanism (three Modals churning lifecycle events in 32ms, not two). The instrument-first iteration would have been cheaper than the two guess-first iterations combined.

- **Designs that resist simple explanation are usually unfinished.** The identity model went through four iterations before settling on "globalUserId for the global feed, crowd-specific IDs for everything Crowds, each lives only as long as its purpose does." That sentence is the test of whether the design has settled. Earlier iterations couldn't be summarized that cleanly because they had unresolved tensions.

---

## Onboarding readiness review (May 2026)

A codebase review was done before bringing on a collaborator. The review applied three lenses (clean / makes sense / well-documented) and produced findings categorized by severity.

Fixed in the highest-value-hour pass:
- Root README setup section reconciled with current reality (per-app `.env.example` files, `pnpm dev:up` + `pnpm dev:seed` path, explicit `apps/mobile/.env` requirement)
- PostGIS claims removed from `apps/server/README.md`
- `apps/mobile/.env.example` default flipped to the dev backend URL so a fresh checkout works on a physical device out of the box

Subsequently completed in the deferred documentation pass:

- `docs/design-system.md` created — the Ember design system documented with light/dark tokens, type ramp, spatial primitives, depth model, and a "known drift" section
- `apps/mobile/PROJECT_STRUCTURE.md` deleted and the root README pointer removed
- `apps/mobile/README.md` rewritten with Crowd-specific content (Ember pointer, identity model pointer, deep link pointer, `.env` requirement)
- `.notes/` moved to `docs/archive/` with "snapshot, not current" headers on each file
- `docs/README.md` created as a navigation hub for the docs/ directory
- `apps/mobile/src/screens/_DesignTest.tsx` annotated with a top-of-file JSDoc explaining its purpose
- Misleading TODO in `apps/mobile/src/services/api.ts:37` reworded to accurately describe `DEFAULT_LOCATION`'s current role
- `CONTRIBUTING.md` placeholder repo URL fixed (`yourusername` → `anthony-liddle`)
- `proximity_tokens` table added to the schema section of `apps/server/README.md`

The `### Documentation accuracy` subsection under Technical follow-ups was removed after all items shipped.

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

- ~~**QR generation flow on the Invite button.**~~ Shipped in the testing-blockers fix-pass. Open crowds use Share.share(); private crowds open a `PrivateInviteSheet` modal with QR + countdown + regenerate button. Both work end-to-end.
- ~~**Lookup-token endpoint for pre-join confirmation.**~~ Shipped. `POST /crowds/lookup-token` returns crowd metadata without consuming the token.
- ~~**Crowd-specific user-id rotation when joining via token.**~~ Replaced entirely by the four-iteration identity model rearchitecture (see below).
- ~~**Server tests for proximity token endpoints.**~~ Added. 7 new tests cover owner mint, non-owner reject, lookup idempotency, single-use consume, backdated-expiry reject, unknown token, malformed payload.

Crowds list controls (sort/filter): **defer until testing shows a real need.** Watch tester feedback for "I have too many crowds" or "I can't find [name]" before designing the controls.

---

## Identity model rearchitecture (May 2026, four iterations on PR #68)

Status: settled. The final design has clean separation between globalUserId (for the global feed only, rotates with content) and crowd-specific IDs (per crowd, stable for the membership's lifetime, survive globalUserId rotation, purged on leave or expiration).

The arc:

- **Round 1 (original):** crowd-specific IDs for memberships with N+1 fetch on `getMyCrowds` and a misguided create-then-leave-rejoin sequence that broke private crowd creation entirely.
- **Round 2:** simplified to mainUserId everywhere — broke the rotation privacy property (memberships died when globalUserId rotated, which it does whenever content runs out).
- **Round 3:** restored crowd-specific IDs for memberships with a bulk-lookup endpoint, but kept ownership tied to mainUserId — meant users lost owner status on their own crowds when they rotated.
- **Round 4 (final):** clean separation. globalUserId for the global feed only. Crowd-specific IDs for ownership, membership, message authorship, getMyCrowds — everything in the Crowds domain. IDs purged on leave (immediate) and on crowd expiration (lazy, via lookup response cross-reference). Server has zero awareness of globalUserId in any Crowds endpoint.

The privacy properties that survive: rotation across globalUserId remains intact (a user's global feed activity isn't linkable across rotation). Cross-crowd unlinkability of message authorship is preserved (each crowd uses a different ID for message authoring). The privacy property that's deliberately abandoned: memberships within a single device are linkable to each other in the database via shared crowd-specific IDs over a crowd's lifetime — but that's bounded by the crowd's 24-hour lifespan, and the only place the linkage between a user's various crowd identities exists is on the device.

What worked about the iteration process: each round taught us something the previous couldn't see. Round 1 surfaced the broken rejoin pattern. Round 2 surfaced the rotation property we hadn't been protecting. Round 3 surfaced the ownership-tied-to-rotating-id problem. Round 4 settled. Designing the final shape upfront wasn't possible because the constraints weren't all visible until the work surfaced them.

Followups from this pass:

- **Validation error returns 500 on the server (should be 400).** Several handlers use the convention `try { Schema.parse(body); ... } catch (err) { return reply.status(500).send(...) }`, so malformed inputs surface as 500 Internal Server Error rather than 400 Bad Request. The proximity-token tests assert this current behavior so they pass today, but it's wrong — schema-validation failures are client errors. Cross-cutting cleanup: catch `ZodError` specifically and return 400 with the issues, falling back to 500 for everything else. Update the existing tests to expect 400 in the same change. Low priority but a real polish item before production.
- **Eight orphaned crowds in the production dev DB from Round 2 testing.** Memberships keyed by mainUserId from before Round 4. Will self-clean within 24h via expiration; no action needed.
- **Two shared-schema test files** (`packages/shared/__tests__/schemas.test.ts` and `packages/shared/tests/schemas.test.ts`) — overlapping coverage, likely a leftover from a directory rename. Updated both consistently in Round 4. Worth deduping in a separate small PR.

---

## Testing-blockers fix-pass (May 2026)

Status: shipped. Three real bugs surfaced from initial real-device testing with a partner.

- **Keyboard covered Create modal input.** Fixed by wrapping CreateCrowdModal and JoinCrowdModal in `KeyboardAvoidingView` with iOS padding behavior.
- **Open-crowd Invite share flow.** Built `PrivateInviteSheet` for private crowds (QR code + countdown + regenerate). Open crowds use `Share.share()` with the invite link. Bug 2 from the original brief ("creator not added to private crowds") turned out to be a misread of the Invite-button-doesn't-work symptom; once Fix 3 landed, the underlying complaint resolved.
- **Parser robustness.** `parseCrowdInvite` now tolerates trailing slashes on both `crowd://join/<id>/` and the `cid` query value of token URLs. 10 new unit tests cover the variants.

---

## QR scan modal-stacking saga (PR #69 → PR #70)

Status: settled. Documented here at length because the lessons compound.

**The bug:** scanning a QR code for a private crowd bypassed the confirmation modal and froze the app on the Crowds screen. Membership never landed server-side.

**PR #69 (didn't work):** modal-stacking diagnosis with a 350ms defer between scanner dismissal and confirmation modal presentation. Reasonable hypothesis based on observable symptoms; merged after passing real-device verification on the dev's setup. Real-device testing with a partner showed the symptom persisted after merge.

**The diagnostic instrumentation pass:** added structured `[QR-SCAN]` console logs at every state transition in the scan flow. Real-device repro with the instrumented build gave a clear timeline.

**The actual mechanism:** three Modals all changed lifecycle state in 32ms. The main `JoinCrowdModal` dismissed (because confirmation took its place in the visibility expression), the scanner Modal dismissed (because the scan was complete), and the confirmation Modal tried to present. iOS dropped the third presentation. PR #69's defer protected against scanner-vs-confirmation racing but didn't address main-vs-confirmation racing because they were both triggered by the same setState call.

**PR #70 (the structural fix):** rewrote `JoinCrowdModal` as a state machine with one Modal that internally swaps views (`scanning | looking-up | confirming | joining-* | idle`). State transitions don't involve Modal lifecycle; they're just React renders inside one persistent Modal. The iOS mechanism that dropped the third presentation has nothing to act on.

**Followups from this pass:**

- **TapNfcModal is a sibling Modal.** Safe today because it's a one-shot info modal with no follow-up coordination. If NFC ever grows into a real lookup-confirm-consume flow, fold it into the unified `JoinCrowdModal` state machine alongside the QR flow. Filed in PR #70 body.

**Lessons that compound:**

- The instrument-first principle was added to the working principles list above. Two iterations of "fix based on hypothesis" cost more than one iteration of "instrument, observe, fix" would have. Worth remembering on any future bug where a hypothesis-driven fix doesn't resolve the symptom.
- iOS Modal lifecycle is a real abstraction with real failure modes. Multi-Modal coordination via state flags is structurally fragile because React batches state updates and iOS expects sequential lifecycle events. The structural answer is "one Modal with internal state" rather than "multiple coordinated Modals." Apply this pattern preemptively to any future flow that has a lookup-confirm-consume shape.

---

## Local development environment yak-shave observations (May 2026)

Surfaced during the QR scan diagnostic work. Filed here so future-you doesn't re-discover them.

- **Docker compose holds port 8080 if you started it earlier.** When `pnpm dev:server` (which runs `tsx watch`) tries to start, it silently fails to bind because Docker is already on the port. The dev server's logs may not surface this clearly. Symptom: `lsof -i :8080` shows `com.docke` listening, not `node`. Recovery: `lsof -ti :8080 | xargs kill -9` then restart `pnpm dev:server`. Worth adding a startup check to the dev script that fails loudly if 8080 is already taken.
- **Local DB schema can be stale relative to source code.** Running migrations is a manual step (`pnpm migrate` from `apps/server`). When you pull a branch with new migrations, you need to run them locally before the dev server can serve those endpoints. Symptom: queries return "Failed query: select ... from <table>" with truncated error messages. Worth adding a startup check to the dev server that compares applied migrations against expected migrations and warns on drift.
- **Expo env files belong in `apps/mobile/`, not the repo root.** The repo root `.env` is read by the server and devtools (which use dotenv directly), but Expo doesn't look there. Mobile builds need their own `apps/mobile/.env`. Without it, `EXPO_PUBLIC_API_URL` falls back to whatever default the source code has (currently `http://localhost:8080` which doesn't work from a phone). Worth either (a) configuring Expo to read the root `.env` or (b) creating `apps/mobile/.env` and gitignoring it consistently.
- **Fail-loud instead of localhost-fallback.** The current code defaults to `http://localhost:8080` if `EXPO_PUBLIC_API_URL` is missing. From a phone, localhost is the phone itself, which produces "Network request failed" errors with no clear cause. Fail-loud (throw at startup, or render an error screen) would be more debuggable. Small fix; worth doing.
- **iOS platform versions can lag the phone's OS.** When iOS auto-updates the phone past what Xcode's installed platforms cover, dev builds fail with "iOS X.Y is not installed." Fix is to download the matching platform via Xcode → Settings → Components. Sometimes Xcode itself needs updating first (App Store).
- **Provisioning profiles need attention on first build per environment.** First time you build to a physical device on a new dev environment, Xcode needs to generate a provisioning profile. Open the project in Xcode (`open apps/mobile/ios/Crowd.xcworkspace`), Signing & Capabilities tab, ensure team is selected and "Automatically manage signing" is on. One-time setup per machine.
- **Dev build vs TestFlight build coexistence.** They use the same bundle identifier. Installing one over the other is fine; running both at once on the same device isn't.

These are all real-world problems future-you will hit if working on multiple machines or after long breaks. Worth a "Local development setup" doc that walks through them, or just keep this list updated.

---

## Deferred design surfaces (from the Ember migration)

These were intentionally out of scope for the design migration but will need attention as the app matures.

- **Post-detail screen.** When a user taps a post, what do they see? Privacy-aware design: should show context without revealing exact origin coordinates. A relative-distance diagram, not a map pin.
- ~~**Populated Crowds state full redesign.**~~ Addressed in the Crowds design pass (May 2026). New section split, owned/joined visual distinction via paper-tint background, expiring-soon ember treatment.
- **Settings/preferences screen.** Doesn't exist yet. Will need: location permission status, notification preferences (when notifications exist), identity rotation, app version, sign out / wipe data.
- **Error/loading states beyond toast.** Today: toasts for everything. Better: empty states for failure modes, inline retry affordances, contextual error messages. (Partially addressed in stale-location fix: FeedScreen now has a "Can't find you" retry block; CreateMessageScreen has the locating state machine.)
- ~~**Proximity-join flow for private crowds (QR receive).**~~ Shipped in the Crowds design pass; fixed properly in PR #70.
- ~~**Proximity-join flow for private crowds (QR send / Invite generation).**~~ Shipped in the testing-blockers fix-pass.
- **NFC tap flow.** Currently a "coming soon" modal with honest copy. Adding `react-native-nfc-manager` requires switching to a dev client (which the project effectively now uses for local builds, so the dev-client switch is no longer the blocker it was) and adding iOS NFC entitlements. When implemented, fold into the unified `JoinCrowdModal` state machine alongside the QR flow rather than as a sibling Modal.
- **Onboarding / first-launch identity rotation UX.** Currently identity is generated silently on first launch. Worth a real "this is what anonymous means here" first-launch screen, especially given the now-coherent two-tier identity model (globalUserId + crowd-specific IDs). The user should understand what each is for.
- **Accessibility audit.** VoiceOver labels on every interactive element, Dynamic Type support beyond `allowFontScaling=false` on the Ring, color-contrast verification, focus order through screens.

---

## Deep linking and invite share flow

Currently the invite link `crowd://join/<id>` is shared via Share.share() but isn't tappable: tapping it from outside the app doesn't open the app because the URL scheme isn't registered.

The send side (Invite button generates and shares) is now built. The receive side (tapping a `crowd://` URL opens the app and routes to the right screen) is not.

What's needed:

- Add `"scheme": "crowd"` to `app.json`.
- Wire React Navigation's `linking` config to route `crowd://join/:id` and `crowd://join-token/:token` to the appropriate screens.
- Handle cold launch (app not running), warm launch (app backgrounded), app-already-in-different-state (e.g., user is mid-create when a deep link arrives), malformed URLs, nonexistent crowds, expired tokens.
- Use the same confirmation flow as the QR scan path (the unified `JoinCrowdModal` state machine handles this naturally — deep link entry just sets the initial state to `looking-up` instead of `scanning`).

Realistic estimate: 2-3 hours including testing. The receive side is now smaller than the previous estimate because the unified Modal eliminates a lot of the "where does the deep link land?" routing ambiguity.

Universal Links / App Links (`https://crowd.app/...`) are a separate, larger piece of work for production. Custom scheme is fine for dev and TestFlight.

---

## Technical follow-ups (cross-phase)

### Testing infrastructure

- **React Native component testing setup.** Mobile's Jest is `testEnvironment: 'node'` and has never been wired for RN component rendering. Decision needed: jest-expo + @testing-library/react-native, vs. Maestro for flows, vs. Detox for E2E. The work isn't just preset config; also writing native-module mocks (Appearance, expo-location) and tuning `transformIgnorePatterns`. Single deliberate piece of work, not folded into another phase. Especially relevant after PR #70: the unified Modal state machine has internal states that would benefit from component-level tests rather than integration tests.
- **Test helper drift from real migrations.** `apps/server/__tests__/helpers/testDb.ts` hand-mirrors migration SQL inline. This is what allowed the 6-index schema/migration drift to go unnoticed. Replace inlined SQL with the actual Drizzle migration runner so tests exercise the same code path production will.
- **`createApp.ts` test-app drift.** Same shape of problem as the `testDb.ts` migration-SQL inlining: `apps/server/__tests__/helpers/createApp.ts` is a hand-mirrored copy of the production routes in `apps/server/src/app.ts`. Surfaced again during Round 4 — every endpoint change had to be made in both files. Fix is the same shape: delete `createApp.ts` and have integration tests instantiate the real `buildApp()` (passing the test connection string via env or a small DI seam). Right time to address this is during the React Native component testing infrastructure pass — both helpers' lifetimes are tied to the testing-infra story.
- **ZodError → 400 standardization.** See the identity-model followups section above.

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
- ~~**`apps/mobile/src/screens/_DesignTest.tsx` is unreferenced.**~~ Shipped in the deferred documentation pass (JSDoc block added explaining the component gallery role).
- ~~**Misleading TODO in `apps/mobile/src/services/api.ts:37`.**~~ Shipped in the deferred documentation pass (comment reworded to describe `DEFAULT_LOCATION`'s current dormant-fallback role; constant retained pending caller audit).

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