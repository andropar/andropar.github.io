import { spawn } from 'node:child_process';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { startCMS } from './cms-server.mjs';

const require = createRequire(import.meta.url);
const project = fileURLToPath(new URL('../', import.meta.url));
const children = [
  startCMS(),
  spawn(process.execPath, [join(dirname(require.resolve('astro/package.json')), 'astro.js'), 'dev', '--host', '127.0.0.1', '--port', '4321', ...process.argv.slice(2)], { cwd: project, stdio: 'inherit' }),
];
let stopping = false;
function stop(code = 0) {
  if (stopping) return;
  stopping = true;
  children.forEach(child => child.kill('SIGTERM'));
  process.exitCode = code;
}
for (const signal of ['SIGINT', 'SIGTERM']) process.on(signal, () => stop());
children.forEach(child => {
  child.on('error', error => { console.error(error.message); stop(1); });
  child.on('exit', code => { if (!stopping) stop(code ?? 1); });
});
