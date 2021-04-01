const config = require('../../../common/config');
const manageUser = require('./manage-user');
const manageCollectible = require('./manage-collectible');
const featureCollectible = require('./feature-collectible');
const reportCollectible = require('./report-collectible');
const processReport = require('./process-report');
const manualIssue = require('./manual-issue');

const handlers = {
  [`${config.APP_PREFIX}_manage_user`]: manageUser,
  [`${config.APP_PREFIX}_manage_collectible`]: manageCollectible,
  [`${config.APP_PREFIX}_feature_collectible`]: featureCollectible,
  [`${config.APP_PREFIX}_report_collectible`]: reportCollectible,
  [`${config.APP_PREFIX}_process_report`]: processReport,
  [`${config.APP_PREFIX}_manual_issue`]: manualIssue,
};

const fallback = () => { };

const runner = (client, data) => {
  const handler = handlers[data.id] || fallback;

  return handler(client, data);
};

module.exports = (client, data) => runner(client, data);
