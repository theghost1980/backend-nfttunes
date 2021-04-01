const JWT = require('hapi-auth-jwt2');

exports.plugin = {
  async register(server, options) {
    await server.register(JWT);

    server.auth.strategy('jwt', 'jwt', {
      key: options.SECRET,
      validate: (decoded) => ({
        isValid: true,
        credentials: decoded,
      }),
    });
  },
  name: 'JWT',
  version: '1.0.0',
};
