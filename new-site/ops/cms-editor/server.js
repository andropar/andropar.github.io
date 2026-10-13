import express from 'express';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { registerLocalFs } = require('decap-server/dist/middlewares');
const app = express();
app.disable('x-powered-by');
app.use((req, res, next) => {
  if (req.method !== 'POST' || req.headers.origin !== 'https://jroth.space') return res.status(403).json({ error: 'Use the writing editor.' });
  res.setHeader('Cache-Control', 'no-store');
  next();
});
await registerLocalFs(app, { logLevel: 'error' });
const server = app.listen(8085, '127.0.0.1');
server.requestTimeout = 30000;
server.headersTimeout = 10000;
for (const signal of ['SIGINT', 'SIGTERM']) process.on(signal, () => server.close(() => process.exit(0)));
