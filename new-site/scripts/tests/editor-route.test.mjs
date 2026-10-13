import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import assert from 'node:assert/strict';

test('editor API shares the authenticated /admin/ protection space', () => {
  const config = readFileSync(new URL('../../public/admin/config.yml', import.meta.url), 'utf8');
  const nginx = readFileSync(new URL('../../ops/nginx-editor.conf', import.meta.url), 'utf8');
  const endpoint = config.match(/^\s+proxy_url:\s*(.+)$/m)?.[1];
  assert.ok(endpoint?.startsWith('/admin/'), 'Keep browser requests inside the editor login scope');
  assert.ok(nginx.includes(`location = ${endpoint} {`), 'The actual client endpoint must reach the API');
  const route = nginx.slice(nginx.indexOf(`location = ${endpoint}`));
  assert.match(route, /auth_basic_user_file/);
  assert.match(route, /proxy_pass http:\/\/127\.0\.0\.1:8085\/api\/v1;/);
});
