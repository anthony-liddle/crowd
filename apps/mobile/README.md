# Crowd Mobile

The React Native + Expo mobile app for Crowd. See the root README for project context and setup.

## What's specific to this app

- **Design system:** the Ember design system. See `docs/design-system.md` for the system overview, color tokens, typography, and spatial primitives. The components in `src/components/` are mostly Ember primitives or Ember-styled compositions.
- **Identity model:** two kinds of user IDs live on the device — `globalUserId` for the global feed (rotates with content per the privacy model) and crowd-specific IDs for everything Crowds (stable per crowd, survive rotation, purged on leave or expiration). See `src/utils/identity.ts` for the implementation and the JSDoc explaining the rationale.
- **Join flow:** the unified `JoinCrowdModal` (in `src/components/`) is a state machine — one Modal that internally switches between scanning, looking up, confirming, and joining views. This shape is deliberate; see PR #70 for the structural reasoning. Deep links (`crowd://...`) route into the same flow.
- **Cleanup:** post and crowd expiration is enforced server-side, but the device also purges its own state when crowds expire — see the `getMyCrowds` flow in `src/services/api.ts`.

## Setup

The mobile app requires `apps/mobile/.env` with `EXPO_PUBLIC_API_URL` set. The app throws at module load if it's missing or protocol-less.

- For the dev backend: `EXPO_PUBLIC_API_URL=https://crowd-dev.fly.dev`
- For a local server: `EXPO_PUBLIC_API_URL=http://<your-mac-LAN-IP>:8080`

`EXPO_PUBLIC_*` values are baked in at build time. Changing the URL requires a fresh build (`pnpm expo run:ios --device` or equivalent for simulator/Android), not a Metro reload.

For the rest of setup, see the root README and CONTRIBUTING.md.

## Running

From the repo root:

- `pnpm --filter @app/mobile start` — start Metro
- `pnpm --filter @app/mobile ios` / `android` — run on simulator/device

For a fresh build on a physical device:

```bash
cd apps/mobile
pnpm expo prebuild --clean   # only if native config has changed (app.json edits, new native deps)
pnpm expo run:ios --device
```

## Tests

`pnpm --filter @app/mobile test`. Jest is currently `testEnvironment: 'node'` — component-level RN testing infrastructure hasn't been set up yet. See `docs/followups.md` under "Testing infrastructure" for the deferred decision.

## Notable directories

- `src/components/` — Ember primitives and component compositions
- `src/screens/` — screen-level components; one file per screen
- `src/services/api.ts` — the API client (real, not a mock — historical doc may say otherwise)
- `src/utils/identity.ts` — the two-tier user ID system
- `src/utils/crowdInvite.ts` — the URL parser shared between QR scan and deep link paths
- `src/screens/_DesignTest.tsx` — unrouted component gallery for the Ember system (see comment at top of file)
