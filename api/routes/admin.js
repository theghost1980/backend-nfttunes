const Joi = require('joi');
const Boom = require('@hapi/boom');
const { createHash } = require('crypto');
const { Collectible, Report, User } = require('../../common/models');
const config = require('../../common/config');

const isAdmin = (request, h) => {
  if (!config.ADMINS.includes(request.auth.credentials.sub)) {
    return Boom.unauthorized();
  }

  return h.continue;
};

module.exports = [
  {
    method: 'GET',
    path: '/admin/collectibles',
    options: {
      auth: 'jwt',
      ext: {
        onCredentials: { method: isAdmin },
      },
      validate: {
        query: Joi.object({
          username: Joi.string().min(3).max(16),
          category: Joi.string(),
          published: Joi.boolean().default(true),
          nsfw: Joi.boolean(),
          featured: Joi.boolean(),
          sort_by: Joi.string().default('created_at'),
          descending: Joi.boolean().default(true),
          limit: Joi.number().default(1000),
          page: Joi.number().default(1),
        }).options({ stripUnknown: true }),
      },
    },
    handler: async (request, h) => {
      const {
        username,
        category,
        published,
        sort_by: sortBy,
        descending,
        limit,
        page,
        nsfw,
        featured,
      } = request.query;

      const skip = (page - 1) * limit;
      const query = {};

      if (username) query.creator = username;
      if (category) query.category = category;

      if (typeof published === 'boolean') query.published = published;
      if (typeof featured === 'boolean') query.featured = featured;
      if (typeof nsfw === 'boolean') query.nsfw = nsfw;

      const collectibles = await Collectible.find(query)
        .select('-_id -updated_at')
        .sort({ [sortBy]: descending ? -1 : 1 })
        .skip(skip)
        .limit(limit)
        .lean();

      const count = await Collectible.countDocuments(query);

      const hash = createHash('sha1');
      hash.update(JSON.stringify(collectibles));

      const etag = hash.digest('base64');

      const response = {
        total: count,
        results: collectibles,
      };

      return h.response(response).etag(etag);
    },
  },
  {
    method: 'GET',
    path: '/admin/users',
    options: {
      auth: 'jwt',
      ext: {
        onCredentials: { method: isAdmin },
      },
      validate: {
        query: Joi.object({
          whitelisted: Joi.boolean(),
          banned: Joi.boolean(),
          sort_by: Joi.string().default('created_at'),
          descending: Joi.boolean().default(true),
          limit: Joi.number().default(1000),
          page: Joi.number().default(1),
        }).options({ stripUnknown: true }),
      },
    },
    handler: async (request, h) => {
      const {
        whitelisted, banned, sort_by: sortBy, descending, limit, page,
      } = request.query;

      const skip = (page - 1) * limit;
      const query = {};

      if (typeof whitelisted === 'boolean') query.whitelisted = whitelisted;
      if (typeof banned === 'boolean') query.banned = banned;

      const users = await User.find(query)
        .select('-_id -updated_at')
        .sort({ [sortBy]: descending ? -1 : 1 })
        .skip(skip)
        .limit(limit)
        .lean();

      const count = await User.countDocuments(query);

      const hash = createHash('sha1');
      hash.update(JSON.stringify(users));

      const etag = hash.digest('base64');

      const response = {
        total: count,
        results: users,
      };

      return h.response(response).etag(etag);
    },
  },
  {
    method: 'GET',
    path: '/admin/whitelist-applications',
    options: {
      auth: 'jwt',
      ext: {
        onCredentials: { method: isAdmin },
      },
    },
    handler: async (request, h) => {
      const users = await User.find({ whitelist_applied: true, whitelisted: false })
        .sort({ whitelist_applied_at: -1 })
        .select('-_id -created_at -updated_at').lean();

      const hash = createHash('sha1');
      hash.update(JSON.stringify(users));

      const etag = hash.digest('base64');

      return h.response(users).etag(etag);
    },
  },
  {
    method: 'POST',
    path: '/admin/whitelist',
    options: {
      auth: 'jwt',
      ext: {
        onCredentials: { method: isAdmin },
      },
      validate: {
        payload: Joi.object({
          username: Joi.string().min(3).max(16).required(),
          action: Joi.string().valid('approve', 'pending').required(),
          value: Joi.boolean().required(),
        }).options({ stripUnknown: true }),
      },
    },
    handler: async (request) => {
      let success = false;

      const { username, action, value } = request.payload;

      try {
        const user = await User.findOne({ username, whitelisted: false, whitelist_applied: true });

        if (user) {
          if (action === 'approve') {
            user.whitelisted = value;
            user.application_pending = false;

            if (!value) {
              user.whitelist_applied = false;
            }
          } else if (action === 'pending') {
            user.application_pending = value;
          }

          await user.save();

          success = true;
        }
      } catch {
        //
      }

      return {
        success,
      };
    },
  },
  {
    method: 'GET',
    path: '/admin/reports',
    options: {
      auth: 'jwt',
      ext: {
        onCredentials: { method: isAdmin },
      },
    },
    handler: async (request, h) => {
      const reports = await Report.find({ processed: false })
        .select('-_id -created_at -updated_at').lean();

      const hash = createHash('sha1');
      hash.update(JSON.stringify(reports));

      const etag = hash.digest('base64');

      return h.response(reports).etag(etag);
    },
  },
];
