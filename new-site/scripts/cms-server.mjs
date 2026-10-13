import { spawn } from 'node:child_process';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);

export function startCMS() {
  return spawn(process.execPath, [require.resolve('decap-server/dist/index.js')], {
    cwd: fileURLToPath(new URL('../../', import.meta.url)),
    env: { ...process.env, PORT: '8085', BIND_HOST: '127.0.0.1', MODE: 'fs', GIT_REPO_DIRECTORY: fileURLToPath(new URL('../../', import.meta.url)) },
    stdio: 'inherit',
  });
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const server = startCMS();
  for (const signal of ['SIGINT', 'SIGTERM']) process.on(signal, () => server.kill(signal));
  server.on('error', error => { console.error(error.message); process.exit(1); });
  server.on('exit', code => process.exit(code ?? 0));
}
