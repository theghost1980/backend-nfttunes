const { Notification, Transaction } = require('../../common/models');
const { parseJSON } = require('../helpers');
const logger = require('../../common/logger');

module.exports = async (trx) => {
  const {
    sender: username,
    trx_id: trxId,
    chain_block: chainBock,
    sidechain_block: scBlock,
    timestamp,
    payload,
  } = trx;

  try {
    const {
      to, quantity, symbol, memo,
    } = payload;

    const amount = Number(quantity);

    const jsonMemo = parseJSON(memo);

    if (jsonMemo) {
      const {
        type, nft_id: nftId, series, edition, ref_trx: refTrx,
      } = jsonMemo;

      if (type && type === 'royalty_payment') {
        // INSERTING NOTIFICATION
        try {
          await Notification.create({
            account: to,
            type: 'royalty_payment',
            data: JSON.stringify({
              nft_id: nftId,
              series,
              edition,
              amount,
              symbol,
              ref_trx: refTrx,
            }),
          });
        } catch (e) {
          logger.error(`Error: Inserting royalty notification. User: ${username} TX: ${trxId} Message: ${e.message}`);
        }

        try {
          await Transaction.create({
            account: username,
            counterparty: to,
            type: 'royalty_payment',
            chain_block: chainBock,
            sidechain_block: scBlock,
            trx_id: trxId,
            series,
            data: JSON.stringify({
              nft_id: nftId,
              series,
              edition,
              amount,
              symbol,
              ref_trx: refTrx,
            }),
            timestamp,
          });
        } catch (e) {
          logger.error(`Error: Inserting royalty transaction. User: ${username} TX: ${trxId} Message: ${e.message}`);
        }
      }
    }
  } catch (e) {
    logger.error(`Error: Inserting rolalty payment record. User: ${username} TX: ${trxId} Message: ${e.message}`);
  }
};
