const Qs = require('qs');
const { JWT_SECRET, PORT } = require('../common/config');

const plugins = [
  {
    plugin: './plugins/auth',
    options: {
      SECRET: JWT_SECRET,
    },
  }, {
    plugin: './plugins/routes',
  },
];

exports.manifest = {
  server: {
    router: {
      stripTrailingSlash: true,
      isCaseSensitive: false,
    },
    routes: {
      security: {
        hsts: false,
        xss: true,
        noOpen: true,
        noSniff: true,
        xframe: false,
      },
      cors: {
        origin: ['*'],
        credentials: true,
      },
    },
    query: {
      parser: (query) => Qs.parse(query),
    },
    mime: {
      override: {
        'text/event-stream': {
          compressible: false,
        },
      },
    },
    port: PORT,
    host: 'localhost',
    debug: process.env.NODE_ENV === 'production' ? false : { request: ['error'] },
  },

  register: {
    plugins,
  },
};
