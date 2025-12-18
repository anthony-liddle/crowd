import fastify from 'fastify';
import cors from '@fastify/cors';
import { messageRoutes } from './routes/messages.js';

/**
 * Fastify instance as a singleton-scoped variable.
 * This is important for Firebase cold starts to minimize re-initialization overhead.
 */
const server = fastify({
  logger: true,
  // Firebase handles some aspects of request parsing, but Fastify still needs its config
});

// CORS configuration - Ensure it supports mobile clients
const corsOrigin = process.env.CORS_ORIGIN || '*';
server.register(cors, {
  origin: corsOrigin,
});

server.get('/health', async () => {
  return { status: 'ok' };
});

// Register routes
server.register(messageRoutes);

export { server };
