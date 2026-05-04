# syntax=docker/dockerfile:1.7

# ---------- deps: install workspace deps once, share across targets ----------
FROM node:22-slim AS deps

ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable

WORKDIR /app

# Copy the whole repo for context (pnpm needs the workspace layout to resolve
# workspace:* deps). The .dockerignore strips node_modules and the mobile app.
COPY . .

# Install at image-build time so the named node_modules volume in compose can
# persist this layer across dev:up / dev:down cycles.
RUN pnpm install --frozen-lockfile

# ---------- dev: hot-reload target used by docker-compose ----------
FROM deps AS dev

# The server imports @repo/shared via its built dist/index.js, so shared must
# be compiled before tsx watch can resolve it.
RUN pnpm --filter @repo/shared build

EXPOSE 8080

WORKDIR /app/apps/server

# Apply migrations on container start, then hand off to tsx watch. Migrations
# stay in-process here; in Phase C they move to Fly's release_command.
CMD ["sh", "-c", "pnpm migrate && pnpm dev"]

# ---------- build: compile server + shared for production ----------
FROM deps AS build

RUN pnpm build

# ---------- prod: lean runtime image (Phase C target) ----------
FROM node:22-slim AS prod

ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable

WORKDIR /app

COPY --from=build /app /app

EXPOSE 8080

WORKDIR /app/apps/server

# Migrations run as Fly.io's release_command (see fly.toml), not on container
# start. That way a failed migration aborts the deploy before the new release
# takes traffic, and the previous machine keeps serving.
CMD ["pnpm", "start"]
