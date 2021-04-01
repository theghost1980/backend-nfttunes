const config = require('../../common/config');
const { Collectible, Nft, Transaction } = require('../../common/models');
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
    const burned = logs.events.filter((e) => e.contract === 'nft'
      && e.event === 'burn'
      && e.data.symbol === config.NFT_SYMBOL);

    const nftIds = burned.map((o) => Number(o.data.id));

    const nftData = await scClient.getNFTInstances(config.NFT_SYMBOL, {
      _id: { $in: nftIds },
    });

    // INSERTING BURN TRANSACTIONS
    try {
      const transactions = burned.reduce((acc, cur) => {
        const { id } = cur.data;

        const nft = nftData.find((d) => Number(d._id) === Number(id));

        if (nft) {
          const { series, edition } = nft.properties;

          acc.push({
            account: username,
            counterparty: 'null',
            type: 'burn',
            chain_block: chainBock,
            sidechain_block: scBlock,
            trx_id: trxId,
            series,
            data: JSON.stringify({
              nft_id: id,
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
      logger.error(`Error: Inserting burn transactions. User: ${username} TX: ${trxId} Message: ${e.message}`);
    }

    // UPDATING NFT DATA
    try {
      const updateOnes = burned.reduce((ops, order) => {
        const { id } = order.data;

        const nft = nftData.find((d) => Number(d._id) === Number(id));

        if (nft) {
          const { series, edition } = nft.properties;

          ops.push({
            updateOne: {
              filter: { nft_id: Number(id) },
              update: {
                nft_id: Number(id),
                account: 'null',
                series,
                edition,
                for_sale: false,
                burned: true,
              },
              upsert: true,
            },
          });
        }

        return ops;
      }, []);

      await Nft.bulkWrite(updateOnes);
    } catch (e) {
      logger.error(`Error: Updating burn NFT record. User: ${username} TX: ${trxId} Message: ${e.message}`);
    }

    // UNPUBLISHING IF ALL EDITIONS ARE BURNED
    const uniqueSeries = Array.from(new Set(nftData.map((n) => n.properties.series)));

    for (let i = 0; i < uniqueSeries.length; i += 1) {
      try {
        const nftInstances = await scClient.getNFTInstances(config.NFT_SYMBOL, {
          'properties.series': uniqueSeries[i],
        });

        if (nftInstances.every((instance) => instance.account === 'null')) {
          await Collectible.updateOne({ series: uniqueSeries[i] }, { $set: { published: false } });
        }
      } catch {
        //
      }
    }
  } catch (e) {
    logger.error(`Error: Updating burn record. User: ${username} TX: ${trxId} Message: ${e.message}`);
  }
};
