// Handle expected PostgreSQL connection termination errors during test cleanup
// PostgreSQL error code 57P01 = admin_shutdown - expected when Testcontainers stops
const isExpectedShutdownError = (error: Error) => {
  return error?.message?.includes('terminating connection') ||
         (error as any)?.code === '57P01';
};

process.on('uncaughtException', (error: Error) => {
  if (isExpectedShutdownError(error)) {
    return; // Ignore expected container shutdown errors
  }
  console.error('Uncaught Exception:', error);
  process.exit(1);
});

process.on('unhandledRejection', (reason: Error) => {
  if (isExpectedShutdownError(reason)) {
    return; // Ignore expected container shutdown errors
  }
  console.error('Unhandled Rejection:', reason);
  process.exit(1);
});
