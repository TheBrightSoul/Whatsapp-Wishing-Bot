// src/utils/logger.js
const P = require("pino");
const config = require("../config/config");

let logger;

switch (config.LOGGING_MODE) {
  case "disabled":
    // Create a silent Pino logger that has all methods but outputs nothing
    logger = P({
      level: "silent", // This disables all output
      timestamp: () => `,"time":"${new Date().toJSON()}"`,
    });
    break;

  case "console":
    // Log to console only
    logger = P({
      timestamp: () => `,"time":"${new Date().toJSON()}"`,
      transport: {
        target: "pino-pretty",
        options: {
          colorize: true,
        },
      },
    });
    logger.level = "trace";
    break;

  case "file":
  default:
    // Log to file
    logger = P(
      { timestamp: () => `,"time":"${new Date().toJSON()}"` },
      P.destination(config.LOG_FILE_PATH)
    );
    logger.level = "trace";
    break;
}

module.exports = logger;
