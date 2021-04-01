const mongoose = require('mongoose');
const config = require('./config');

mongoose.Promise = global.Promise;

mongoose.connect(config.MONGODB, {
  useCreateIndex: true,
  useFindAndModify: false,
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

// mongoose.set('debug', true);

const DB = mongoose.connection;

DB.on('error', (e) => {
  console.log(e.message);
});

DB.once('open', () => {
  console.log('Database has been connected');
});

module.exports = DB;
