import { test } from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { readFileSync } from 'node:fs';
const script = readFileSync(new URL('../../public/admin/token-login.js', import.meta.url), 'utf8');
function setup(fail = false) {
  let Adapter, component, submitted;
  const backend = { _currentUserPromise: Promise.resolve('old'), authenticate: async value => { submitted = value; if (fail) throw new Error('Invalid token'); return { login: 'andropar' }; } };
  const context = { CMS: { getBackend: name => { assert.equal(name, 'github'); return { init: () => backend }; }, registerBackend: (name, Class) => { assert.equal(name, 'github-token'); Adapter = Class; } }, createClass: spec => { component = spec; return spec; }, h: (tag, props, ...children) => ({ tag, props, children }) };
  vm.runInNewContext(script, context);
  return { backend: new Adapter({}, {}), component, submitted: () => submitted };
}
test('GitHub file operations remain on Decap backend; authentication refreshes user lookup', async () => {
  const { backend, submitted } = setup();
  const result = await backend.authenticate({ token: 'github_pat_test' });
  assert.equal(result.login, 'andropar');
  assert.equal(submitted().token, 'github_pat_test');
  assert.equal(backend._currentUserPromise, undefined);
});
test('token form rejects broad/classic tokens and clears accepted secret from input state', () => {
  const { component } = setup(); let login;
  const view = { state: { token: 'ghp_example' }, props: { onLogin: value => { login = value; } }, setState(update) { Object.assign(this.state, update); } };
  component.submit.call(view, { preventDefault() {} });
  assert.equal(login, undefined);
  assert.match(view.state.error, /fine-grained/);
  view.state.token = ' github_pat_example ';
  component.submit.call(view, { preventDefault() {} });
  assert.equal(login.token, 'github_pat_example');
  assert.equal(view.state.token, '');
});

test('failed authentication enables another attempt', async () => {
  const { backend, component } = setup(true);
  const view = { state: { pending: true }, setState(update) { Object.assign(this.state, update); } };
  component.componentDidMount.call(view);
  await assert.rejects(backend.authenticate({ token: 'github_pat_test' }), /Invalid token/);
  assert.equal(view.state.pending, false);
  component.componentWillUnmount.call(view);
});
