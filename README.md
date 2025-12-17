# Crowd

A location-based ephemeral messaging platform. Users can post messages that are only visible to people within a certain radius for a limited time.

## Tech Stack

- **Mobile**: React Native (Expo) with TypeScript, NativeWind (Tailwind CSS)
- **Server**: Fastify with Drizzle ORM and PostGIS
- **Database**: PostgreSQL with PostGIS extension
- **Monorepo**: pnpm workspaces

## Prerequisites

- Node.js (v18 or higher)
- pnpm
- Docker and Docker Compose (for database)

## Installation

1. Clone the repository:

```bash
git clone <your-repo-url>
cd crowd
```

2. Install dependencies from the root directory:

```bash
pnpm install
```

3. Set up environment variables:

```bash
# Copy the example env file (optional, as defaults match docker-compose.yml)
cp .env.example .env
# Edit .env if you need different database credentials or server configuration
```

The application will use these environment variables:
- `DATABASE_URL`: PostgreSQL connection string (default: `postgres://postgres:postgres@localhost:5432/monorepo_db`)
- `PORT`: Server port (default: `3000`)
- `HOST`: Server host (default: `0.0.0.0`)
- `CORS_ORIGIN`: CORS origin setting (default: `*` for development)

4. Start the PostgreSQL database with PostGIS:

```bash
docker-compose up -d
```

5. Run database migrations:

```bash
pnpm --filter server migrate
```

## Running the Project

### Run All (Recommended)

To run both the server and mobile application simultaneously:

```bash
pnpm dev
```

This uses the `concurrently` package to stream output from both the server and mobile app.

### Run Individually

**Server:**

```bash
pnpm dev:server
# OR
pnpm --filter server dev
```

The server runs on Fastify with Drizzle ORM.
- **API**: http://localhost:3000 (default Fastify port usually, check src/index.ts)

**Mobile:**

```bash
pnpm dev:mobile
# OR
pnpm --filter mobile start
```

The mobile app is an Expo project.
- Press `a` for Android
- Press `i` for iOS
- Press `w` for Web

## Project Structure

```
crowd/
├── apps/
│   ├── mobile/          # React Native Expo application
│   └── server/          # Fastify API server
├── packages/
│   ├── api/            # API client package
│   └── shared/         # Shared types and schemas
└── docker-compose.yml  # PostgreSQL + PostGIS
```

See `apps/mobile/PROJECT_STRUCTURE.md` and `apps/mobile/README.md` for detailed mobile app documentation.

## Features

- **Location-based messaging**: Messages are only visible within a defined radius
- **Ephemeral content**: Messages automatically expire after a set duration
- **Real-time feed**: Pull-to-refresh message feed
- **Modern UI**: Built with NativeWind (Tailwind CSS for React Native)
- **PostGIS integration**: Efficient spatial queries for location-based features

## Development Notes

- The server uses PostGIS for spatial queries. Make sure the database has the PostGIS extension enabled (included in the Docker image).
- The mobile app currently uses a mock API in development. Update the API endpoint in `apps/mobile/src/services/api.ts` to connect to the real server.
- CORS is set to `*` for development. Update this in production in `apps/server/src/index.ts`.

## License

MIT
