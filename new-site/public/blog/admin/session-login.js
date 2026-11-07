(() => {
  // Saving a post is called "Publish" in Decap, which reads as "make public". Call it "Save":
  // whether a post is public is the Draft switch.
  const words = {
    'Publish': 'Save', 'Publish now': 'Save', 'Publishing...': 'Saving...', 'Published': 'Saved',
    'Publish and create new': 'Save and create new', 'Publish and duplicate': 'Save and duplicate',
    'Entry published': 'Saved',
  };
  const rename = node => Object.fromEntries(Object.entries(node).map(([key, value]) =>
    [key, typeof value === 'string' ? (words[value] ?? value) : value && typeof value === 'object' ? rename(value) : value]));
  const en = CMS.getLocale('en');
  if (en) CMS.registerLocale('en', rename(en));
})();
(() => {
  const proxy = CMS.getBackend('proxy');
  const Ready = createClass({
    componentDidMount() { this.props.onLogin({}); },
    render() { return h('p', {}, 'Opening your writing…'); }
  });
  CMS.registerBackend('private-files', class {
    constructor(config, options) {
      const backend = proxy.init(config, options);
      backend.authComponent = () => Ready;
      backend.authenticate = async () => ({ name: 'Johannes Roth', login: 'johannes' });
      backend.logout = async () => {
        await fetch('/blog/admin/logout', { method: 'POST', credentials: 'same-origin' });
        location.replace('/blog/admin/login');
      };
      const request = backend.request.bind(backend);
      backend.request = payload => request(payload).catch(error => {
        if (error.status === 401) location.replace('/blog/admin/login' + location.hash);
        throw error;
      });
      return backend;
    }
  });
})();
