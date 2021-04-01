const adminRoutes = require('./admin');
const authRoutes = require('./auth');
const avatarRoutes = require('./avatar');
const collectiblesRoutes = require('./collectibles');
const marketRoutes = require('./market');
const searchRoutes = require('./search');
const settingsRoutes = require('./settings');
const statisticsRoutes = require('./statistics');
const transactionsRoutes = require('./transactions');
const uploadRoutes = require('./upload');
const userRoutes = require('./users');

module.exports = [
  [
    {
      method: 'GET',
      path: '/',
      handler: () => ({
        success: true,
      }),
    },
  ],
  ...adminRoutes,
  ...authRoutes,
  ...avatarRoutes,
  ...collectiblesRoutes,
  ...marketRoutes,
  ...searchRoutes,
  ...settingsRoutes,
  ...statisticsRoutes,
  ...transactionsRoutes,
  ...uploadRoutes,
  ...userRoutes,
];
