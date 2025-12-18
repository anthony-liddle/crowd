import { onRequest } from 'firebase-functions/v2/https';
import { server } from './app';

/**
 * Firebase Function entrypoint.
 * We use onRequest to wrap our Fastify instance.
 * 
 * Cold starts: Firebase will spin up a new instance of this function on demand.
 * The Fastify instance in app.ts is defined at the module level to be reused
 * across subsequent invitations in the same container.
 * 
 * DB Connections: Using 'pg' pooling is important, but ensure the pool 
 * is initialized lazily or managed correctly to avoid leaking connections
 * during horizontal scaling of functions.
 */
export const api = onRequest({
  region: 'us-central1',
  memory: '256MiB',
  timeoutSeconds: 60,
  minInstances: 0, // Allow scaling to 0 to save costs
}, async (req, res) => {
  await server.ready();
  server.server.emit('request', req, res);
});
