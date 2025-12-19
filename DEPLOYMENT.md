# Fly.io Deployment Guide

This guide walks you through deploying the Crowd server to Fly.io with a Postgres database.

## Prerequisites

1. **Fly.io CLI**: Install the Fly.io CLI
   ```bash
   curl -L https://fly.io/install.sh | sh
   ```

2. **Fly.io Account**: Sign up at [fly.io](https://fly.io) and authenticate:
   ```bash
   fly auth login
   ```

## Initial Setup

### 1. Create Fly.io App (if not already created)

If you haven't created the app yet, run:
```bash
fly launch
```

This will:
- Detect your Dockerfile
- Ask for an app name (or use the existing one from `fly.toml`)
- Set up the app configuration

**Note**: If the app already exists (you have a `fly.toml`), skip this step.

### 2. Create Postgres Database

Create a Fly Postgres database:

```bash
fly postgres create --name crowd-db --region iad --vm-size shared-cpu-1x --volume-size 3 --initial-cluster-size 1
```

This creates a Postgres database. Note the connection details that are displayed.

**Note**: For development, we use a single-node cluster with 3GB storage to stay within the free tier. For production, you may want to use larger volumes and multiple nodes for high availability.

### 3. Attach Database to App

Attach the database to your app:

```bash
fly postgres attach --app crowd-wtd6ka crowd-db
```

This automatically sets the `DATABASE_URL` secret for your app.

### 4. Set Environment Variables (Secrets)

Set the required secrets for your Fly.io app:

```bash
# CORS origin (adjust as needed for your mobile app)
fly secrets set CORS_ORIGIN="*"

# Port and Host are already set in fly.toml, but you can override if needed
# fly secrets set PORT=8080
# fly secrets set HOST=0.0.0.0
```

**Note**: `DATABASE_URL` is automatically set when you attach the Postgres database, so you don't need to set it manually.

### 5. Run Database Migrations

Before deploying, ensure your database schema is up to date. You can run migrations in two ways:

**Option A: Run migrations via Fly.io console**
```bash
fly ssh console -a crowd-wtd6ka
cd apps/server
pnpm migrate
exit
```

**Option B: Migrations run automatically on deploy**
The `fly.toml` is configured with a `release_command` that runs migrations automatically on each deployment. However, for the first deployment, you may want to run them manually to ensure they complete successfully.

### 6. Deploy the Application

Deploy your app to Fly.io:

```bash
fly deploy
```

This will:
- Build the Docker image
- Run migrations (via release_command)
- Deploy the app
- Start the server

### 7. Verify Deployment

Check that your app is running:

```bash
# Check app status
fly status

# Check logs
fly logs

# Test the health endpoint
curl https://crowd-wtd6ka.fly.dev/health
```

You should see `{"status":"ok"}` from the health endpoint.

## Updating Your Mobile App Configuration

### 1. Copy Environment Variables

Copy `.env.example` to `.env` if you haven't already:

```bash
cp .env.example .env
```

### 2. Set Your Fly.io URL

Update `.env` with your Fly.io app URL:

```env
EXPO_PUBLIC_API_URL=https://crowd-wtd6ka.fly.dev
```

Replace `crowd-wtd6ka` with your actual app name if different.

### 3. Choose Backend When Running

You can now choose which backend to use when running the mobile app:

**Use Fly.io backend:**
```bash
pnpm dev:fly
```

**Use localhost backend:**
```bash
pnpm dev:local
```

**Use localhost backend (default):**
```bash
pnpm dev
```

The `dev:fly` script uses the `EXPO_PUBLIC_API_URL` from your `.env` file, while `dev:local` explicitly unsets it to use localhost.

## Managing Your Deployment

### View Logs

```bash
fly logs
```

### SSH into the App

```bash
fly ssh console -a crowd-wtd6ka
```

### Scale Your App

```bash
# Scale to 1 instance (always running)
fly scale count 1

# Scale to 0 instances (stops when idle, auto-starts on request)
fly scale count 0
```

### Update Secrets

```bash
fly secrets set CORS_ORIGIN="https://yourdomain.com"
```

### Run Migrations Manually

```bash
fly ssh console -a crowd-wtd6ka
cd apps/server
pnpm migrate
exit
```

### Connect to Database

```bash
# Connect to the Postgres database
fly postgres connect -a crowd-db

# Or get the connection string
fly postgres connect -a crowd-db --command "echo \$DATABASE_URL"
```

## Troubleshooting

### Migrations Fail on Deploy

If migrations fail during deployment, you can run them manually:

```bash
fly ssh console -a crowd-wtd6ka
cd apps/server
pnpm migrate
```

### Database Connection Issues

1. Verify the database is attached:
   ```bash
   fly postgres list
   ```

2. Check that `DATABASE_URL` is set:
   ```bash
   fly secrets list
   ```

3. Test the connection:
   ```bash
   fly postgres connect -a crowd-db
   ```

### App Won't Start

1. Check logs: `fly logs`
2. Check app status: `fly status`
3. SSH in and check manually: `fly ssh console -a crowd-wtd6ka`

### Health Check Failing

The health check endpoint is at `/health`. If it's failing:
1. Check server logs: `fly logs`
2. Verify the server is listening on port 8080
3. Check that the app is running: `fly status`

## Environment Variables Reference

### Required for Fly.io

- `DATABASE_URL` - Automatically set when attaching Postgres database
- `PORT` - Server port (default: 8080, set in fly.toml)
- `HOST` - Server host (default: 0.0.0.0)

### Optional

- `CORS_ORIGIN` - CORS origin setting (default: `*`)

### For Local Development (.env)

- `DATABASE_URL` - Local Postgres connection string
- `EXPO_PUBLIC_API_URL` - Fly.io app URL for mobile app
- `USE_FLY_BACKEND` - Not used by scripts, but documented for reference

## Additional Resources

- [Fly.io Documentation](https://fly.io/docs/)
- [Fly Postgres Documentation](https://fly.io/docs/postgres/)
- [Drizzle ORM Documentation](https://orm.drizzle.team/)
