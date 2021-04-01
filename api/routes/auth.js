const JWT = require('jsonwebtoken');
const Joi = require('joi');
const Boom = require('@hapi/boom');
const userAgent = require('useragent');
const geoip = require('geoip-lite');
const { getClientIp } = require('@supercharge/request-ip');
const { cryptoUtils, Signature } = require('@hiveio/dhive');
const { differenceInMinutes } = require('date-fns');
const { User, RefreshToken } = require('../../common/models');
const { getClient } = require('../../common/chain');
const config = require('../../common/config');

const hiveClient = getClient();

module.exports = [
  {
    method: 'GET',
    path: '/auth/login',
    options: {
      validate: {
        query: Joi.object({
          username: Joi.string().required().min(3).max(16),
          ts: Joi.number().required(),
          sig: Joi.string().required(),
        }).options({ stripUnknown: true }),
      },
    },
    handler: async (request, h) => {
      let response = Boom.unauthorized('Invalid username or signature');

      try {
        const { username, ts, sig } = request.query;

        if (process.env.NODE_ENV === 'production') {
          const timeDifference = differenceInMinutes(Date.now(), ts);

          if (timeDifference >= 3) return Boom.unauthorized('Provided timestamp is invalid or too old. Please check that your system clock has the correct date and time.');
        }

        const [account] = await hiveClient.database.getAccounts([username]);

        let validSignature = false;

        const publicKey = Signature.fromString(sig)
          .recover(cryptoUtils.sha256(`${username}${ts}`))
          .toString();

        const thresholdPosting = account.posting.weight_threshold;
        const thresholdActive = account.active.weight_threshold;

        const authorizedAccountsPosting = new Map(account.posting.account_auths);
        const authorizedAccountsActive = new Map(account.active.account_auths);

        // Trying to validate using posting key
        if (!validSignature) {
          for (let i = 0; i < account.posting.key_auths.length; i += 1) {
            const auth = account.posting.key_auths[i];

            if (auth[0] === publicKey && auth[1] >= thresholdPosting) {
              validSignature = true;
              break;
            }
          }
        }

        // Trying to validate using active key
        if (!validSignature) {
          for (let i = 0; i < account.active.key_auths.length; i += 1) {
            const auth = account.active.key_auths[i];

            if (auth[0] === publicKey && auth[1] >= thresholdActive) {
              validSignature = true;
              break;
            }
          }
        }

        // Trying to validate using posting authority
        if (!validSignature && authorizedAccountsPosting.size > 0) {
          let accountsData = await hiveClient.database.getAccounts(
            Array.from(authorizedAccountsPosting.keys()),
          );

          accountsData = accountsData.map((a) => a.posting.key_auths[0]);

          for (let i = 0; i < accountsData.length; i += 1) {
            const auth = accountsData[i];

            if (auth[0] === publicKey && auth[1] >= thresholdPosting) {
              validSignature = true;
              break;
            }
          }
        }

        // Trying to validate using active authority
        if (!validSignature && authorizedAccountsActive.size > 0) {
          let accountsData = await hiveClient.database.getAccounts(
            Array.from(authorizedAccountsActive.keys()),
          );

          accountsData = accountsData.map((a) => a.active.key_auths[0]);

          for (let i = 0; i < accountsData.length; i += 1) {
            const auth = accountsData[i];

            if (auth[0] === publicKey && auth[1] >= thresholdActive) {
              validSignature = true;
              break;
            }
          }
        }

        if (validSignature) {
          const user = await User.findOneAndUpdate(
            { username },
            { $setOnInsert: { username } },
            { upsert: true, new: true, setDefaultsOnInsert: true },
          ).select('-_id username whitelisted banned').lean();

          const admin = config.ADMINS.includes(username);

          const token = JWT.sign({
            sub: username,
            admin,
          }, config.JWT_SECRET, {
            expiresIn: config.ACCESS_TOKEN_EXPIRATION,
          });

          const refreshToken = JWT.sign({
            sub: username,
          }, config.JWT_SECRET, {
            expiresIn: config.REFRESH_TOKEN_EXPIRATION,
          });

          const ua = userAgent.parse(request.headers['user-agent']);
          const ip = getClientIp(request);
          const ipLookup = geoip.lookup(ip);
          let country = null;
          let city = null;

          if (ipLookup) {
            ({ country, city } = ipLookup);
          }

          await RefreshToken.create({
            username,
            token: refreshToken,
            browser: ua.toAgent(),
            country,
            city,
            ip,
          });

          // Keeping only the latest 25 tokens
          let refreshTokens = await RefreshToken.find({ username }).sort({ created_at: -1 });

          if (refreshTokens.length > 25) {
            refreshTokens = refreshTokens.slice(25);

            await RefreshToken.deleteMany({ _id: { $in: refreshTokens.map((t) => t._id) } });
          }

          response = {
            ...user, admin, token,
          };

          return h.response(response).state('refresh_token', refreshToken);
        }
      } catch (e) {
        console.log(e.message);
      }

      return response;
    },
  },
  {
    method: 'GET',
    path: '/auth/me',
    handler: async (request) => {
      let response = {
        success: false,
      };

      const { refresh_token: refreshToken } = request.state;

      if (refreshToken) {
        try {
          const decoded = JWT.verify(refreshToken, config.JWT_SECRET);

          const { sub: username } = decoded;

          const isFound = await RefreshToken.findOne({
            username,
            token: refreshToken,
            revoked: false,
          }).lean();

          if (isFound) {
            const user = await User.findOne({ username }).select('-_id username whitelisted banned').lean();

            const admin = config.ADMINS.includes(username);

            const token = JWT.sign({
              sub: username,
              admin,
            }, config.JWT_SECRET, {
              expiresIn: config.ACCESS_TOKEN_EXPIRATION,
            });

            response = {
              success: true,
              username,
              admin,
              whitelisted: user.whitelisted,
              banned: user.banned,
              token,
            };
          }
        } catch {
          //
        }
      }

      return response;
    },
  },
  {
    method: 'GET',
    path: '/auth/logout',
    handler: async (request, h) => {
      h.unstate('refresh_token');

      return h.continue;
    },
  },
];
