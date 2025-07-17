// src/commands/commandParser.js
const config = require("../config/config");

class CommandParser {
  static parseCommand(messageText) {
    if (!messageText.startsWith(config.COMMAND_PREFIX)) {
      return null;
    }

    const commandText = messageText
      .substring(config.COMMAND_PREFIX.length)
      .trim();
    const args = [];
    let currentArg = "";
    let inQuotes = false;
    let quoteChar = "";

    for (let i = 0; i < commandText.length; i++) {
      const char = commandText[i];

      if ((char === '"' || char === "'") && !inQuotes) {
        inQuotes = true;
        quoteChar = char;
      } else if (char === quoteChar && inQuotes) {
        inQuotes = false;
        quoteChar = "";
      } else if (char === " " && !inQuotes) {
        if (currentArg.trim()) {
          args.push(currentArg.trim());
          currentArg = "";
        }
      } else {
        currentArg += char;
      }
    }

    if (currentArg.trim()) {
      args.push(currentArg.trim());
    }

    return {
      command: args[0]?.toLowerCase(),
      args: args.slice(1),
      raw: commandText,
    };
  }
}

module.exports = CommandParser;
