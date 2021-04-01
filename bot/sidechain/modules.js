const { subDays } = require('date-fns');
const { Market } = require('../../common/models');
const { getClient, PrivateKey } = require('../../common/chain');
const config = require('../../common/config');

const updateMarket = async (scClient, allSeries) => {
  const uniqueSeries = Array.from(new Set(allSeries));

  const requests = uniqueSeries.map((series) => scClient.getNFTSellBook(config.NFT_SYMBOL, {
    'grouping.series': series,
    priceSymbol: config.CURRENCY,
  }));

  const updateOps = [];

  try {
    const sellBooks = await Promise.all(requests);

    for (let i = 0; i < sellBooks.length; i += 1) {
      const sellBook = sellBooks[i];

      const sorted = sellBook.sort((a, b) => Number(a.price) - Number(b.price));

      const { price, priceSymbol, grouping: { series } } = sorted[0];

      updateOps.push({
        updateOne: {
          filter: { series },
          update: [{
            $set: {
              series,
              price: Number(price),
              symbol: priceSymbol,
              count: sorted.length,
              last_updated: { $cond: [{ $lte: ['$last_updated', subDays(new Date(), 1)] }, new Date(), '$last_updated'] },
            },
          }],
          upsert: true,
        },
      });
    }

    await Market.bulkWrite(updateOps);
  } catch (e) {
    //
  }
};

const payRoyalty = async (nfts, trxId) => {
  const client = getClient();

  const royaltyPayments = [];

  for (let i = 0; i < nfts.length; i += 1) {
    const nft = nfts[i];

    const {
      nft_id: nftId, series, edition, fee, account, price, symbol,
    } = nft;

    const [creator] = series.split('_');

    if (account !== creator) {
      const royalty = (price * (fee / 10000)) * config.ROYALTY_PCT * (1 - config.AGENT_FEE);

      royaltyPayments.push({
        contractName: 'tokens',
        contractAction: 'transfer',
        contractPayload: {
          to: creator,
          quantity: parseFloat(royalty).toFixed(3),
          memo: JSON.stringify({
            type: 'royalty_payment',
            nft_id: nftId,
            series,
            edition,
            ref_trx: trxId,
          }),
          symbol,
        },
      });
    }
  }

  if (royaltyPayments.length > 0) {
    await client.broadcast.json({
      required_auths: [config.ACCOUNT],
      required_posting_auths: [],
      id: config.SIDECHAIN_ID,
      json: JSON.stringify(royaltyPayments),
    }, PrivateKey.from(config.ACTIVE_KEY));
  }
};

module.exports = {
  payRoyalty,
  updateMarket,
};
