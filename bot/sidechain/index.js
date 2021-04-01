const { NFT_SYMBOL, ACCOUNT, CURRENCY } = require('../../common/config');
const nftBurn = require('./nft-burn');
const nftBuy = require('./nft-buy');
const nftCancelSell = require('./nft-cancel-sale');
const nftChangePrice = require('./nft-change-price');
const nftSell = require('./nft-sell');
const nftTransfer = require('./nft-transfer');
const royaltyPayment = require('./royalty-payment');
const referralBonusPayment = require('./referral-bonus-payment');
const mintTokens = require('./mint-tokens');

const blockProcessor = async (data, scClient, state) => {
  if (data.length <= 0) return;

  for (let i = 0; i < data.length; i += 1) {
    const trx = data[i];

    if (trx.contract === 'nft' && trx.payload.nfts?.find((n) => n.symbol === NFT_SYMBOL)) {
      if (trx.action === 'transfer') {
        await nftTransfer(trx, scClient);
      } else if (trx.action === 'burn') {
        await nftBurn(trx, scClient);
      }
    } else if (trx.contract === 'nftmarket' && trx.payload.symbol === NFT_SYMBOL) {
      if (trx.action === 'buy') {
        await nftBuy(trx, scClient);
      } else if (trx.action === 'sell') {
        await nftSell(trx, scClient);
      } else if (trx.action === 'cancel') {
        await nftCancelSell(trx, scClient);
      } else if (trx.action === 'changePrice') {
        await nftChangePrice(trx, scClient);
      }
    } else if (trx.contract === 'tokens' && trx.action === 'transfer' && trx.payload.symbol === CURRENCY && (trx.payload.to === ACCOUNT || trx.sender === ACCOUNT)) {
      if (trx.payload.to === ACCOUNT) {
        await mintTokens(trx, scClient);
      } else {
        await royaltyPayment(trx, scClient);
        await referralBonusPayment(trx, scClient);
      }
    }
  }

  state.saveState({ chain: 'hive-engine', block: data[0].sidechain_block });
};

module.exports = blockProcessor;
