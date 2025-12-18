# Crowd

A location-based ephemeral messaging platform. Users can post messages that are only visible to people within a certain radius for a limited time.

## Tech Stack

- **Mobile**: React Native (Expo) with TypeScript, NativeWind (Tailwind CSS)
- **Server**: Fastify with Drizzle ORM and PostGIS
- **Database**: PostgreSQL with PostGIS extension
- **Monorepo**: pnpm workspaces

## Prerequisites

- Node.js (v22.1 or higher)
- pnpm
- Docker and Docker Compose (for database)

## Installation

1. Clone the repository:

```bash
git clone https://github.com/anthony-liddle/crowd.git
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
- `PORT`: Server port (default: `8080`)
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
- **API**: http://localhost:8080 (default Fastify port usually, check src/index.ts)

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

## Deployment (Firebase)

The backend API is deployed as a Firebase Function (v2).

### Prerequisites

1. Install Firebase CLI:
   ```bash
   npm install -g firebase-tools
   ```

2. Generate a CI token:
   ```bash
   firebase login:ci
   ```

3. Add the token to GitHub Secrets:
   - Go to: GitHub Repo → Settings → Secrets → Actions
   - Name: `FIREBASE_TOKEN`
   - Value: (The token generated in step 2)

### Local Emulation

To run the Firebase emulators locally:

```bash
pnpm --filter server build
firebase emulators:start
```

- **API URL (local)**: http://127.0.0.1:5001/crowd-70165/us-central1/api

### How Deployments Work

Deployments are automated via GitHub Actions. Any push to the `main` branch triggers a build and deploy of the `apps/server` to Firebase Functions.

### Why Firebase?

Firebase is used for hosting and executing the serverless functions. Data storage (PostgreSQL + PostGIS) is managed separately and connected via connection strings.

## License

MIT
