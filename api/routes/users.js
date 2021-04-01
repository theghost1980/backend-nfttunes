const Joi = require('joi');
const { createHash } = require('crypto');
const { Notification, User, Collectible } = require('../../common/models');
const config = require('../../common/config');

module.exports = [
  {
    method: 'GET',
    path: '/users/profile',
    options: {
      auth: 'jwt',
    },
    handler: async (request, h) => {
      const { sub: username } = request.auth.credentials;

      const admin = config.ADMINS.includes(username);

      const user = await User.findOne({ username }, '-_id username avatar full_name bio location website instagram twitter portfolio soundcloud whitelist_applied whitelisted').lean();

      const response = { ...user, admin };

      const hash = createHash('sha1');
      hash.update(JSON.stringify(response));

      const etag = hash.digest('base64');

      return h.response(response).etag(etag);
    },
  },
  {
    method: 'POST',
    path: '/users/profile',
    options: {
      auth: 'jwt',
      validate: {
        payload: Joi.object({
          full_name: Joi.string().max(255).allow(''),
          bio: Joi.string().max(1000).allow(''),
          location: Joi.string().max(255).allow(''),
          website: Joi.string().uri().allow(''),
          instagram: Joi.string().uri().allow(''),
          twitter: Joi.string().uri().allow(''),
          portfolio: Joi.string().uri().allow(''),
          soundcloud: Joi.string().uri().allow(''),
        }).options({ stripUnknown: true }),
      },
    },
    handler: async (request) => {
      let success = false;

      const {
        full_name: fullName,
        bio,
        location,
        website,
        instagram,
        twitter,
        portfolio,
        soundcloud,
      } = request.payload;
      const { sub: username } = request.auth.credentials;

      const user = await User.findOne({ username, banned: false });

      if (user) {
        user.full_name = fullName;
        user.bio = bio;
        user.location = location;
        user.website = website;
        user.instagram = instagram;
        user.twitter = twitter;
        user.portfolio = portfolio;
        user.soundcloud = soundcloud;

        await user.save();

        success = true;
      }

      const response = {
        success,
      };

      return response;
    },
  },
  {
    method: 'GET',
    path: '/users/notifications',
    options: {
      auth: 'jwt',
    },
    handler: async (request, h) => {
      const { sub: username } = request.auth.credentials;

      let notifications = await Notification.find({ account: username, read: false }).lean();

      notifications = notifications.map((n) => {
        const notification = {
          id: n._id,
          ...n,
        };

        delete notification._id;

        return notification;
      });

      const response = [...notifications];

      const hash = createHash('sha1');
      hash.update(JSON.stringify(response));

      const etag = hash.digest('base64');

      return h.response(response).etag(etag);
    },
  },
  {
    method: 'POST',
    path: '/users/notifications',
    options: {
      auth: 'jwt',
      validate: {
        payload: Joi.object({
          ids: Joi.array().required(),
        }),
      },
    },
    handler: async (request) => {
      const { sub: username } = request.auth.credentials;
      const { ids } = request.payload;

      let success = false;

      try {
        await Notification.findOneAndUpdate(
          { account: username, _id: { $in: ids } },
          { $set: { read: true } },
        );
        success = true;
      } catch {
        //
      }

      return {
        success,
      };
    },
  },
  {
    method: 'POST',
    path: '/users/whitelist/apply',
    options: {
      auth: 'jwt',
    },
    handler: async (request) => {
      const { sub: username } = request.auth.credentials;

      let success = false;

      try {
        const user = await User.findOne({ username, whitelisted: false, whitelist_applied: false });

        if (user) {
          user.whitelist_applied = true;
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
    path: '/users/following',
    options: {
      validate: {
        query: Joi.object({
          username: Joi.string().lowercase().min(3).max(16)
            .required(),
        }).options({ stripUnknown: true }),
      },
    },
    handler: async (request, h) => {
      const { username } = request.query;

      let result = [];

      try {
        const user = await User.findOne({ username }).lean();

        if (user && user.following) result = user.following;
      } catch (e) {
        //
      }

      const hash = createHash('sha1');
      hash.update(JSON.stringify(result));

      const etag = hash.digest('base64');

      return h.response(result).etag(etag);
    },
  },
  {
    method: 'GET',
    path: '/users/followers',
    options: {
      validate: {
        query: Joi.object({
          username: Joi.string().lowercase().min(3).max(16)
            .required(),
        }).options({ stripUnknown: true }),
      },
    },
    handler: async (request, h) => {
      const { username } = request.query;

      let result = [];

      try {
        let user = await User.find({ following: username }).select('-_id username').lean();

        user = user.map((u) => u.username);

        result = user;
      } catch {
        //
      }

      const hash = createHash('sha1');
      hash.update(JSON.stringify(result));

      const etag = hash.digest('base64');

      return h.response(result).etag(etag);
    },
  },
  {
    method: 'POST',
    path: '/users/follow',
    options: {
      auth: 'jwt',
      validate: {
        payload: Joi.object({
          username: Joi.string().lowercase().min(3).max(16)
            .required(),
          follow: Joi.boolean().required(),
        }).options({ stripUnknown: true }),
      },
    },
    handler: async (request) => {
      const response = { success: true };

      const { username, follow } = request.payload;
      const { sub } = request.auth.credentials;

      try {
        const exists = await User.findOne({
          $and: [
            { username },
            { username: { $ne: sub } },
          ],
        });

        if (exists) {
          if (follow) {
            await User.updateOne({ username: sub }, { $addToSet: { following: username } });
          } else {
            await User.updateOne({ username: sub }, { $pull: { following: username } });
          }
        }
      } catch {
        response.success = false;
      }

      return response;
    },
  },
  {
    method: 'GET',
    path: '/users/feed',
    options: {
      validate: {
        query: Joi.object({
          username: Joi.string().lowercase().min(3).max(16)
            .required(),
          limit: Joi.number().min(1).max(1000).default(50),
        }).options({ stripUnknown: true }),
      },
    },
    handler: async (request, h) => {
      const { username, limit } = request.query;

      const user = await User.findOne({ username });

      const userFeed = await Collectible.find({ creator: { $in: user.following } })
        .select('-_id creator name series thumbnail file editions nsfw created_at')
        .sort({ created_at: -1 })
        .limit(limit)
        .lean();

      const hash = createHash('sha1');
      hash.update(JSON.stringify(userFeed));

      const etag = hash.digest('base64');

      return h.response(userFeed).etag(etag);
    },
  },
];
