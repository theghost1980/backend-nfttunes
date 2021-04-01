const { User, Collectible } = require('../../../common/models');
const config = require('../../../common/config');
const logger = require('../../../common/logger');

module.exports = async (client, data) => {
  const username = (data.required_auths.length > 0) ? data.required_auths[0] : '';

  if (config.ADMINS.includes(username)) {
    try {
      const json = JSON.parse(data.json);

      const user = await User.findOne({ username: json.username });

      if (user) {
        const reason = (typeof json.ban === 'boolean' && json.ban === false) ? '' : json.ban_reason;

        if (typeof json.whitelist === 'boolean') user.whitelisted = json.whitelist;
        if (typeof json.ban === 'boolean') user.banned = json.ban;

        user.ban_reason = reason;
        user.whitelist_applied = false;

        await user.save();
      }

      if (typeof json.ban === 'boolean') {
        await Collectible.updateMany(
          { creator: user.username }, { $set: { published: !json.ban } },
        );
      }
    } catch (e) {
      logger.error(`Error: Managing user. User: ${username} TX: ${data.trx_id} Message: ${e.message}`);
    }
  }
};
