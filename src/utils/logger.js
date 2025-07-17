// src/utils/logger.js
const P = require("pino");
const config = require("../config/config");

const logger = P(
  { timestamp: () => `,"time":"${new Date().toJSON()}"` },
  P.destination(config.LOG_FILE_PATH)
);
logger.level = "trace";

module.exports = logger;
