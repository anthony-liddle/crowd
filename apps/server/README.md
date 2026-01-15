# Crowd Server

The backend service for the Crowd application, built with **Fastify**, **TypeScript**, **Drizzle ORM**, and **PostgreSQL** (PostGIS).

## Features

- **Geolocation**: Stores and queries messages using PostGIS for efficient spatial queries.
- **REST API**: Provides endpoints for mobile clients and devtools.
- **Anonymous Identity**: Handles user interactions without persistent authentication.
- **Crowds**: Manages time-limited groups (24h) and memberships.
- **Message Boosting**: Handles message duration extension logic.

## Tech Stack

- **Framework**: Fastify
- **Database**: PostgreSQL + PostGIS
- **ORM**: Drizzle ORM
- **Validation**: Zod
- **Language**: TypeScript

## Database Schema

- `messages`: Stores content, location, duration, and optional `crowdId`.
- `message_boosts`: Tracks boosts to prevent multiple boosts by same user.
- `crowds`: Stores group metadata (name, owner, expiration).
- `crowd_memberships`: Links users to crowds.

## API Endpoints

### Messages
- `GET /messages/feed` - Get active messages (by location or crowd)
- `POST /messages` - Create a new message
- `POST /messages/:id/boost` - Boost a message's reach/duration

### Crowds
- `GET /crowds` - List user's active crowds
- `POST /crowds` - Create a new crowd
- `POST /crowds/:id/join` - Join a crowd (via ID)
- `POST /crowds/:id/leave` - Leave a crowd

**Note**: The server supports crowd-specific user IDs. When clients create or join crowds, they use crowd-specific IDs for all operations within that crowd, ensuring membership persists even when the main user ID rotates.

## Database Cleanup

The server includes a cleanup script that removes expired data from the database:

- **Expired Messages**: Messages that have passed their `expiresAt` timestamp are deleted, along with all associated boosts
- **Expired Crowds**: Crowds that have passed their `expiresAt` timestamp (24 hours after creation) are deleted, and their memberships are automatically removed via cascade delete

### Running the Cleanup Script

**Manually:**
```bash
pnpm cleanup
# OR
pnpm --filter server cleanup
```

**Scheduled (Cron):**
Set up a cron job to run the cleanup script periodically. Example running every hour:

```bash
# Edit crontab
crontab -e

# Add this line (adjust path as needed)
0 * * * * cd /path/to/crowd && pnpm --filter server cleanup
```

**Recommended Frequency:**
- Run every hour for active deployments
- Run daily for low-traffic deployments
- The script is idempotent and safe to run multiple times

The script logs all deletions and exits with code 0 on success or 1 on error, making it suitable for monitoring and alerting.

## Development

```bash
# Start dev server
pnpm dev

# Run migrations
pnpm migrate # or
pnpm drizzle-kit push
```
