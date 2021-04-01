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
    const changedPrice = logs.events.filter((e) => e.contract === 'nftmarket'
      && e.event === 'changePrice'
      && e.data.symbol === config.NFT_SYMBOL);

    const nftIds = changedPrice.map((o) => Number(o.data.nftId));

    const nftData = await scClient.getNFTInstances(config.NFT_SYMBOL, {
      _id: { $in: nftIds },
    });

    // INSERTING PRICE CHANGE TRANSACTIONS
    try {
      const transactions = changedPrice.reduce((acc, cur) => {
        const {
          nftId, newPrice, oldPrice, priceSymbol,
        } = cur.data;

        const nft = nftData.find((d) => Number(d._id) === Number(nftId));

        if (nft) {
          const { series, edition } = nft.properties;

          acc.push({
            account: username,
            counterparty: null,
            type: 'change_price',
            chain_block: chainBock,
            sidechain_block: scBlock,
            trx_id: trxId,
            series,
            data: JSON.stringify({
              nft_id: nftId,
              new_price: newPrice,
              old_price: oldPrice,
              symbol: priceSymbol,
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
      logger.error(`Error: Inserting price change transactions. User: ${username} TX: ${trxId} Message: ${e.message}`);
    }

    // UPDATING NFT DATA
    try {
      const updateOnes = changedPrice.reduce((ops, order) => {
        const { nftId, newPrice, priceSymbol } = order.data;

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
                price: Number(newPrice),
                symbol: priceSymbol.toUpperCase(),
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
      logger.error(`Error: Updating changed price record. User: ${username} TX: ${trxId} Message: ${e.message}`);
    }

    // UPDATING PRICE
    try {
      await updateMarket(scClient, nftData.map((n) => n.properties.series));
    } catch (e) {
      logger.error(`Error: Updating market price. User: ${username} TX: ${trxId} Message: ${e.message}`);
    }
  } catch (e) {
    logger.error(`Error: Updating change price record. User: ${username} TX: ${trxId} Message: ${e.message}`);
  }
};
