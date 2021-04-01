const Joi = require('joi');
const Boom = require('@hapi/boom');
const Hash = require('ipfs-only-hash');
const mimeTypes = require('mime-types');
const config = require('../../common/config');
const { mimeMagic, storeWrite, storeExists } = require('../helpers');

const supportedMimes = {
  thumbnail: ['image/gif', 'image/png', 'image/jpeg', 'video/mp4'],
  file: ['video/mp4', 'video/mpeg', 'audio/mpeg', 'audio/mp3', 'audio/wav', 'audio/wave', 'audio/x-wav', 'audio/x-pn-wav'],
};

module.exports = [
  {
    method: 'POST',
    path: '/upload',
    options: {
      auth: 'jwt',
      payload: {
        output: 'stream',
        allow: 'multipart/form-data',
        multipart: true,
        parse: true,
        maxBytes: 100 * 1024 * 1024, // 100 MB
        timeout: false,
      },
      validate: {
        payload: Joi.object({
          file: Joi.any().required(),
          type: Joi.string().lowercase().valid('thumbnail', 'file').required(),
        }),
      },
    },
    handler: async (request) => {
      const { file, type } = request.payload;

      const contentType = await mimeMagic(file._data);

      if (!supportedMimes[type].includes(contentType)) {
        return Boom.badRequest('Unsupported file type');
      }

      const cid = await Hash.of(file._data);

      const key = `${cid}.${mimeTypes.extension(contentType)}`;
      const url = new URL(key, config.DO_BASE_URL);

      if (!await storeExists(key)) {
        const opts = {
          key,
          contentType,
          params: {
            ACL: 'public-read',
          },
        };

        await storeWrite(opts, file._data);
      }

      return {
        url,
        cid,
      };
    },
  },
];
