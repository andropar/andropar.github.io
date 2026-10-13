import express from 'express';
import { createRequire } from 'node:module';
import { randomBytes, scrypt, timingSafeEqual } from 'node:crypto';
import { promisify } from 'node:util';
const require = createRequire(import.meta.url);
const { registerLocalFs } = require('decap-server/dist/middlewares');
const derive = promisify(scrypt);
const origins = new Set(['https://jroth.space', 'https://blog/admin.jroth.space']);
const sessions = new Map();
const cookieName = '__Secure-personal-editor';
const duration = 12 * 60 * 60 * 1000;
function sessionToken(req) {
  return (req.headers.cookie || '').split(';').map(c => c.trim()).find(c => c.startsWith(cookieName + '='))?.slice(cookieName.length + 1);
}
function authenticated(req) {
  const token = sessionToken(req), expires = sessions.get(token);
  if (!expires || expires < Date.now()) { sessions.delete(token); return false; }
  return true;
}
function cookie(token, seconds) {
  return `${cookieName}=${token}; Path=/blog/admin; Max-Age=${seconds}; HttpOnly; Secure; SameSite=Strict`;
}
const app = express();
app.disable('x-powered-by');
app.use((req, res, next) => { res.setHeader('Cache-Control', 'no-store'); next(); });
app.get('/blog/admin/auth-check', (req, res) => res.sendStatus(authenticated(req) ? 204 : 401));
app.get('/blog/admin/login', (req, res) => {
  if (authenticated(req)) return res.redirect('/blog/admin/');
  const nonce = randomBytes(16).toString('base64');
  res.setHeader('Content-Security-Policy', `default-src 'self'; script-src 'nonce-${nonce}'; style-src 'unsafe-inline'; frame-ancestors 'none'; base-uri 'none'; form-action 'self'`);
  res.type('html').send(`<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Writing editor · Johannes Roth</title><style>body{background:#fbfaf8;color:#242722;font:16px/1.6 system-ui,sans-serif;margin:0}main{max-width:380px;margin:12vh auto;padding:32px}h1{font-size:28px;line-height:1.2;font-weight:600}label{display:block;margin-top:18px}input{box-sizing:border-box;width:100%;padding:12px;border:1px solid #c9cec6;border-radius:6px;font:inherit;background:white}button{margin-top:24px;background:#34604a;color:white;border:0;border-radius:6px;padding:12px 22px;font:inherit;cursor:pointer}button:disabled{opacity:.6}a{color:#34604a}#error{color:#9b3028}</style></head><body><main><h1>Writing editor</h1><p>Sign in to edit your posts.</p><form id="login"><label for="username">Username</label><input id="username" name="username" autocomplete="username" required value="johannes"><label for="password">Password</label><input id="password" name="password" type="password" autocomplete="current-password" required autofocus><button type="submit">Sign in</button><p id="error" role="alert"></p></form><p><a href="https://jroth.space/">Back to the website</a></p></main><script nonce="${nonce}">document.querySelector('form').addEventListener('submit',async event=>{event.preventDefault();const button=document.querySelector('button'),error=document.querySelector('#error');button.disabled=true;error.textContent='';try{const response=await fetch('/blog/admin/login',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(Object.fromEntries(new FormData(event.target)))});if(!response.ok)throw new Error(response.status===429?'Please wait a minute and try again.':'Check your username and password.');location.replace('/blog/admin/'+location.hash);}catch(e){error.textContent=e.message;button.disabled=false;}});</script></body></html>`);
});
app.post('/blog/admin/login', express.json({ limit: '4kb' }), async (req, res) => {
  if (!origins.has(req.headers.origin)) return res.status(403).json({ error: 'Use the editor login page.' });
  const password = req.body?.password;
  if (typeof password !== 'string' || password.length > 256 || req.body?.username !== 'johannes') return res.status(401).json({ error: 'Check your username and password.' });
  try {
    const expected = Buffer.from(process.env.EDITOR_PASSWORD_HASH || '', 'hex');
    const computed = await derive(password, Buffer.from(process.env.EDITOR_PASSWORD_SALT || '', 'hex'), 64);
    if (expected.length !== computed.length || !timingSafeEqual(expected, computed)) return res.status(401).json({ error: 'Check your username and password.' });
    for (const [token, expires] of sessions) if (expires < Date.now()) sessions.delete(token);
    if (sessions.size >= 128) sessions.delete(sessions.keys().next().value);
    const token = randomBytes(32).toString('hex');
    sessions.set(token, Date.now() + duration);
    res.setHeader('Set-Cookie', cookie(token, duration / 1000));
    res.json({ signedIn: true });
  } catch { res.status(503).json({ error: 'Login is temporarily unavailable.' }); }
});
app.post('/blog/admin/logout', (req, res) => {
  if (!origins.has(req.headers.origin)) return res.status(403).end();
  sessions.delete(sessionToken(req));
  res.setHeader('Set-Cookie', cookie('', 0));
  res.json({ signedOut: true });
});
app.use((req, res, next) => {
  if (req.path !== '/api/v1' || req.method !== 'POST' || !origins.has(req.headers.origin)) return res.status(403).json({ error: 'Use the writing editor.' });
  if (!authenticated(req)) return res.status(401).json({ error: 'Sign in to the writing editor.' });
  next();
});
await registerLocalFs(app, { logLevel: 'error' });
const server = app.listen(8085, '127.0.0.1');
server.requestTimeout = 30000;
server.headersTimeout = 10000;
for (const signal of ['SIGINT', 'SIGTERM']) process.on(signal, () => server.close(() => process.exit(0)));
