FROM node:20-slim

WORKDIR /app

# Enable pnpm
RUN corepack enable

# Copy workspace files
COPY pnpm-workspace.yaml ./
COPY package.json pnpm-lock.yaml ./

# Copy server package
COPY apps/server ./apps/server

# Install deps (filtered to server)
RUN pnpm install --filter ./apps/server...

# Build server
WORKDIR /app/apps/server
RUN pnpm build

EXPOSE 8080

CMD ["pnpm", "start"]
