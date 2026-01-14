# Crowd DevTools

Web-based developer tools for the Crowd application. This tool allows developers to visualize the system state, manage data, and debug location-based features without needing a physical device or running around the city.

## Features

- **Message Feed**: View all active messages in the system with their metadata (location, radius, expiration).
- **Post Message**: Manually create messages at specific coordinates to test feed visibility and radius logic.
- **Location Overrides**: Set a precise latitude and longitude to simulate a device location for testing `nearest` vs `soonest` sorting and distance filtering.

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
