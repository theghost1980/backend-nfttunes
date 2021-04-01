const config = require('../../common/config');
const { Nft, Notification, Transaction } = require('../../common/models');
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
    const transfers = logs.events.filter((e) => e.contract === 'nft'
      && e.event === 'transfer'
      && e.data.symbol === config.NFT_SYMBOL);

    const nftIds = transfers.map((o) => Number(o.data.id));

    const nftData = await scClient.getNFTInstances(config.NFT_SYMBOL, {
      _id: { $in: nftIds },
    });

    // INSERTING TRANSFER TRANSACTIONS
    try {
      const transactions = transfers.reduce((acc, cur) => {
        const { id, to, from } = cur.data;

        const nft = nftData.find((d) => Number(d._id) === Number(id));

        if (nft) {
          const { series, edition } = nft.properties;

          acc.push({
            account: username,
            counterparty: to,
            type: 'transfer',
            chain_block: chainBock,
            sidechain_block: scBlock,
            trx_id: trxId,
            series,
            data: JSON.stringify({
              nft_id: id,
              from,
              to,
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
      logger.error(`Error: Inserting transfer transactions. User: ${username} TX: ${trxId} Message: ${e.message}`);
    }

    // UPDATING NFT DATA
    try {
      const updateOnes = transfers.reduce((acc, cur) => {
        const { id, to } = cur.data;

        const nft = nftData.find((d) => Number(d._id) === Number(id));

        if (nft) {
          const { series, edition } = nft.properties;

          acc.push({
            updateOne: {
              filter: { nft_id: Number(id) },
              update: {
                nft_id: Number(id),
                account: to,
                series,
                edition,
                for_sale: false,
              },
              upsert: true,
            },
          });
        }

        return acc;
      }, []);

      await Nft.bulkWrite(updateOnes);
    } catch (e) {
      logger.error(`Error: Updating transfer record. User: ${username} TX: ${trxId} Message: ${e.message}`);
    }

    // INSERTING NOTIFICATION
    try {
      const notifications = transfers.reduce((acc, cur) => {
        const { id, to, from } = cur.data;

        const nft = nftData.find((d) => Number(d._id) === Number(id));

        if (nft) {
          const { series, edition } = nft.properties;

          acc.push({
            account: to,
            type: 'gift',
            data: JSON.stringify({
              nft_id: id,
              series,
              edition,
              to,
              from,
            }),
          });
        }

        return acc;
      }, []);

      await Notification.insertMany(notifications);
    } catch (e) {
      logger.error(`Error: Inserting transfer notification. User: ${username} TX: ${trxId} Message: ${e.message}`);
    }
  } catch (e) {
    logger.error(`Error: Updating transfer record. User: ${username} TX: ${trxId} Message: ${e.message}`);
  }
};
