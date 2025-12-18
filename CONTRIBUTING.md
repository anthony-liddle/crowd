# Contributing to Crowd

Thank you for your interest in contributing to Crowd! This document provides guidelines and instructions for contributing.

## Getting Started

1. Fork the repository
2. Clone your fork: `git clone https://github.com/yourusername/crowd.git`
3. Install dependencies: `pnpm install`
4. Set up the database: `docker-compose up -d`
5. Run migrations: `pnpm --filter server migrate`
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
- Ensure no TypeScript errors: `pnpm --filter server exec tsc --noEmit`

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
pnpm --filter server generate

# Run migrations
pnpm --filter server migrate
```

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
