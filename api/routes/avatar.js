const Joi = require('joi');
const Boom = require('@hapi/boom');
const sharp = require('sharp');
const { createHash } = require('crypto');
const streamHead = require('stream-head').default;
const fs = require('fs');
const path = require('path');
const config = require('../../common/config');
const { User } = require('../../common/models');
const {
  blobStore, mimeMagic, storeWrite, storeExists,
} = require('../helpers');

const mineTypes = [
  'image/gif',
  'image/png',
  'image/jpeg',
  'image/svg',
  'image/svg+xml',
  'image/webp',
];

module.exports = [
  {
    method: 'GET',
    path: '/avatar/{username}',
    options: {
      validate: {
        params: Joi.object({
          username: Joi.string().min(3).max(16).required(),
        }),
      },
    },
    handler: async (request, h) => {
      const { username } = request.params;

      const user = await User.findOne({ username }).lean();

      let fileStream = '';
      let mimeType = 'image/png';

      let avatar = path.join(__dirname, '..', 'images/default-avatar.png');

      if (user && user.avatar) {
        avatar = user.avatar.replace(`${config.DO_BASE_URL}/`, '');

        if (await storeExists(avatar)) {
          const file = blobStore.createReadStream({ key: avatar });

          file.on('error', () => {
            file.destroy();

            return {};
          });

          const { head, stream } = await streamHead(file, { bytes: 16384 });
          mimeType = await mimeMagic(head);
          fileStream = stream;
        }
      } else {
        fileStream = fs.createReadStream(avatar);

        fileStream.on('error', () => {
          fileStream.destroy();

          return {};
        });
      }

      return h.response(fileStream)
        .type(mimeType)
        .header('Cache-Control', 'public,max-age=29030400,immutable');
    },
  },
  {
    method: 'POST',
    path: '/avatar/upload',
    options: {
      auth: 'jwt',
      payload: {
        output: 'stream',
        allow: 'multipart/form-data',
        multipart: true,
        parse: true,
        maxBytes: 1 * 1024 * 1024, // 1 MB
        timeout: false,
      },
      validate: {
        payload: Joi.object({
          image: Joi.any().required(),
        }),
      },
    },
    handler: async (request) => {
      const { image } = request.payload;
      const { sub } = request.auth.credentials;

      const resized = await sharp(image._data)
        .resize({ width: 256, height: 256, fit: 'contain' })
        .png()
        .toBuffer();

      const contentType = await mimeMagic(resized);

      if (!mineTypes.includes(contentType)) {
        return Boom.badRequest('Unsupported file type');
      }

      const hash = createHash('md5').update(sub).digest('hex');
      const key = `avatars/${hash}.png`;

      const url = new URL(key, config.DO_BASE_URL);

      const opts = {
        key,
        contentType,
        params: {
          ACL: 'public-read',
        },
      };

      await storeWrite(opts, resized);

      await User.updateOne({ username: sub }, { $set: { avatar: url } });

      return {
        url,
      };
    },
  },
];
