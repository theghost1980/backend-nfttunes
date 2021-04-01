const { Report } = require('../../../common/models');
const config = require('../../../common/config');
const logger = require('../../../common/logger');

module.exports = async (client, data) => {
  const username = (data.required_auths.length > 0) ? data.required_auths[0] : '';

  if (config.ADMINS.includes(username)) {
    try {
      const json = JSON.parse(data.json);

      const report = await Report.findOne({ report_id: json.report_id });

      if (report) {
        report.processed = true;
        report.processed_by = username;

        await report.save();
      }
    } catch (e) {
      logger.log(`Error: Processing report. User: ${username} TX: ${data.trx_id} Message: ${e.message}`);
    }
  }
};
