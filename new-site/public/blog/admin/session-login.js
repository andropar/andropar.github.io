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
