# Contributing to Crowd

Thank you for your interest in contributing to Crowd! This document provides guidelines and instructions for contributing.

## Getting Started

1. Fork the repository
2. Clone your fork: `git clone https://github.com/yourusername/crowd.git`
3. Install dependencies: `pnpm install`
4. Start the local stack (Postgres + server in containers): `pnpm dev:up`
5. Seed dev data: `pnpm dev:seed`
6. Start the mobile app: `pnpm --filter @app/mobile start`

For more detail — including the per-workspace env files, devtools, and host-only workflow — see [Local Development](#local-development).

## Local Development

The local stack lives in `docker-compose.yml` and runs Postgres plus the Fastify server. The mobile app and devtools run on the host and talk to the containerized server over `localhost:8080`.

### One-time setup

`.env.example` files live next to each app (`apps/server/.env.example`, `apps/mobile/.env.example`, `apps/devtools/.env.example`). The defaults in those files line up with the docker-compose stack, so you only need to copy them to `.env` if you're going to deviate from the defaults — most contributors won't need to.

### Daily commands (root scripts)

| Command           | What it does                                                                |
| ----------------- | --------------------------------------------------------------------------- |
| `pnpm dev:up`     | Start Postgres + server in containers (server runs `tsx watch` for hot reload, applies migrations on startup) |
| `pnpm dev:down`   | Stop the stack but keep volumes (`node_modules` cache + Postgres data persist) |
| `pnpm dev:logs`   | Tail the server container logs                                              |
| `pnpm dev:reset`  | Stop the stack and **drop volumes** — full clean slate                      |
| `pnpm dev:seed`   | Seed dev data (4 crowds, 12 messages, 7 boosts, centered on Aloha, OR — matches the mobile app's `DEFAULT_LOCATION`). **Destructive**: truncates and re-inserts every run. |

### Typical flow

```bash
pnpm dev:up                          # bring stack up; first run pulls images and builds the server image
pnpm dev:seed                        # populate with dev data
pnpm --filter @app/mobile start      # Expo: simulator and physical-device-on-LAN both work
pnpm --filter @app/devtools dev      # optional: web devtools at http://localhost:5173
```

The mobile app auto-detects the server URL via `Constants.expoConfig?.hostUri` and falls back to `http://localhost:8080`. Override with `EXPO_PUBLIC_API_URL` only if you need to point at a deployed server.

> **iOS Simulator location.** Set the simulator location to match the seed center: **Simulator → Features → Location → Custom Location**, enter `45.46948, -122.863`. Otherwise the simulator may report a different location (Apple's Cupertino default, or whatever was last set) and the seeded feed will appear empty.

### Host-only server option

If you'd rather run the server directly on your host (faster iteration, attach a debugger, etc.), keep Postgres in Docker but skip the server container:

```bash
docker compose up -d db              # just the db
pnpm --filter @app/server migrate    # apply migrations
pnpm --filter @app/server dev        # tsx watch on host
pnpm dev:seed                        # still works — same DATABASE_URL
```

### When to `dev:reset` vs `dev:down`

- `dev:down` is the default. Volumes persist, so the next `dev:up` is fast and your seed data is still there.
- `dev:reset` when: you change `pnpm-lock.yaml` (the named `node_modules` volume is stale), Postgres data looks wrong, or you want to verify a true cold-start.

## Deployment

There's a single deployed environment right now: **dev**. Production is deferred — when it ships it'll be a second set of resources (a `crowd-prod` Fly app, a separate Neon project, a separate Vercel project) provisioned with the same `fly.toml`, the same Dockerfile, the same workflows. No new architecture.

### Live URLs

| What | URL |
| ---- | --- |
| Server (Fly.io) | https://crowd-dev.fly.dev |
| Server health check | https://crowd-dev.fly.dev/health |
| Devtools (Vercel) | https://crowd-dev-devtools.vercel.app |

The Fly machine scales to zero when idle (`auto_stop_machines = "stop"` in `fly.toml`), so the first request after a quiet period has a ~1-2 second cold start.

### How automatic deploys work

Two workflows in `.github/workflows/` deploy to dev on merge to `main`, gated by path filters so unrelated changes don't trigger redeploys:

| Workflow | Triggers when these change | What it does |
| -------- | -------------------------- | ------------ |
| `deploy-server.yml` | `apps/server/**`, `packages/shared/**`, `packages/api/**`, `Dockerfile`, `fly.toml` | `flyctl deploy --remote-only` (build on Fly's remote builder) |
| `deploy-devtools.yml` | `apps/devtools/**`, `packages/shared/**`, `packages/api/**` | `vercel pull && vercel build && vercel deploy --prebuilt --prod` |

A `concurrency:` mutex prevents overlapping deploys per workflow — a second push queues until the first finishes.

Migrations run as Fly's `release_command` (a one-shot machine that boots the new image, runs `pnpm --filter @app/server migrate`, exits). If it fails, the deploy aborts and the previous machine keeps serving traffic.

### Vercel preview deploys

Vercel's GitHub integration still produces a preview deploy for every PR branch — that path isn't disabled. What *is* disabled is the integration's production deploy on push to `main` (via `apps/devtools/vercel.json`'s Ignored Build Step in the project settings), so production is only ever produced by the workflow. Single source of truth.

### Where secrets live

| Secret | Stored in | Used by |
| ------ | --------- | ------- |
| `FLY_API_TOKEN` | GitHub Actions secrets | `deploy-server.yml` |
| `VERCEL_TOKEN`, `VERCEL_ORG_ID`, `VERCEL_PROJECT_ID` | GitHub Actions secrets | `deploy-devtools.yml` |
| `DATABASE_URL`, `CORS_ORIGIN` | Fly.io secrets store | server runtime |
| `VITE_API_BASE_URL` | Vercel project env vars | devtools build |

Secrets never live in committed files. Fly secrets and Vercel env vars are set out-of-band via the respective CLIs / dashboards.

### Manual deploy (escape hatch)

If you need to deploy outside the workflow — diagnosing a CI issue, rolling back urgently, etc. — both targets accept manual deploys:

```bash
# Server
fly deploy                    # builds with target=prod, runs release_command, rolls out

# Devtools
cd apps/devtools
vercel deploy --prod          # uses local credentials; requires `vercel login` first
```

For rollback specifically, Fly tracks every release with a digest visible in `fly status`. Roll back with `fly releases rollback <number>` from `fly releases list`.

### Updating Fly secrets

`fly secrets set` against a running app triggers a rolling restart automatically. Health-check gating means a failed startup (e.g., a syntactically valid but wrong `DATABASE_URL`) keeps the previous machine serving:

```bash
fly secrets set CORS_ORIGIN='https://example.com'        # rolling restart
fly secrets unset SOME_KEY                               # rolling restart
fly secrets list                                         # digests only, never values
```

For sensitive values, consider `read -rs` to avoid leaking the secret into shell history:

```bash
read -rs FLY_DB                                          # paste, enter — silent, no history
fly secrets set DATABASE_URL="$FLY_DB"
unset FLY_DB
```

### Mobile builds

Phase D (TestFlight setup) is not yet wired. `apps/mobile/eas.json` defines a single `dev-deployed` build profile that bakes `EXPO_PUBLIC_API_URL=https://crowd-dev.fly.dev` into the binary. Building with `eas build --profile dev-deployed --platform ios` is syntactically valid today but requires Apple Developer / TestFlight credentials that haven't been configured yet.

## Development Workflow

### Branch Naming

- `feature/description` - New features
- `fix/description` - Bug fixes
- `docs/description` - Documentation updates
- `refactor/description` - Code refactoring
- `test/description` - Test updates

### Commit Messages

Follow conventional commits format:

- `feat: add new feature`
- `fix: resolve bug`
- `docs: update documentation`
- `style: format code`
- `refactor: restructure code`
- `test: add tests`
- `chore: update dependencies`

### Pull Request Process

1. Create a new branch from `main`
2. Make your changes
3. Ensure code follows project style
4. Test your changes thoroughly
5. Update documentation if needed
6. Submit a pull request using the PR template
7. Wait for review and address feedback

## Code Style

- TypeScript for all code
- Use meaningful variable and function names
- Add comments for complex logic
- Follow existing code patterns
- Use NativeWind (Tailwind) for mobile styling

## Testing

- Test on both iOS and Android when making mobile changes
- Verify API endpoints work correctly
- Check database migrations run successfully
- Ensure no TypeScript errors across the monorepo: `pnpm -r typecheck`

## Project Structure

```
crowd/
├── apps/
│   ├── mobile/          # React Native Expo app
│   └── server/          # Fastify API server
├── packages/
│   ├── api/            # API client package
│   └── shared/         # Shared types and schemas
```

## Environment Variables

Each app has a `.env.example` next to it documenting the variables that app needs. The defaults match the docker-compose stack, so for typical local dev you don't need to copy them to `.env`.

Server variables (`apps/server/.env.example`):

- `DATABASE_URL` — PostgreSQL connection string. **Required in production**: the server throws at module load if unset when `NODE_ENV=production`.
- `PORT` — HTTP listen port (default: `8080`).
- `HOST` — HTTP listen host (default: `0.0.0.0`; required for containers).
- `CORS_ORIGIN` — explicit origin or comma-separated list. **Required in production**: the server refuses to start with `*` or unset when `NODE_ENV=production`. Defaults to `*` for local dev convenience.

Devtools variables (`apps/devtools/.env.example`):

- `VITE_API_BASE_URL` — base URL the devtools app hits. Vite inlines `VITE_*` vars into the client bundle at build time.

Mobile variables (`apps/mobile/.env.example`):

- `EXPO_PUBLIC_API_URL` — base URL the mobile app hits. Expo inlines `EXPO_PUBLIC_*` vars at bundle time. Leave unset for local dev (auto-detects via `Constants.expoConfig?.hostUri`); set to override for deployed servers.

Production guards on the server:

- `apps/server/src/db/index.ts` throws if `NODE_ENV=production` and `DATABASE_URL` is unset.
- `apps/server/src/app.ts` throws if `NODE_ENV=production` and `CORS_ORIGIN` is unset or `*`.
- `apps/server/src/scripts/seed.ts` refuses to run unless `NODE_ENV !== production` AND `ALLOW_SEED=true`. It's destructive (TRUNCATE), so the double guard is intentional.

## Common Tasks

### Running the Server Only

```bash
pnpm dev:server
```

### Running the Mobile App Only

```bash
pnpm dev:mobile
```

### Database Operations

```bash
# View database in Drizzle Studio
pnpm server:view:db

# Generate new migration
pnpm --filter @app/server generate

# Run migrations
pnpm --filter @app/server migrate
```

After running `generate`, **rename the resulting migration file** so its name describes what it does, e.g. `0003_reconcile_indexes.sql` rather than Drizzle's auto-generated `0003_uneven_mercury.sql`. Migration filenames are part of the deploy timeline and should read like changelog entries. Update the matching `tag` in `apps/server/drizzle/meta/_journal.json` to keep Drizzle's bookkeeping in sync with the rename.

## Don't delete these without reading this

Two pieces of build configuration look unused but are load-bearing for the React Native bundle. They look unmotivated because their failure mode is at *runtime in Metro*, not at install time:

### `pnpm.packageExtensions` in `package.json`

Adds missing peer dependency declarations for several packages
(`@react-native-community/slider`, `@expo-google-fonts/*`, `nativewind`).
Without these, pnpm's strict peer resolution drops the packages into a
different node_modules layout, and Metro can't find React/React Native at
runtime. Removing this block produces "Unable to resolve module react"-style
errors when the mobile app starts.

### `public-hoist-pattern[]=*@babel/*` in `.npmrc`

Forces `@babel/generator`, `@babel/types`, `@babel/parser`, and
`@babel/traverse` to be hoisted to the root `node_modules`. Metro and
Babel's own internals require these to be resolvable from arbitrary
locations during the bundle process. Without these lines the mobile
bundle fails with "Cannot find module @babel/..." errors that look
unrelated to pnpm.

### `public-hoist-pattern[]=*react-native-worklets*` in `.npmrc`

`react-native-worklets` is a transitive dep of `react-native-reanimated@4.x`.
CocoaPods' `RNReanimated.podspec` does a plain Node `require.resolve('react-native-worklets/package.json')`
during `pod install`, walking up `node_modules` from `apps/mobile/ios/`.
Without this hoist, pnpm buries the package in `.pnpm/...` where Node's
walking-up resolver can't reach it, and `pod install` (and therefore EAS
Build's prebuild) fails with "Cannot find module 'react-native-worklets/package.json'".
Local Metro bundling works fine without this — the failure is CocoaPods-only,
which is why it doesn't surface until you build a native binary.

If you're tempted to clean any of these up, run `pnpm --filter @app/mobile start` first and confirm the bundle still completes — and also test on a fresh `node_modules` (delete and reinstall), because hoisting decisions stick. For the worklets entry specifically, the only way to verify is a real EAS Build (or a local `pod install` after `expo prebuild`), since the failure mode is in CocoaPods, not Metro.

## Reporting Issues

Use the issue templates when reporting bugs or requesting features:

- **Bug Report**: For reporting bugs
- **Feature Request**: For suggesting new features

## Questions?

If you have questions, feel free to:

- Open a discussion on GitHub
- Ask in pull request comments
- Review existing issues

## Code of Conduct

- Be respectful and inclusive
- Provide constructive feedback
- Help others learn and grow
- Focus on the project's goals

Thank you for contributing to Crowd! 📣
