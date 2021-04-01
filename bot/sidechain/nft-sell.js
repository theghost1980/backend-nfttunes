const config = require('../../common/config');
const { Nft, Transaction } = require('../../common/models');
const { updateMarket } = require('./modules');
const logger = require('../../common/logger');

module.exports = async (trx, scClient) => {
  const {
    sender: username,
    trx_id: trxId,
    chain_block: chainBock,
    sidechain_block: scBlock,
    timestamp,
    logs,
  } = trx;

  try {
    const sellOrders = logs.events.filter((e) => e.contract === 'nftmarket'
      && e.event === 'sellOrder'
      && e.data.symbol === config.NFT_SYMBOL);

    const nftIds = sellOrders.map((o) => Number(o.data.nftId));

    const nftData = await scClient.getNFTInstances(config.NFT_SYMBOL, {
      _id: { $in: nftIds },
    });

    // INSERTING SELL TRANSACTIONS
    try {
      const transactions = sellOrders.reduce((acc, cur) => {
        const {
          nftId, price, priceSymbol, fee,
        } = cur.data;

        const nft = nftData.find((d) => Number(d._id) === Number(nftId));

        if (nft) {
          const { series, edition } = nft.properties;

          acc.push({
            account: username,
            counterparty: null,
            type: 'sell',
            chain_block: chainBock,
            sidechain_block: scBlock,
            trx_id: trxId,
            series,
            data: JSON.stringify({
              nft_id: nftId,
              price,
              symbol: priceSymbol,
              fee,
              series,
              edition,
            }),
            timestamp,
          });
        }

        return acc;
      }, []);

      await Transaction.insertMany(transactions);
    } catch (e) {
      logger.error(`Error: Inserting sell transactions. User: ${username} TX: ${trxId} Message: ${e.message}`);
    }

    // UPDATING NFT DATA
    try {
      const updateOnes = sellOrders.reduce((ops, order) => {
        const {
          nftId, price, fee, priceSymbol,
        } = order.data;

        const nft = nftData.find((d) => Number(d._id) === Number(nftId));

        if (nft) {
          const { series, edition } = nft.properties;

          ops.push({
            updateOne: {
              filter: { nft_id: Number(nftId) },
              update: {
                nft_id: Number(nftId),
                account: username,
                price: Number(price),
                symbol: priceSymbol.toUpperCase(),
                fee: Number(fee),
                series,
                edition,
                for_sale: true,
              },
              upsert: true,
            },
          });
        }

        return ops;
      }, []);

      await Nft.bulkWrite(updateOnes);
    } catch (e) {
      logger.error(`Error: Updating sell order record. User: ${username} TX: ${trxId} Message: ${e.message}`);
    }

    // UPDATING PRICE
    try {
      await updateMarket(scClient, nftData.map((n) => n.properties.series));
    } catch (e) {
      logger.error(`Error: Updating price. User: ${username} TX: ${trxId} Message: ${e.message}`);
    }
  } catch (e) {
    logger.error(`Error: Updating sell order record. User: ${username} TX: ${trxId} Message: ${e.message}`);
  }
};
