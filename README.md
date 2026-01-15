# Crowd

A location-based ephemeral messaging platform. Users can post messages that are only visible to people within a certain radius for a limited time.

## Tech Stack

- **Mobile**: React Native (Expo) with TypeScript, NativeWind (Tailwind CSS)
- **Server**: Fastify with Drizzle ORM
- **Database**: PostgreSQL (uses Haversine formula for distance calculations)
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

4. Start the PostgreSQL database:

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

### Run DevTools

Typically used for debugging location-based features and seeding data.

```bash
pnpm dev:tools
# OR
pnpm --filter devtools dev
```

- **URL**: http://localhost:5173 (default)

## Project Structure

```
crowd/
├── apps/
│   ├── devtools/        # Web-based developer tools
│   ├── mobile/          # React Native Expo application
│   └── server/          # Fastify API server
├── packages/
│   ├── api/            # API client package
│   └── shared/         # Shared types and schemas
└── docker-compose.yml  # PostgreSQL database
```

See `apps/mobile/PROJECT_STRUCTURE.md` and `apps/mobile/README.md` for detailed mobile app documentation.

## Features

- **Location-based messaging**: Messages are only visible within a defined radius
- **Ephemeral content**: Messages automatically expire after a set duration
- **Real-time feed**: Pull-to-refresh message feed
- **Modern UI**: Built with NativeWind (Tailwind CSS for React Native)
- **Distance calculations**: Uses Haversine formula for accurate great-circle distance calculations
- **Anonymous Identity Rotation**: User identities automatically rotate once their active presence expires (see below)
- **Message Boosting**: Boost messages to extend their visibility and radius
- **Custom Crowds**: Create and join private or open groups (expiring in 24h) with crowd-specific feeds
- **Physical Device Location**: Uses real GPS coordinates with permission handling

## Anonymous Identity Rotation

Crowd implements a unique "Identity Rotation" system that ensures true ephemerality and user privacy. Unlike most platforms where you have a persistent account, your identity in Crowd is transient.

### How it Works
1. **Activity-Based Identity**: Your local `userId` is generated automatically. It remains stable as long as you have "active presence" on the platform.
2. **Rotation Clock**: Every time you post a message or boost someone else's message in the global feed, the app updates a "Rotation Clock" to the expiration time of that message (or stays the same if the new message expires earlier than your current clock).
3. **Automatic Reset**: As soon as your current rotation clock passes (meaning all messages you've interacted with have expired), your `userId` is automatically regenerated, and your local message history is wiped.
4. **Crowd-Specific Identities**: When you create or join a crowd, a unique crowd-specific user ID is generated and stored locally. This ID is stable and doesn't rotate, ensuring your crowd membership persists even when your main user ID rotates. All operations within a crowd (posting messages, boosting) use this crowd-specific ID.

### Value to the User
- **True Anonymity**: There is no long-term link between your different "sessions" of activity. Once your posts are gone, your identity is too.
- **Zero-Footprint**: The platform doesn't just delete your data; it breaks the link between you and your past actions, providing a fresh start every few hours or days.
- **Privacy by Design**: Users can participate in local discussions without fear of long-term profiling or tracking.
- **Stable Crowd Membership**: Your participation in crowds remains intact even when your main identity rotates, allowing for consistent group interactions.

## Development Notes

- The server uses the Haversine formula for distance calculations, which works with standard PostgreSQL (no extensions required).
- CORS is set to `*` for development. Update this in production in `apps/server/src/index.ts`.
- **Database Cleanup**: Expired messages and crowds are automatically cleaned up via a periodic cleanup script. See `apps/server/README.md` for details on running and scheduling the cleanup script.

## License

MIT
