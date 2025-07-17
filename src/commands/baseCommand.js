// src/commands/baseCommand.js
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

  isOwner(senderId) {
    return senderId === require("../config/config").OWNER_NUMBER;
  }

  isWhitelisted(senderId) {
    return this.dataService.whitelist.includes(senderId);
  }
}

module.exports = BaseCommand;
