import { defineConfig } from 'astro/config';

// Static-only marketing site (joincrowd.app). No SSR, no adapter; Vercel
// auto-detects Astro and serves the prerendered dist/ output directly.
export default defineConfig({
  site: 'https://joincrowd.app',
  output: 'static',
});
