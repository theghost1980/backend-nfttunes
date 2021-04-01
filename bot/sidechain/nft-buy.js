const config = require('../../common/config');
const { Nft, Notification, Transaction } = require('../../common/models');
const { payRoyalty, updateMarket } = require('./modules');
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
    const [hitSellOrder] = logs.events.filter((e) => e.contract === 'nftmarket'
      && e.event === 'hitSellOrder'
      && e.data.symbol === config.NFT_SYMBOL);

    const nftIds = hitSellOrder.data.sellers.map((o) => o.nftIds).flat(Infinity);

    const nftData = await Nft.find({ nft_id: { $in: nftIds } }).lean();

    const feeReceived = logs.events.find((e) => e.contract === 'tokens'
      && e.event === 'transfer'
      && e.data.to === config.ACCOUNT);

    // NOTIFICATION
    try {
      const notifications = nftData.reduce((acc, cur) => {
        const {
          nft_id: nftId, series, edition, account, price, symbol,
        } = cur;

        acc.push({
          account: username,
          type: 'buy',
          data: JSON.stringify({
            nft_id: nftId,
            series,
            edition,
            seller: account,
            price,
            symbol,
          }),
        });

        acc.push({
          account,
          type: 'sell',
          data: JSON.stringify({
            nft_id: nftId,
            series,
            edition,
            buyer: username,
            price,
            symbol,
          }),
        });

        return acc;
      }, []);

      await Notification.insertMany(notifications);
    } catch (e) {
      logger.error(`Error: Inserting notification. User: ${username} TX: ${trxId} Message: ${e.message}`);
    }

    // INSERTING BUY TRANSACTION
    try {
      const transactions = nftData.reduce((acc, cur) => {
        const {
          nft_id: nftId, series, edition, account, price, symbol,
        } = cur;

        acc.push({
          account: username,
          counterparty: account,
          type: 'buy',
          chain_block: chainBock,
          sidechain_block: scBlock,
          trx_id: trxId,
          series,
          data: JSON.stringify({
            nft_id: nftId,
            series,
            edition,
            seller: account,
            price,
            symbol,
          }),
          timestamp,
        });

        return acc;
      }, []);

      await Transaction.insertMany(transactions);
    } catch (e) {
      logger.error(`Error: Inserting buy transaction. User: ${username} TX: ${trxId} Message: ${e.message}`);
    }

    // UPDATIG NFT
    try {
      const updateOnes = nftData.reduce((acc, cur) => {
        acc.push({
          updateOne: {
            filter: { nft_id: cur.nft_id },
            update: {
              nft_id: cur.nft_id,
              account: username,
              series: cur.series,
              edition: cur.edition,
              for_sale: false,
            },
            upsert: true,
          },
        });

        return acc;
      }, []);

      await Nft.bulkWrite(updateOnes);
    } catch (e) {
      logger.error(`Error: Updating NFT. User: ${username} TX: ${trxId} Message: ${e.message}`);
    }

    // ROYALTY PAYMENT
    if (feeReceived && Number(hitSellOrder.data.feeTotal) === Number(feeReceived.data.quantity)) {
      try {
        await payRoyalty(nftData, trxId);
      } catch (e) {
        logger.error(`Error: Paying royalty. User: ${username} TX: ${trxId} Message: ${e.message}`);
      }
    }

    // UPDATING PRICES
    try {
      await updateMarket(scClient, nftData.map((n) => n.series));
    } catch (e) {
      logger.error(`Error: Updating price. User: ${username} TX: ${trxId} Message: ${e.message}`);
    }
  } catch (e) {
    logger.error(`Error: Updating buy order record. User: ${username} TX: ${trxId} Message: ${e.message}`);
  }
};
