const logger = require('../common/logger');
const config = require('../common/config');
const { getClient, activeKey, utils: { sleep } } = require('../common/chain');

const hiveClient = getClient();

const arrayChunk = (array, size = 10) => {
  const chunkedArray = [];
  let index = 0;

  while (index < array.length) {
    chunkedArray.push(array.slice(index, size + index));
    index += size;
  }

  return chunkedArray;
};

const issueMultiple = async (instances) => {
  const issueOp = {
    contractName: 'nft',
    contractAction: 'issueMultiple',
    contractPayload: {
      instances,
    },
  };

  try {
    await hiveClient.broadcast.json({
      required_auths: [config.ACCOUNT],
      required_posting_auths: [],
      id: config.SIDECHAIN_ID,
      json: JSON.stringify(issueOp),
    }, activeKey);

    logger.info(`Success: Issued ${instances.length} tokens to @${instances[0].to} Series: ${instances[0].properties.series} Tokens: ${instances[0].properties.edition}-${instances[instances.length - 1].properties.edition}`);
  } catch (e) {
    logger.error(`Error: Failed to issue. User: ${instances[0].to}  Series: ${instances[0].properties.series} Tokens: ${instances[0].properties.edition}-${instances[instances.length - 1].properties.edition} Message: ${e.message}`);
  }
};

const isURL = (string) => {
  try {
    const url = new URL(string);

    if (url.origin !== config.DO_BASE_URL) return false;

    if (url) return true;
  } catch (_) {
    return false;
  }

  return true;
};

const parseJSON = (json) => {
  try {
    return JSON.parse(json);
  } catch {
    //
  }

  return null;
};

const refundToken = async (to, quantity, symbol, memo = '', sender) => {
  const account = sender || config.ACCOUNT;

  const json = {
    contractName: 'tokens',
    contractAction: 'transfer',
    contractPayload: {
      symbol,
      to,
      quantity: quantity.toString(),
      memo,
    },
  };

  await hiveClient.broadcast.json({
    required_auths: [account],
    required_posting_auths: [],
    id: config.SIDECHAIN_ID,
    json: JSON.stringify(json),
  }, activeKey);

  logger.info(`Refunded ${quantity} ${symbol} to ${to}. Reason: ${memo}`);
};

const slugify = (string) => {
  const a = 'àáâäæãåāăąçćčđďèéêëēėęěğǵḧîïíīįìłḿñńǹňôöòóœøōõőṕŕřßśšşșťțûüùúūǘůűųẃẍÿýžźż·/_,:;';
  const b = 'aaaaaaaaaacccddeeeeeeeegghiiiiiilmnnnnoooooooooprrsssssttuuuuuuuuuwxyyzzz------';
  const p = new RegExp(a.split('').join('|'), 'g');

  return string.toString().toLowerCase()
    .replace(/\s+/g, '-') // Replace spaces with -
    .replace(p, (c) => b.charAt(a.indexOf(c))) // Replace special characters
    .replace(/&/g, '-and-') // Replace & with 'and'
    .replace(/[^\w-]+/g, '') // Remove all non-word characters
    .replace(/--+/g, '-') // Replace multiple - with single -
    .replace(/^-+/, '') // Trim - from start of text
    .replace(/-+$/, ''); // Trim - from end of text
};

const toFixedWithoutRounding = (t, l = 3) => {
  const a = 10 ** l;
  const s = t * a;
  return Math.trunc(s) / a;
};

const transferReferralBonus = async (to, amount, memo) => {
  const jsonOp = {
    contractName: 'tokens',
    contractAction: 'transfer',
    contractPayload: {
      to,
      quantity: amount.toFixed(3),
      symbol: config.CURRENCY,
      memo: JSON.stringify(memo),
    },
  };

  try {
    await hiveClient.broadcast.json({
      required_auths: [config.ACCOUNT],
      required_posting_auths: [],
      id: config.SIDECHAIN_ID,
      json: JSON.stringify(jsonOp),
    }, activeKey);

    logger.info(`Success: Paid referral bonus of ${amount} ${config.CURRENCY} to @${to}.`);
  } catch (e) {
    logger.error(`Error: Failed to pay referral bonus of ${amount} ${config.CURRENCY} to @${to}. Message: ${e.message}`);
  }
};

module.exports = {
  arrayChunk,
  issueMultiple,
  isURL,
  parseJSON,
  refundToken,
  sleep,
  slugify,
  toFixedWithoutRounding,
  transferReferralBonus,
};
