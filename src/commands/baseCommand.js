// src/commands/baseCommand.js
const config = require("../config/config");

class BaseCommand {
  constructor(dataService, messageService) {
    this.dataService = dataService;
    this.messageService = messageService;
  }

  async execute(message, args) {
    throw new Error("Execute method must be implemented by subclass");
  }

  async sendMessage(jid, text) {
    return await this.messageService.sendMessage(jid, text);
  }

  isOwner(jid) {
    return jid === config.OWNER_NUMBER;
  }

  isWhitelisted(jid) {
    return this.isOwner(jid) || this.dataService.whitelist.includes(jid);
  }

  // Utility method for splitting long messages
  splitMessage(text, maxLength = 4000) {
    const chunks = [];
    let currentChunk = "";
    const lines = text.split("\n");

    for (const line of lines) {
      if (currentChunk.length + line.length + 1 > maxLength) {
        if (currentChunk) {
          chunks.push(currentChunk);
          currentChunk = "";
        }
      }
      currentChunk += (currentChunk ? "\n" : "") + line;
    }

    if (currentChunk) {
      chunks.push(currentChunk);
    }

    return chunks;
  }

  // Utility method for sending long messages in chunks
  async sendLongMessage(jid, text, maxLength = 4000, delay = 1000) {
    if (text.length <= maxLength) {
      return await this.sendMessage(jid, text);
    }

    const chunks = this.splitMessage(text, maxLength);
    for (let i = 0; i < chunks.length; i++) {
      await this.sendMessage(jid, chunks[i]);
      if (i < chunks.length - 1) {
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }
  }
}

module.exports = BaseCommand;
