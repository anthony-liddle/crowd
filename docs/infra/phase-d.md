# Phase D — EAS Build and TestFlight Automation

Stand-up of the iOS mobile build and distribution pipeline: bundle ID reservation, App Store Connect record, EAS Build configuration, App Store Connect API key auth, and a GitHub Actions workflow that builds and submits to TestFlight on every merge to `main`. Production submission is deferred — this phase targets TestFlight only.

## TL;DR

Crowd has a fully automated mobile build pipeline. Every push to `main` that touches `apps/mobile/**`, `packages/shared/**`, or `packages/api/**` triggers `deploy-mobile.yml` → EAS Build's cloud → EAS Submit → App Store Connect → TestFlight → tester's phone. End-to-end wall-clock is ~30-60 minutes from push to installable build, mostly Apple's processing time.

Live: TestFlight build of `dev.anthonyliddle.crowd` installed on the user's iPhone, hitting the deployed dev API at `https://crowd-dev.fly.dev`.

## Files added or modified, by sub-phase

### D2 — Bundle ID and App Store Connect record

- `apps/mobile/app.json` (modified) — added `expo.ios.bundleIdentifier: "dev.anthonyliddle.crowd"`. Also persisted EAS-injected fields from D3a's interactive flow: `expo.ios.infoPlist.ITSAppUsesNonExemptEncryption: false` (export compliance pre-answer) and `expo.extra.eas.projectId` (EAS project linkage).

### D3 — First manual TestFlight build

- `apps/mobile/eas.json` (modified) — corrected `distribution: "internal"` to `"store"` (TestFlight requires App Store-signed binaries; "internal" is ad-hoc only). Added `autoIncrement: true` so EAS bumps the iOS `buildNumber` per build (Apple requires monotonically increasing numbers across all uploads). EAS also added `cli.appVersionSource: "remote"` during the interactive flow.
- `apps/mobile/assets/icon.png`, `adaptive-icon.png`, `favicon.png` (new) — replaced 0-byte placeholders that broke EAS prebuild. First version was a single dashed ring with a filled center; user feedback identified an unfortunate anatomical reading. Second version (the one that shipped) added a solid middle ring + four cardinal dots between the rings + open ember-stroked center with no fill, matching the in-app Concentric mark more closely.
- `apps/mobile/scripts/generate-icons.py` (new) — Pillow-based icon generator. Renders all three sizes from the same parameterized code, with 4× supersampling + LANCZOS downsample for clean anti-aliased edges. Committed alongside the artifacts so future regeneration is reproducible.
- `.npmrc` (modified) — added `public-hoist-pattern[]=*react-native-worklets*`. CocoaPods' RNReanimated.podspec does a plain Node `require.resolve('react-native-worklets/package.json')` during `pod install`; pnpm's strict layout buries the transitive dep in `.pnpm/...` where the walking-up resolver can't reach it. Mirrors the existing `@babel/*` hoist pattern; same family of bug as the Phase A hoists.
- `apps/mobile/package.json` (modified) — added `"eas-build-post-install"` script that runs `pnpm --filter @repo/shared build && pnpm --filter @repo/api build`. EAS Build's CI does pnpm install then immediately invokes Metro/prebuild — no workspace build in between, so workspace deps' `dist/` was empty and Metro couldn't resolve `@repo/api`. Same family of bug as Phase C's Vercel monorepo build command.
- `CONTRIBUTING.md` (modified) — added the worklets hoist to the "load-bearing config" section so a future maintainer doesn't strip it.

### D4 — GitHub Actions automation

