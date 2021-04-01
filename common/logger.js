const { createLogger, format, transports } = require('winston');
const fs = require('fs');

const logDir = 'logs';
const env = process.env.NODE_ENV || 'development';

if (!fs.existsSync(logDir)) {
  fs.mkdirSync(logDir);
}

const logFormater = format.printf(({
  level, message, timestamp, ...metadata
}) => {
  let msg = `${level}: ${[timestamp]}: ${message} `;

  if (Object.keys(metadata).length > 0) {
    msg += JSON.stringify(metadata);
  }

  return msg;
});

const logger = createLogger({
  format: format.combine(
    format.timestamp({
      format: 'MMM-DD-YYYY HH:mm:ss',
    }),
    logFormater,
  ),

  transports: [
    new transports.Console({
      level: 'info',
      format: format.combine(
        format.colorize(),
        logFormater,
      ),
    }),

    new transports.File({
      level: env === 'development' ? 'debug' : 'info',
      filename: `${logDir}/logs.log`,
      maxsize: 1024 * 1024 * 10, // 10MB
    }),
  ],

  exceptionHandlers: [
    new transports.File({
      filename: `${logDir}/exceptions.log`,
    }),
  ],
});

module.exports = logger;
