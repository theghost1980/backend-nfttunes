const dhive = require('@hiveio/dhive');
const config = require('./config');

const clientOptions = {
  failoverThreshold: 20,
  consoleOnFailover: true,
  timeout: 20 * 1000,
};

const client = new dhive.Client(config.NODES, clientOptions);

const activeKey = dhive.PrivateKey.from(config.ACTIVE_KEY);

const getClient = () => client;

module.exports = {
  ...dhive,
  client,
  activeKey,
  getClient,
};
