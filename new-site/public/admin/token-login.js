/* Keep Decap's GitHub file backend; replace its OAuth screen with token login. */
(() => {
  const github = CMS.getBackend('github');
  const tokenUrl = 'https://github.com/settings/personal-access-tokens/new?name=Website+writing+editor&description=Publish+writing+on+jroth.space&target_name=andropar&expires_in=90&contents=write';
  let finishSignIn = () => {};
  const TokenLogin = createClass({
    getInitialState() { return { token: '', error: '', pending: false }; },
    componentDidMount() { finishSignIn = () => this.setState({ pending: false }); },
    componentWillUnmount() { finishSignIn = () => {}; },
    submit(event) {
      event.preventDefault();
      const token = this.state.token.trim();
      if (!/^github_pat_[A-Za-z0-9_]+$/.test(token)) {
        this.setState({ error: 'Use a fine-grained GitHub token starting with github_pat_.' });
        return;
      }
      this.setState({ token: '', error: '', pending: true });
      this.props.onLogin({ token });
    },
    render() {
      return h('main', { style: { maxWidth: 460, margin: '10vh auto', padding: 32, fontFamily: 'Inter, system-ui, sans-serif', color: '#242722', lineHeight: 1.6 } },
        h('h1', { style: { fontSize: 28, lineHeight: 1.2 } }, 'Writing editor'),
        h('p', {}, 'Sign in with your website’s GitHub token.'),
        h('form', { onSubmit: this.submit },
          h('label', { htmlFor: 'github-token' }, 'GitHub token'),
          h('input', { id: 'github-token', type: 'password', required: true, autoComplete: 'off', spellCheck: false, value: this.state.token, onChange: event => this.setState({ token: event.target.value }), style: { display: 'block', width: '100%', boxSizing: 'border-box', padding: 12, margin: '8px 0 16px', border: '1px solid #c9cec6', borderRadius: 6, fontSize: 16 } }),
          h('button', { type: 'submit', disabled: this.state.pending, style: { padding: '12px 20px', border: 0, borderRadius: 6, background: '#34604a', color: 'white', fontSize: 16, cursor: 'pointer' } }, this.state.pending ? 'Signing in…' : 'Sign in'),
          (this.state.error || this.props.error) && h('p', { role: 'alert', style: { color: '#9b3028' } }, this.state.error || 'Sign-in failed. Check the token’s expiry, selected repository and Contents permission.')
        ),
        h('details', { style: { marginTop: 28 } },
          h('summary', {}, 'Set up your token'),
          h('ol', {},
            h('li', {}, h('a', { href: tokenUrl, target: '_blank', rel: 'noopener noreferrer' }, 'Open GitHub’s token setup'), '.'),
            h('li', {}, 'Choose Only select repositories, then andropar.github.io.'),
            h('li', {}, 'Set repository Contents to Read and write. Metadata stays Read-only.'),
            h('li', {}, 'Generate the token, copy it, and paste it above.')
          ),
          h('p', {}, 'Your login is remembered in this browser. Use Log out when you’re finished on a shared computer. Renew the token after 90 days.')
        ),
        h('p', { style: { marginTop: 28 } }, h('a', { href: '/' }, 'Back to the website'))
      );
    }
  });

  CMS.registerBackend('github-token', class {
    constructor(config, options) {
      const backend = github.init(config, options);
      backend.authComponent = () => TokenLogin;
      const authenticate = backend.authenticate.bind(backend);
      backend.authenticate = credentials => {
        // A retry must look up the user for the newly supplied token.
        backend._currentUserPromise = undefined;
        return authenticate(credentials).finally(() => finishSignIn());
      };
      return backend;
    }
  });
})();
