const Joi = require('joi');
const { Collectible } = require('../../common/models');

module.exports = [
  {
    method: 'POST',
    path: '/search',
    options: {
      validate: {
        payload: Joi.object({
          q: Joi.string().required(),
        }),
      },
    },
    handler: async (request) => {
      const { q } = request.payload;
      let results = [];

      try {
        results = await Collectible.find({ published: true, $text: { $search: q } }, { relevance: { $meta: 'textScore' } })
          .sort({ relevance: { $meta: 'textScore' } })
          .limit(1000)
          .select('-_id -created_at -updated_at')
          .lean();
      } catch (e) {
        //
      }

      return results;
    },
  },
];
