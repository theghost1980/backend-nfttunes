const { createHash } = require('crypto');
const { Config } = require('../../common/models');
const {
  APP_PREFIX,
  ACCOUNT,
  CATEGORIES,
  CURRENCY,
  MARKET_FEE,
  NFT_SYMBOL,
  NODES,
  SIDECHAIN_ID,
  SIDECHAIN_RPC,
  TOKEN_ISSUANCE_BASE_FEE,
  TOKEN_ISSUANCE_FEE,
} = require('../../common/config');

module.exports = [
  {
    method: 'GET',
    path: '/settings',
    handler: async (request, h) => {
      const config = await Config.findOne({}).lean();

      const response = {
        prefix: APP_PREFIX,
        account: ACCOUNT,
        categories: CATEGORIES,
        currency: CURRENCY,
        nft_symbol: NFT_SYMBOL,
        nodes: NODES,
        maintenance: config?.maintenance || false,
        market_fee: MARKET_FEE,
        sidechain_id: SIDECHAIN_ID,
        sidechain_rpc: SIDECHAIN_RPC,
        token_issuance_base_fee: TOKEN_ISSUANCE_BASE_FEE,
        token_issuance_fee: TOKEN_ISSUANCE_FEE,
      };

      const hash = createHash('sha1');
      hash.update(JSON.stringify(response));

      const etag = hash.digest('base64');

      return h.response(response).etag(etag);
    },
  },
];
