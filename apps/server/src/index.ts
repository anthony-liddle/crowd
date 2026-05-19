import { buildApp } from './app';
import { checkPortAvailable, checkMigrationDrift } from './preflight';

const server = buildApp();

const start = async () => {
  try {
    const port = parseInt(process.env.PORT || '8080', 10);
    const host = process.env.HOST || '0.0.0.0';

    // Dev-only preflight: catch port conflicts and migration drift before
    // startup so the failure mode is a clear error instead of an opaque
    // bind failure or a "Failed query: select ..." surprise later.
    if (process.env.NODE_ENV !== 'production') {
      await checkPortAvailable(port, host);
      await checkMigrationDrift();
    }

    await server.listen({ port, host });
    console.log(`Server started at http://${host === '0.0.0.0' ? 'localhost' : host}:${port}`);
  } catch (err) {
    server.log.error(err);
    process.exit(1);
  }
};

start();
