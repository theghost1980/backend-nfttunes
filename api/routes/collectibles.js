const Joi = require('joi');
const { createHash } = require('crypto');
const { Collectible } = require('../../common/models');

module.exports = [
  {
    method: 'GET',
    path: '/collectibles/info',
    options: {
      validate: {
        query: Joi.object({
          series: Joi.string().lowercase().required(),
        }).options({ stripUnknown: true }),
      },
    },
    handler: async (request, h) => {
      const { series } = request.query;

      let collectible = await Collectible.aggregate([
        { $match: { series } },
        {
          $lookup: {
            from: 'users',
            let: { creator: '$creator' },
            pipeline: [
              { $match: { $expr: { $eq: ['$username', '$$creator'] } } },

              { $project: { _id: 0, username: 1, whitelisted: 1 } },
            ],
            as: 'artist',
          },
        },
        { $unwind: '$artist' },
        { $project: { _id: 0, __v: 0, updated_at: 0 } },
      ]);

      collectible = collectible.length > 0 ? collectible[0] : '';

      const hash = createHash('sha1');
      hash.update(JSON.stringify(collectible));

      const etag = hash.digest('base64');

      return h.response(collectible).etag(etag);
    },
  },
  {
    method: 'POST',
    path: '/collectibles/info',
    options: {
      validate: {
        payload: Joi.object({
          series: Joi.string().lowercase().required(),
        }).options({ stripUnknown: true }),
      },
    },
    handler: async (request) => {
      let { series } = request.payload;
      series = series.split(',');

      const collectibles = await Collectible.aggregate([
        { $match: { series: { $in: series } } },
        {
          $lookup: {
            from: 'users',
            let: { creator: '$creator' },
            pipeline: [
              { $match: { $expr: { $eq: ['$username', '$$creator'] } } },

              { $project: { _id: 0, username: 1, whitelisted: 1 } },
            ],
            as: 'artist',
          },
        },
        { $unwind: '$artist' },
        { $project: { _id: 0, __v: 0, updated_at: 0 } },
      ]);

      return collectibles;
    },
  },
  {
    method: 'GET',
    path: '/collectibles/latest',
    options: {
      validate: {
        query: Joi.object({
          limit: Joi.number().max(1000).default(100),
        }).options({ stripUnknown: true }),
      },
    },
    handler: async (request, h) => {
      const { limit } = request.query;

      const collectibles = await Collectible.find({ published: true }).sort({ created_at: -1 })
        .select('-_id -created_at -updated_at')
        .limit(limit)
        .lean();

      const hash = createHash('sha1');
      hash.update(JSON.stringify(collectibles));

      const etag = hash.digest('base64');

      return h.response(collectibles).etag(etag);
    },
  },
  {
    method: 'GET',
    path: '/collectibles/featured',
    options: {
      validate: {
        query: Joi.object({
          limit: Joi.number().max(1000).default(100),
        }).options({ stripUnknown: true }),
      },
    },
    handler: async (request, h) => {
      const { limit } = request.query;

      const collectibles = await Collectible.aggregate([
        { $match: { published: true, featured: true } },
        { $sort: { created_at: -1 } },
        { $limit: limit },
        {
          $project: {
            thumbnail: true,
            file: true,
            creator: true,
            name: true,
            series: true,
            category: true,
            _id: false,
          },
        }]);

      const hash = createHash('sha1');
      hash.update(JSON.stringify(collectibles));

      const etag = hash.digest('base64');

      return h.response(collectibles).etag(etag);
    },
  },
  {
    method: 'GET',
    path: '/collectibles/list',
    options: {
      validate: {
        query: Joi.object({
          username: Joi.string(),
          published: Joi.boolean(),
          limit: Joi.number().min(1).max(1000).default(100),
          page: Joi.number().min(1).default(1),
        }).options({ stripUnknown: true }),
      },
    },
    handler: async (request, h) => {
      const {
        username, published, limit, page,
      } = request.query;

      const skip = (page - 1) * limit;
      const query = {};

      if (username) query.creator = username;
      if (typeof published === 'boolean') query.published = published;

      const collectibles = await Collectible.find(query)
        .select('-_id -updated_at')
        .sort({ created_at: -1 })
        .skip(skip)
        .limit(limit)
        .lean();

      const hash = createHash('sha1');
      hash.update(JSON.stringify(collectibles));

      const etag = hash.digest('base64');

      return h.response(collectibles).etag(etag);
    },
  },
];
