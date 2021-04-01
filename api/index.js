const Glue = require('@hapi/glue');
const serverConfig = require('./manifest');

require('../common/db');

const options = { ...serverConfig.options, relativeTo: __dirname };

const init = async () => {
  const server = await Glue.compose(serverConfig.manifest, options);

  const cookieOption = {
    ttl: 90 * 24 * 60 * 60 * 1000,
    isSecure: process.env.NODE_ENV === 'production',
    isHttpOnly: true,
    encoding: 'iron',
    password: process.env.COOKIE_ENCRYPTION_PASS, // must be at least 32 characters long
    clearInvalid: true,
    strictHeader: true,
    ignoreErrors: true,
    path: '/',
    isSameSite: 'Strict',
  };

  server.state('refresh_token', cookieOption);

  await server.start();

  console.log('API running on %s', server.info.uri);
};

process.on('unhandledRejection', (err) => {
  console.log(err.message);
  process.exit(1);
});

init();
