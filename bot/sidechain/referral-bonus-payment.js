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
        type, series, ref_trx: refTrx, referred_account: account,
      } = jsonMemo;

      if (type && type === 'referral_bonus') {
        // INSERTING NOTIFICATION
        try {
          await Notification.create({
            account: to,
            type: 'referral_bonus',
            data: JSON.stringify({
              series,
              amount,
              symbol,
              referred_account: account,
              ref_trx: refTrx,
            }),
          });
        } catch (e) {
          logger.error(`Error: Inserting referral bonus notification. User: ${username} TX: ${trxId} Message: ${e.message}`);
        }

        try {
          await Transaction.create({
            account: username,
            counterparty: to,
            type: 'referral_bonus',
            chain_block: chainBock,
            sidechain_block: scBlock,
            trx_id: trxId,
            series,
            data: JSON.stringify({
              series,
              amount,
              symbol,
              referred_account: account,
              ref_trx: refTrx,
            }),
            timestamp,
          });
        } catch (e) {
          logger.error(`Error: Inserting referral bonus transaction. User: ${username} TX: ${trxId} Message: ${e.message}`);
        }
      }
    }
  } catch (e) {
    logger.error(`Error: Inserting referral bonus payment record. User: ${username} TX: ${trxId} Message: ${e.message}`);
  }
};
