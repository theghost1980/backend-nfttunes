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
    const canceledOrders = logs.events.filter((e) => e.contract === 'nftmarket'
      && e.event === 'cancelOrder'
      && e.data.symbol === config.NFT_SYMBOL);

    const nftIds = canceledOrders.map((o) => Number(o.data.nftId));

    const nftData = await scClient.getNFTInstances(config.NFT_SYMBOL, {
      _id: { $in: nftIds },
    });

    // INSERTING CANCEL SALE TRANSACTIONS
    try {
      const transactions = canceledOrders.reduce((acc, cur) => {
        const {
          nftId, price, fee, priceSymbol,
        } = cur.data;

        const nft = nftData.find((d) => Number(d._id) === Number(nftId));

        if (nft) {
          const { series, edition } = nft.properties;

          acc.push({
            account: username,
            counterparty: null,
            type: 'cancel_sale',
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
      logger.error(`Error: Inserting cancel sale transactions. User: ${username} TX: ${trxId} Message: ${e.message}`);
    }

    // UPDATING NFT DATA
    try {
      const updateOnes = canceledOrders.reduce((ops, order) => {
        const { nftId } = order.data;

        const nft = nftData.find((d) => Number(d._id) === Number(nftId));

        if (nft) {
          const { series, edition } = nft.properties;

          ops.push({
            updateOne: {
              filter: { nft_id: Number(nftId) },
              update: {
                nft_id: Number(nftId),
                account: username,
                series,
                edition,
                for_sale: false,
              },
              upsert: true,
            },
          });
        }

        return ops;
      }, []);

      await Nft.bulkWrite(updateOnes);
    } catch (e) {
      logger.error(`Error: Updating cancel sale record. User: ${username} TX: ${trxId} Message: ${e.message}`);
    }

    // UPDATING PRICE
    try {
      await updateMarket(scClient, nftData.map((n) => n.properties.series));
    } catch (e) {
      logger.error(`Error: Updating market price. User: ${username} TX: ${trxId} Message: ${e.message}`);
    }
  } catch (e) {
    logger.error(`Error: Updating cancel sale record. User: ${username} TX: ${trxId} Message: ${e.message}`);
  }
};
