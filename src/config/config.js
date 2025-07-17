// src/config/config.js
require("dotenv").config();
const path = require("path");

module.exports = {
  // Bot configuration
  OWNER_NUMBER: process.env.OWNER_NUMBER,
  COMMAND_PREFIX: process.env.COMMAND_PREFIX || "Soul,",
  DEBUG_MODE: process.env.DEBUG_MODE === "true",

  // File paths
  WISHES_FILE: path.join(__dirname, "../data/wishes.json"),
  GROUP_WISHES_FILE: path.join(__dirname, "../data/group_wishes.json"),
  USER_GROUPS_FILE: path.join(__dirname, "../data/user_groups.json"),
  WHITELIST_FILE: path.join(__dirname, "../data/whitelist.json"),
  BOT_CONFIG_FILE: path.join(__dirname, "../data/bot_config.json"),
  LOG_FILE: path.join(__dirname, "../data/bot_log.json"),

  // Auth configuration
  AUTH_STATE_DIR: process.env.AUTH_STATE_DIR || "./auth_info_baileys",
  LOG_FILE_PATH: process.env.LOG_FILE || "./wa-logs.txt",

  // Browser configuration
  BROWSER_NAME: process.env.BAILEYS_BROWSER_NAME || "Soul Bot",
  BROWSER_VERSION: process.env.BAILEYS_BROWSER_VERSION || "1.0.0",
};
