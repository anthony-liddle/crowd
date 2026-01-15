# Crowd DevTools

Web-based developer tools for the Crowd application. This tool allows developers to visualize the system state, manage data, and debug location-based features without needing a physical device or running around the city.

## Features

- **Message Feed**: View active messages with metadata. Filter by Global or specific Crowd feeds.
- **Crowds Management**: Create, join, leave, and list crowds. Visualize memberships and simulate scenarios.
- **Post Message**: Manually create messages at specific coordinates. Target an Everyone/Global or specific Crowd.
- **Location Overrides**: Set precise latitude/longitude to simulate device location for sorting and radius testing.
- **Identity Simulation**: Generate and refresh anonymous user identities to test ownership and membership logic. Supports crowd-specific user IDs that persist across main ID rotations.
- **Tabbed Interface**: Switch easily between Message Feed and Crowds view.

## Running DevTools

To start the development server:

```bash
pnpm dev
# OR from root
pnpm dev:tools
```

The application will be available at http://localhost:5173 (or the next available port).

## Project Structure

This is a **Vite + React + TypeScript** application.
- Uses **Tailwind CSS** for styling.
- Integrates with the main API via `@repo/api`.

## Development

- **Linting**: `pnpm lint`
- **Building**: `pnpm build`
