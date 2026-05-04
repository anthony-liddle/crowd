import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path';

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  define: {
    'process.env': {},
  },
  optimizeDeps: {
    include: ['@repo/shared', '@repo/api'],
  },
  build: {
    commonjsOptions: {
      // commonjsOptions.include matches the *resolved file path*, not the
      // import specifier. With pnpm's symlinked workspace packages, imports
      // like `@repo/api` resolve to `packages/api/dist/...` — no `@repo` in
      // the path — so an `/@repo\/api/` regex never matches and the plugin
      // skips converting CJS requires, which then leak into the browser
      // bundle as `require is not defined` at runtime. Match the actual
      // resolved paths.
      include: [/packages\/shared/, /packages\/api/, /node_modules/],
    },
  },
})
