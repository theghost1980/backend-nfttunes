const Joi = require('joi');
const { createHash } = require('crypto');
const { subDays } = require('date-fns');
const { Statistics } = require('../../common/models');

module.exports = [
  {
    method: 'GET',
    path: '/statistics',
    options: {
      validate: {
        query: Joi.object({
          days: Joi.number().default(1).min(1).max(60),
        }),
      },
    },
    handler: async (request, h) => {
      const { days } = request.query;

      const currentDate = new Date(new Date().toDateString());
      const queryDate = subDays(currentDate, days);

      const stats = await Statistics.find({}).select('-_id')
        .where('timestamp').gte(queryDate)
        .sort({ timestamp: -1 });

      const hash = createHash('sha1');
      hash.update(JSON.stringify(stats));

      const etag = hash.digest('base64');

      return h.response(stats).etag(etag);
    },
  },
];
