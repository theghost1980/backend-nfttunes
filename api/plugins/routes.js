const routes = require('../routes');

exports.plugin = {
  async register(server) {
    routes.forEach((r) => {
      server.route(r);
    });
  },
  name: 'routes',
  version: '1.0.0',
};
