// @ts-check
import { defineConfig } from 'astro/config';
import remarkCenturyOfFear from './src/scripts/century-of-fear/remark-essay.mjs';

// https://astro.build/config
export default defineConfig({
  site: 'https://jroth.space',
  devToolbar: { enabled: false },
  markdown: { remarkPlugins: [remarkCenturyOfFear] },
});
