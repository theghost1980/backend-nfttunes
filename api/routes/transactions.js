const Joi = require('joi');
const { createHash } = require('crypto');
const { Transaction } = require('../../common/models');

module.exports = [
  {
    method: 'GET',
    path: '/transactions/history',
    options: {
      validate: {
        query: Joi.object({
          username: Joi.string().lowercase().min(3).max(16),
          series: Joi.string().lowercase(),
          types: Joi.string().lowercase(),
          limit: Joi.number().min(1).max(1000).default(100),
        }).options({ stripUnknown: true }),
      },
    },
    handler: async (request, h) => {
      const {
        username, series, types, limit,
      } = request.query;

      const query = {};

      const transactionTypes = (types) ? types.split(',') : '';

      if (transactionTypes) query.type = { $in: transactionTypes };

      if (username) query.$or = [{ account: username }, { counterparty: username }];

      if (series) query.series = series;

      const allTransactions = await Transaction.find(query)
        .select('-_id')
        .sort({ timestamp: -1 })
        .limit(limit);

      const hash = createHash('sha1');
      hash.update(JSON.stringify(allTransactions));

      const etag = hash.digest('base64');

      return h.response(allTransactions).etag(etag);
    },
  },
  {
    method: 'GET',
    path: '/transactions/find',
    options: {
      validate: {
        query: Joi.object({
          trx_id: Joi.string().required(),
        }).options({ stripUnknown: true }),
      },
    },
    handler: async (request, h) => {
      const { trx_id: trxId } = request.query;

      const transaction = await Transaction.findOne({ trx_id: trxId }).select('-_id').lean();

      const hash = createHash('sha1');
      hash.update(JSON.stringify(transaction));

      const etag = hash.digest('base64');

      return h.response(transaction).etag(etag);
    },
  },
];
