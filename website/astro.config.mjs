import { defineConfig } from 'astro/config';
import vercel from '@astrojs/vercel';

export default defineConfig({
  // Every page stays prerendered; only /api/scores opts out with
  // `export const prerender = false`. The adapter is what lets that one route
  // become a serverless function inside the existing `vercel build --prebuilt`
  // deploy — see website/README.md.
  output: 'static',
  adapter: vercel(),
  // Vercel default domain for now; change when a domain is bought (DESIGN.md 未定).
  site: 'https://qc-kindergarten.vercel.app',
  trailingSlash: 'always',
  i18n: {
    defaultLocale: 'zh',
    locales: ['zh', 'en'],
    routing: {
      prefixDefaultLocale: true,
      redirectToDefaultLocale: true,
    },
  },
  build: {
    inlineStylesheets: 'auto',
  },
});
