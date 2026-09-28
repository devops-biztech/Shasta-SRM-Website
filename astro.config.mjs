// @ts-check
import { defineConfig } from 'astro/config';

export default defineConfig({
  site: 'https://www.srm-energy.com',
  trailingSlash: 'ignore',
  build: { format: 'directory' },
  // Old WordPress URLs → new pages, so existing links and search results keep working.
  redirects: {
    '/services': '/drop-off/',
    '/safety-rules': '/safety/',
    '/job-opportunities': '/careers/',
  },
});
