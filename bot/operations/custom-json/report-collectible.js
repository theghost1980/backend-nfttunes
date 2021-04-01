const { Collectible, Report } = require('../../../common/models');
const logger = require('../../../common/logger');

module.exports = async (client, data) => {
  const username = (data.required_auths.length > 0)
    ? data.required_auths[0] : data.required_posting_auths[0];

  try {
    const json = JSON.parse(data.json);

    const collectible = await Collectible.findOne({ series: json.series }).lean();

    if (collectible && ['nsfw', 'plagiarism', 'copyright'].includes(json.reason)) {
      const report = await Report.findOne({
        username,
        series: collectible.series,
        type: json.reason,
      });

      if (!report) {
        await Report.create({
          report_id: data.trx_id,
          username,
          series: collectible.series,
          type: json.reason,
          message: json.message,
        });
      }
    }
  } catch (e) {
    logger.error(`Error: Reporting photo. User: ${username} TX: ${data.trx_id} Message: ${e.message}`);
  }
};
