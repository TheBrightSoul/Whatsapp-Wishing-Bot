// src/commands/commandManager.js
const CommandParser = require("./commandParser");
const HelpCommand = require("./implementations/helpCommand");
const StatusCommand = require("./implementations/statusCommand");
// Import other command implementations here...

class CommandManager {
  constructor(dataService, messageService) {
    this.dataService = dataService;
    this.messageService = messageService;
    this.commands = new Map();
    this.registerCommands();
  }

  registerCommands() {
    this.commands.set(
      "help",
      new HelpCommand(this.dataService, this.messageService)
    );
    this.commands.set(
      "status",
      new StatusCommand(this.dataService, this.messageService)
    );
    // Register other commands here...
  }

  async processMessage(message) {
    const messageText =
      message.message.conversation ||
      message.message.extendedTextMessage?.text ||
      "";

    const parsedCommand = CommandParser.parseCommand(messageText);
    if (!parsedCommand) {
      return;
    }

    const senderId = message.key.remoteJid;
    const { command, args } = parsedCommand;

    // Check if bot is active
    if (!this.dataService.botConfig.active && !this.isOwner(senderId)) {
      return;
    }

    // Check if user is whitelisted
    if (!this.dataService.whitelist.includes(senderId)) {
      if (require("../config/config").DEBUG_MODE) {
        console.log("Message from non-whitelisted user:", senderId);
      }
      return;
    }

    const commandHandler = this.commands.get(command);
    if (commandHandler) {
      try {
        await commandHandler.execute(message, args);
        this.dataService.logActivity({
          type: "command_executed",
          command: command,
          user: senderId,
          args: args,
        });
      } catch (error) {
        console.error("Error executing command:", error);
        await this.messageService.sendMessage(
          senderId,
          "❌ Error processing command. Please try again."
        );
      }
    } else {
      await this.messageService.sendMessage(
        senderId,
        `❌ Unknown command: ${command}\nUse ${
          require("../config/config").COMMAND_PREFIX
        } help for available commands.`
      );
    }
  }

  isOwner(senderId) {
    return senderId === require("../config/config").OWNER_NUMBER;
  }
}

module.exports = CommandManager;
