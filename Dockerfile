FROM node:22-slim AS base

# Enable corepack and use pnpm
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable

WORKDIR /app

# Copy the whole repo for context
COPY . .

# Install dependencies using pnpm workspaces
RUN pnpm install --frozen-lockfile

# Build everything (specifically we need shared and server)
RUN pnpm build

# Final stage
FROM node:22-slim

WORKDIR /app

# Enable pnpm in final stage too
RUN corepack enable

# Copy built files and node_modules from base
COPY --from=base /app /app

# Expose port
EXPOSE 8080

# Start the server
WORKDIR /app/apps/server

# Create a startup script that runs migrations then starts the server
RUN echo '#!/bin/sh\nset -e\npnpm migrate || echo "Migration failed, continuing..."\npnpm start' > /app/apps/server/start.sh && \
    chmod +x /app/apps/server/start.sh

CMD ["/app/apps/server/start.sh"]
