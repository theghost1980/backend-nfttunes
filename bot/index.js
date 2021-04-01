const Sidechain = require('../common/Sidechain');
const State = require('../common/state');
const Stream = require('./Stream');
const blockProcessor = require('./sidechain');
const config = require('../common/config');
const operations = require('./operations');
const logger = require('../common/logger');
const { getClient, BlockchainMode } = require('../common/chain');

require('../common/db');

const state = new State();

state.createTable();

const client = getClient();

let hiveStream;
let SidechainClient;

const main = async () => {
  const lastHiveBlock = await state.loadState('hive');
  const lastHEBlock = await state.loadState('hive-engine');

  console.log(`Last processed Hive block: ${lastHiveBlock} and Hive-Engine block: ${lastHEBlock}`);

  const streamOptions = {
    from: lastHiveBlock === 0 ? undefined : lastHiveBlock + 1,
    mode: BlockchainMode.Latest,
  };

  hiveStream = new Stream(client, streamOptions);

  hiveStream.start();

  hiveStream.on('custom_json', (data) => operations.customJson(client, data));

  hiveStream.on('block', (block) => state.saveState({ chain: 'hive', block }));

  hiveStream.on('error', async (error) => {
    logger.error(error.message);
  });

  SidechainClient = new Sidechain({
    blockchain: `${config.SIDECHAIN_RPC}/blockchain`,
    contract: `${config.SIDECHAIN_RPC}/contracts`,
    blockProcessor,
  });

  let blockNumber = lastHEBlock + 1;

  if (blockNumber <= 1) {
    const blockInfo = await SidechainClient.getLatestBlockInfo();
    blockNumber = blockInfo.blockNumber;
  }

  SidechainClient.streamBlocks(blockNumber, null, 1000, state);
};

main();
