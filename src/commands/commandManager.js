// src/commands/commandManager.js
const CommandParser = require("./commandParser");
const HelpCommand = require("./implementations/helpCommand");
const StatusCommand = require("./implementations/statusCommand");

// Import admin commands
const {
  StartCommand,
  StopCommand,
  WhitelistCommand,
  RemoveWhitelistCommand,
  ListWhitelistCommand,
  BackupCommand,
  RestoreCommand,
  ClearLogsCommand,
  ArchiveOldWishesCommand,
} = require("./implementations/adminCommands");

// Import group commands
const {
  CreateGroupCommand,
  AddToGroupCommand,
  RemoveFromGroupCommand,
  ListGroupsCommand,
  ListGroupMembersCommand,
  AddGroupWishCommand,
  ListGroupWishesCommand,
  SendGroupWishNowCommand,
} = require("./implementations/groupCommands");

// Import wish commands
const {
  AddWishCommand,
  DeleteWishCommand,
  ArchiveWishCommand,
  ListWishesCommand,
} = require("./implementations/wishCommands");

class CommandManager {
  constructor(dataService, messageService) {
    this.dataService = dataService;
    this.messageService = messageService;
    this.commands = new Map();
    this.registerCommands();
  }

  registerCommands() {
    // Basic commands
    this.commands.set(
      "help",
      new HelpCommand(this.dataService, this.messageService)
    );
    this.commands.set(
      "status",
      new StatusCommand(this.dataService, this.messageService)
    );

    // Admin commands
    this.commands.set(
      "start",
      new StartCommand(this.dataService, this.messageService)
    );
    this.commands.set(
      "stop",
      new StopCommand(this.dataService, this.messageService)
    );
    this.commands.set(
      "whitelist",
      new WhitelistCommand(this.dataService, this.messageService)
    );
    this.commands.set(
      "removewhitelist",
      new RemoveWhitelistCommand(this.dataService, this.messageService)
    );
    this.commands.set(
      "listwhitelist",
      new ListWhitelistCommand(this.dataService, this.messageService)
    );
    this.commands.set(
      "backup",
      new BackupCommand(this.dataService, this.messageService)
    );
    this.commands.set(
      "restore",
      new RestoreCommand(this.dataService, this.messageService)
    );
    this.commands.set(
      "clearlogs",
      new ClearLogsCommand(this.dataService, this.messageService)
    );
    this.commands.set(
      "archiveoldwishes",
      new ArchiveOldWishesCommand(this.dataService, this.messageService)
    );

    // Group commands
    this.commands.set(
      "creategroup",
      new CreateGroupCommand(this.dataService, this.messageService)
    );
    this.commands.set(
      "addtogroup",
      new AddToGroupCommand(this.dataService, this.messageService)
    );
    this.commands.set(
      "removefromgroup",
      new RemoveFromGroupCommand(this.dataService, this.messageService)
    );
    this.commands.set(
      "listgroups",
      new ListGroupsCommand(this.dataService, this.messageService)
    );
    this.commands.set(
      "listgroupmembers",
      new ListGroupMembersCommand(this.dataService, this.messageService)
    );
    this.commands.set(
      "addgroupwish",
      new AddGroupWishCommand(this.dataService, this.messageService)
    );
    this.commands.set(
      "listgroupwishes",
      new ListGroupWishesCommand(this.dataService, this.messageService)
    );
    this.commands.set(
      "sendgroupwishnow",
      new SendGroupWishNowCommand(this.dataService, this.messageService)
    );

    // Wish commands
    this.commands.set(
      "addwish",
      new AddWishCommand(this.dataService, this.messageService)
    );
    this.commands.set(
      "deletewish",
      new DeleteWishCommand(this.dataService, this.messageService)
    );
    this.commands.set(
      "archivewish",
      new ArchiveWishCommand(this.dataService, this.messageService)
    );
    this.commands.set(
      "listwishes",
      new ListWishesCommand(this.dataService, this.messageService)
    );
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

    // Check if bot is active (except for owner commands)
    if (!this.dataService.botConfig.active && !this.isOwner(senderId)) {
      // Allow start command even when bot is inactive
      if (command !== "start") {
        return;
      }
    }

    // Check if user is whitelisted (except for owner)
    if (
      !this.dataService.whitelist.includes(senderId) &&
      !this.isOwner(senderId)
    ) {
      if (require("../config/config").DEBUG_MODE) {
        console.log("Message from non-whitelisted user:", senderId);
      }
      return;
    }

    const commandHandler = this.commands.get(command);

    if (commandHandler) {
      try {
        await commandHandler.execute(message, args);

        // Log activity for successful command execution
        this.dataService.logActivity({
          type: "command_executed",
          command: command,
          user: senderId,
          args: args,
          timestamp: new Date().toISOString(),
        });
      } catch (error) {
        console.error(`Error executing command "${command}":`, error);

        // Log error activity
        this.dataService.logActivity({
          type: "command_error",
          command: command,
          user: senderId,
          error: error.message,
          timestamp: new Date().toISOString(),
        });

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
        }help for available commands.`
      );
    }
  }

  isOwner(senderId) {
    return senderId === require("../config/config").OWNER_NUMBER;
  }

  // Helper method to get all registered commands
  getRegisteredCommands() {
    return Array.from(this.commands.keys());
  }

  // Helper method to get command categories
  getCommandCategories() {
    return {
      basic: ["help", "status"],
      admin: [
        "start",
        "stop",
        "whitelist",
        "removewhitelist",
        "listwhitelist",
        "backup",
        "restore",
        "clearlogs",
        "archiveoldwishes",
      ],
      group: [
        "creategroup",
        "addtogroup",
        "removefromgroup",
        "listgroups",
        "listgroupmembers",
        "addgroupwish",
        "listgroupwishes",
        "sendgroupwishnow",
      ],
      wish: ["addwish", "deletewish", "archivewish", "listwishes"],
    };
  }
}

module.exports = CommandManager;
