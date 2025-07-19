// src/commands/commandParser.js
const config = require("../config/config");

class CommandParser {
  parse(messageText) {
    // Check if message starts with command prefix
    if (!messageText.startsWith(config.COMMAND_PREFIX)) {
      return null;
    }

    // Remove prefix and trim
    const commandText = messageText.slice(config.COMMAND_PREFIX.length).trim();
    if (!commandText) {
      return null;
    }

    // Split into command and args, handling quoted strings
    const args = this.parseArgs(commandText);
    const command = args.shift().toLowerCase();

    return {
      command,
      args,
      originalText: messageText,
    };
  }

  parseArgs(text) {
    const args = [];
    let currentArg = "";
    let inQuotes = false;
    let quoteChar = "";

    for (let i = 0; i < text.length; i++) {
      const char = text[i];
      const nextChar = text[i + 1];

      if ((char === '"' || char === "'") && !inQuotes) {
        // Start of quoted string
        inQuotes = true;
        quoteChar = char;
      } else if (char === quoteChar && inQuotes) {
        // End of quoted string
        inQuotes = false;
        quoteChar = "";
      } else if (char === " " && !inQuotes) {
        // Space outside quotes - end of argument
        if (currentArg.length > 0) {
          args.push(currentArg);
          currentArg = "";
        }
      } else {
        // Regular character
        currentArg += char;
      }
    }

    // Add final argument if any
    if (currentArg.length > 0) {
      args.push(currentArg);
    }

    return args;
  }
}

module.exports = CommandParser;
