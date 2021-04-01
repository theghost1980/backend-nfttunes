const Joi = require('joi');
const { createHash } = require('crypto');
const { Collectible } = require('../../common/models');

module.exports = [
  {
    method: 'GET',
    path: '/market',
    options: {
      validate: {
        query: Joi.object({
          sort_by: Joi.string().default('newest').lowercase(),
          limit: Joi.number().default(15).min(1).max(1000),
          page: Joi.number().default(1).min(1),
          price_min: Joi.number(),
          price_max: Joi.number(),
          rights: Joi.number().min(1),
          category: Joi.string(),
        }),
      },
    },
    handler: async (request, h) => {
      const {
        sort_by: sortBy,
        limit,
        page,
        price_min: priceMin,
        price_max: priceMax,
        rights,
        category,
      } = request.query;

      const skip = (page - 1) * limit;

      const sort = {};

      if (sortBy === 'price_asc') sort.price = 1;
      if (sortBy === 'price_desc') sort.price = -1;
      if (sortBy === 'newest') sort.created_at = -1;
      if (sortBy === 'oldest') sort.created_at = 1;
      if (sortBy === 'updated') sort.last_updated = -1;

      const match = { count: { $gt: 0 } };

      if (priceMin && !priceMax) match.price = { $gte: priceMin };
      if (priceMax && !priceMin) match.price = { $lte: priceMax };

      if (priceMin && priceMax) {
        match.$and = [
          { price: { $gte: priceMin } }, { price: { $lte: priceMax } },
        ];
      }

      if (rights) match.rights = rights;
      if (category) match.category = category;

      const query = [{
        $match: { published: true },
      }, {
        $lookup: {
          from: 'markets',
          localField: 'series',
          foreignField: 'series',
          as: 'market',
        },
      }, {
        $replaceRoot: { newRoot: { $mergeObjects: [{ $arrayElemAt: ['$market', 0] }, '$$ROOT'] } },
      }, {
        $match: match,
      }, {
        $sort: sort,
      }, {
        $skip: skip,
      }, {
        $limit: limit,
      }, {
        $project: {
          _id: 0,
          __v: 0,
          market: 0,
          count: 0,
          description: 0,
          tags: 0,
          created_at: 0,
          updated_at: 0,
          last_updated: 0,
        },
      }];

      const aggregate = await Collectible.aggregate(query);

      const hash = createHash('sha1');
      hash.update(JSON.stringify(aggregate));

      const etag = hash.digest('base64');

      return h.response(aggregate).etag(etag);
    },
  },
];
