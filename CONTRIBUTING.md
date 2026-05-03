# Contributing to Crowd

Thank you for your interest in contributing to Crowd! This document provides guidelines and instructions for contributing.

## Getting Started

1. Fork the repository
2. Clone your fork: `git clone https://github.com/yourusername/crowd.git`
3. Install dependencies: `pnpm install`
4. Set up the database: `docker-compose up -d`
5. Run migrations: `pnpm --filter @app/server migrate`
6. Start development: `pnpm dev`

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

The project uses environment variables for configuration. See `.env.example` for required variables:

- `DATABASE_URL` - PostgreSQL connection string
- `PORT` - Server port (default: 8080)
- `HOST` - Server host (default: 0.0.0.0)
- `CORS_ORIGIN` - CORS origin setting (default: *)

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

If you're tempted to clean either of these up, run `pnpm --filter @app/mobile start` first and confirm the bundle still completes — and also test on a fresh `node_modules` (delete and reinstall), because hoisting decisions stick.

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
