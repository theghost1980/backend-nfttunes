const { Collectible } = require('../../../common/models');
const config = require('../../../common/config');
const logger = require('../../../common/logger');

module.exports = async (client, data) => {
  const username = (data.required_auths.length > 0) ? data.required_auths[0] : '';

  if (config.ADMINS.includes(username)) {
    try {
      const json = JSON.parse(data.json);

      const collectible = await Collectible.findOne({ series: json.series, published: true });

      if (collectible) {
        if (typeof json.featured === 'boolean') collectible.featured = json.featured;

        await collectible.save();
      }
    } catch (e) {
      logger.error(`Error: Featuring collectible. User: ${username} TX: ${data.trx_id} Message: ${e.message}`);
    }
  }
};
