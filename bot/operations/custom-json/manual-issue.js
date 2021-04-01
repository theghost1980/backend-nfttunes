const { Collectible, Transaction } = require('../../../common/models');
const Sidechain = require('../../../common/Sidechain');
const config = require('../../../common/config');
const logger = require('../../../common/logger');
const {
  arrayChunk,
  issueMultiple,
  parseJSON,
  sleep,
  slugify,
} = require('../../helpers');

const SidechainClient = new Sidechain({
  blockchain: `${config.SIDECHAIN_RPC}/blockchain`,
  contract: `${config.SIDECHAIN_RPC}/contracts`,
  blockProcessor: () => { },
});

module.exports = async (client, data) => {
  const username = (data.required_auths.length > 0) ? data.required_auths[0] : '';

  if (config.ADMINS.includes(username)) {
    const json = JSON.parse(data.json);

    try {
      const trx = await SidechainClient.getTransactionInfo(json.trx_id);

      if (trx && trx.contract === 'tokens' && trx.action === 'transfer') {
        const payload = parseJSON(trx.payload);
        const logs = parseJSON(trx.logs);

        if (!logs.errors && logs.events
          && payload.to === config.ACCOUNT
          && payload.symbol === config.CURRENCY) {
          const { name, collection, editions } = JSON.parse(payload.memo);
          const creator = trx.sender;

          const nftName = `${creator}_${slugify(collection)}_${slugify(name)}`.toLowerCase();

          const collectible = await Collectible.findOne({ series: nftName });
          const transaction = await Transaction.findOne({ series: nftName, type: 'issue' });

          if (collectible && transaction.trx_id === json.trx_id) {
            const nftInstances = await SidechainClient.getNFTInstances(config.NFT_SYMBOL, { 'properties.series': nftName });

            if (nftInstances.length !== Number(editions)) {
              const collectibleEditions = Array.from(Array(Number(editions)), (_, i) => i + 1);
              const issuedEditions = nftInstances.map(((nft) => nft.properties.edition));

              const toBeIssued = collectibleEditions.filter((x) => !issuedEditions.includes(x));

              if (toBeIssued.length > 0) {
                logger.info(`Series: ${collectible.series}, Editions to be issued: ${toBeIssued.join(', ')}`);

                const issueOps = toBeIssued.reduce((acc, cur) => {
                  acc.push({
                    symbol: config.NFT_SYMBOL,
                    to: creator,
                    feeSymbol: config.NFT_ISSUE_FEE_SYMBOL,
                    properties: {
                      series: nftName,
                      edition: cur,
                      metadata: JSON.stringify({ rights: collectible.rights }),
                    },
                  });

                  return acc;
                }, []);

                const issueChunks = arrayChunk(issueOps);

                for (let i = 0; i < issueChunks.length; i += 1) {
                  await issueMultiple(issueChunks[i]);
                  await sleep(200);
                }

                logger.info(`Success: Manually issued tokens to @${creator} by @${username}. Series: ${collectible.series}`);
              }
            }
          }
        }
      }
    } catch (e) {
      logger.error(`Error: Manually issuing tokens. User: ${username} TX: ${data.trx_id} Message: ${e.message}`);
    }
  }
};
