const { monotonicFactory } = require('ulid');
const Sidechain = require('./Sidechain');
const config = require('./config');

const ulid = monotonicFactory();

const ULID = () => ulid();

const SidechainClient = new Sidechain({
  blockchain: `${config.SIDECHAIN_RPC}/blockchain`,
  contract: `${config.SIDECHAIN_RPC}/contracts`,
  blockProcessor: () => { },
});

module.exports = {
  SidechainClient,
  ULID,
};
