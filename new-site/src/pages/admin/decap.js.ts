import { readFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import type { APIRoute } from 'astro';

// Serve the pinned, prebuilt CMS bundle locally; Astro also exports it into dist/admin.
const require = createRequire(import.meta.url);
const bundle = await readFile(require.resolve('decap-cms'));

export const GET: APIRoute = () => new Response(new Uint8Array(bundle), {
  headers: { 'Content-Type': 'application/javascript; charset=utf-8' },
});