- `apps/mobile/eas.json` (modified) — added a `submit.dev-deployed.ios` profile using App Store Connect API key auth (not Apple ID + password). Hardcoded `appleTeamId: "9ML46U556H"` (after a config-failure iteration where env-var substitution had whitespace contamination — Apple Team IDs aren't actually secret, so hardcoding is cleaner). Hardcoded `ascAppId: "6766116979"`. `ascApiKeyId` and `ascApiKeyIssuerId` use `$VAR` substitution from env vars set by the workflow. `ascApiKeyPath: "./api-key.p8"` references a runtime-written file gitignored via root `*.p8`.
- `.github/workflows/deploy-mobile.yml` (new) — path-filtered, concurrency-mutexed workflow. Steps: install pnpm + Node 22, install EAS CLI, write `api-key.p8` from `ASC_API_KEY_P8` secret with PEM-shape sanity check, invoke `eas build --auto-submit --no-wait`. The build itself runs on EAS Build's cloud (~15-30 min); the runner just orchestrates (~3-5 min).

### D5 — Documentation

- `CONTRIBUTING.md` (modified) — added comprehensive Deployment section coverage of mobile builds: live URLs (TestFlight invite-only), the new `deploy-mobile.yml` row in the auto-deploy table, mobile secrets in the secrets table, manual `eas build` / `eas submit` escape hatches, comprehensive "Mobile builds and TestFlight" subsection covering bundle ID, version number management, wall-clock expectations, how to add testers, and how the `.p8` file works in CI.
- `docs/infra/phase-d.md` (new, this file).
- `docs/infra/README.md` (modified) — adds a row for Phase D.

### Commits

```
1ae12f8  chore(mobile): set iOS bundleIdentifier to dev.anthonyliddle.crowd
ca7f225  fix(mobile): correct dev-deployed distribution to store, enable autoIncrement
450498e  fix(mobile): generate brand-aware app icons from Ember Concentric mark
061b694  fix(mobile): hoist react-native-worklets so CocoaPods can resolve it
7fb02a1  fix(mobile): build workspace deps on EAS, persist EAS-injected config
88ae4f8  ci(mobile): add deploy-mobile workflow with auto-submit to TestFlight
5442779  fix(mobile): correct submit profile field name to ascApiKeyIssuerId
73ef218  docs(contributing): document mobile build pipeline and TestFlight flow
1ead482  fix(mobile): regenerate icons to read as map, not anatomy
71b8da2  fix(mobile): hardcode appleTeamId in eas.json instead of env-var indirection
```

## External resources provisioned

| Resource | Identifier | Notes |
| -------- | ---------- | ----- |
| Apple Developer Team | Team ID `9ML46U556H` (login: `gitaurslinger@hotmail.com`) | pre-existing; just verified active. Not secret — visible in every signed binary. |
| Bundle ID | `dev.anthonyliddle.crowd` | reserved at developer.apple.com; permanent. Capabilities at default (no push, no Sign in with Apple, etc.). |
| App Store Connect record | numeric `ascAppId: 6766116979` ("Crowd") | created in App Store Connect; status "Prepare for Submission" (TestFlight-ready, App Store metadata deferred). |
| EAS project | `liddle77/crowd-app` (UUID `7f7700b7-f926-4cae-aafc-1f7c0192446e`) | created during first interactive `eas build`. |
| Apple Distribution Certificate | EAS-managed (lives in EAS credential vault) | created during first interactive `eas build`. |
| iOS Provisioning Profile (App Store) | EAS-managed | created during first interactive `eas build` after switching `distribution: "store"`. |
| App Store Connect API key (EAS-managed) | EAS-generated, `.p8` in EAS vault | for local `eas submit` calls. |
| App Store Connect API key (CI) | Key ID `2YFX2R3JWM`, manually generated | separate lifecycle from the EAS-managed one; `.p8` lives in GitHub Actions secret only. |
| TestFlight Internal Testing group | "Crowd Internal" | auto-distribution enabled; tester `gitaurslinger@hotmail.com`. |

## Secrets configured (names only)

| Store | Secret | Used by |
| ----- | ------ | ------- |
| GitHub Actions secrets | `EXPO_TOKEN` | `deploy-mobile.yml` (EAS CLI auth) |
| GitHub Actions secrets | `ASC_API_KEY_ID` | `deploy-mobile.yml` (env var, substituted into `eas.json`) |
| GitHub Actions secrets | `ASC_API_ISSUER_ID` | `deploy-mobile.yml` (env var, substituted into `eas.json`) |
| GitHub Actions secrets | `ASC_API_KEY_P8` | `deploy-mobile.yml` (written to `apps/mobile/api-key.p8` at runtime) |
| GitHub Actions secrets | `APPLE_ID`, `APPLE_TEAM_ID` | currently unused — kept in place for future flows. Apple Team ID is hardcoded in `eas.json` (it's public). |
| EAS credential vault | Apple Distribution Certificate | EAS Build's iOS signing |
| EAS credential vault | iOS Provisioning Profile | EAS Build's iOS signing |
| EAS credential vault | EAS-managed ASC API key | local `eas submit` calls |

## Deviations from the phase prompt and why

1. **`distribution: "internal"` → `"store"`.** The phase prompt's C7 spec used `internal` and described it as "for TestFlight or direct distribution." That's incorrect — in EAS terminology, `internal` means ad-hoc (UDID-registered direct install), and TestFlight requires `store` (App Store-signed binaries). Caught when EAS prompted to register devices for ad-hoc during the first build. Fixed in commit `ca7f225` before any cycles burned producing an unusable binary.

2. **Replaced 0-byte placeholder PNG assets with real icons.** Phase D's prompt assumed the existing `icon.png` etc. were valid; they were 0-byte placeholders that broke EAS prebuild's image processing. Generated `icon.png`, `adaptive-icon.png`, `favicon.png` from the Ember design system's Concentric mark via Pillow.

3. **Iterated on icon design once.** First generation read as anatomy due to over-simplification (single ring + filled center). Second generation added the in-app Concentric's middle ring and cardinal dots, removed the soft halo and center dot, made the lit center stroke-only. Reads correctly as a map/diagram now.

4. **Pure App Store Connect API key auth, not the phase-prompt's mixed Apple-ID-plus-password approach.** The prompt's example workflow set `EXPO_APPLE_APP_SPECIFIC_PASSWORD: ${{ secrets.ASC_API_KEY_P8 }}` — feeding `.p8` contents to a "password" field. That's incoherent (mixing two auth modes); we used pure API-key auth which is the modern EAS pattern.

5. **Hardcoded `appleTeamId` in `eas.json` instead of env-var substitution.** The phase prompt suggested `appleTeamId: "$APPLE_TEAM_ID"`. Failed at submit with "Invalid Apple Team ID was specified" — the substituted value didn't match the format check, likely whitespace contamination in the GitHub secret. Apple Team IDs aren't secret (they're embedded in every signed binary's metadata), so hardcoding to `9ML46U556H` is cleaner and removes a failure mode. Same approach as `ascAppId`, which the phase prompt also has hardcoded.

6. **Added `eas-build-post-install` script, hoisted `react-native-worklets`, and added the icon generator script.** None of these were in the phase prompt. Each was a config gap surfaced when running the full EAS Build pipeline for the first time. Fixed in the phase that found them, per the "honesty over deferral" principle.

## Verification: what was tested

The pipeline was empirically validated through real iterations of the deploy chain. Specifically:

- **D3: manual flow exercised end-to-end** — first interactive `eas build`, generated credentials, built, submitted, processed, attached to TestFlight group, installed on phone, smoke-tested (feed loads, crowds tab loads, composing a new post works and the post appears in the feed).
- **D4: automated flow exercised end-to-end** — push triggered `deploy-mobile.yml`, workflow installed dependencies, queued the EAS build, EAS built successfully on cloud, EAS submitted to App Store Connect, Apple processed, build auto-distributed to the Crowd Internal group, TestFlight notification arrived on phone, redesigned-icon binary installed and runs against the deployed dev API.
- **Path filtering validated** — only Deploy Mobile fired on mobile-only changes (`450498e`, `1ead482`, `71b8da2`), not Deploy Server or Deploy Devtools. Path filter contract holds.
- **Iteration count** — five small config-shape iterations across D3-D4 (icon assets, distribution channel, worklets hoist, workspace build hook, eas.json field name, Team ID format), plus one substantive iteration on icon design. Average ~10-15 min per iteration. Same pattern as Phase C5/C6: each was a config gap surfaced by running real CI for the first time, not a code bug.

## Things noticed but not fixed (carry-overs)

1. **No production mobile profile.** The `dev-deployed` build/submit profile points at the dev environment. Production would need a parallel `prod-deployed` profile with a separate bundle ID (e.g., `dev.anthonyliddle.crowd.prod`) or just a separate App Store Connect record under the same bundle ID, plus a different `EXPO_PUBLIC_API_URL` and a different deployment workflow with a stricter trigger (probably a version tag, not push to `main`).

2. **No Android build profile.** Phase D's deliberate-not-to-do list excludes Android. When/if Android ships, the same `eas.json` profile shape extends — add an `android` block alongside `ios` in the build profile, and a `submit` profile with the Google Play upload key. The workflow would change `--platform ios` to `--platform all`.

3. **No external testing.** Internal testing is the only TestFlight tier we use. External testing requires Apple's Beta App Review for each external build, which adds a 1-2 day step. Out of scope for dev iteration; relevant when there's a beta-tester pool beyond the immediate team.

4. **No deploy gating on test pass.** `deploy-mobile.yml` fires on push to main directly; the `Test` workflow runs in parallel. Same Phase E concern as the server/devtools workflows.

5. **`APPLE_ID` and `APPLE_TEAM_ID` GitHub secrets are unused** but left in place. If they're never used, future cleanup could remove them. Low priority.

6. **`expo-secure-store` plugin is in `app.json`'s plugin list** but the app may not actually use Keychain. EAS configures the entitlement automatically based on the plugin list, so no harm — but if the app never ends up using SecureStore, dropping the plugin would slightly slim the binary. Not Phase D scope.

7. **EAS-managed and CI-specific App Store Connect API keys both exist** in the Apple Developer team. The EAS-managed one is for local `eas submit`; the CI-specific one is for GitHub Actions. Two API keys per team is fine — Apple allows up to 50 per team — but worth knowing they exist if you're auditing keys later.

8. **TestFlight build numbers monotonically increase forever within an `(app, version)` tuple.** With `autoIncrement: true` and `cli.appVersionSource: "remote"`, EAS keeps track. If you ever need to manually sync (e.g., after migrating EAS projects), the value is stored in EAS's project metadata, not in `app.json`.

## What Phase E (or whatever ships next) needs from this phase

| Thing | Where it lives | Phase E usage |
| ----- | -------------- | ------------- |
| Working mobile deploy pipeline | `.github/workflows/deploy-mobile.yml` + `apps/mobile/eas.json` | duplicate-and-modify for production: separate Apple/EAS credentials, separate ASC record, separate trigger. |
| iOS distribution credentials | EAS credential vault | survive across CI runs; only re-prompt if certs/profiles expire. Distribution certs are valid 1 year. |
| Internal Testing group | App Store Connect → Crowd → TestFlight → Internal Testing | "Crowd Internal" group with auto-distribution enabled. New testers can be added by Apple ID email at any time. |
| App version + build number conventions | `app.json` (`expo.version`) + EAS remote (`buildNumber`) | bumps as needed; no special workflow. |
| Hoist patterns + post-install hook | `.npmrc` + `apps/mobile/package.json` | load-bearing for any future Native build that uses transitive workspace deps or React Native worklets. |

## Phase D close-out

Phase D shipped: TestFlight build of Crowd installed on the user's iPhone, talking to the dev API, automatically rebuilt and redistributed on every merge to `main`.
