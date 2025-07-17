// src/commands/implementations/statusCommand.js
const BaseCommand = require("../baseCommand");
const config = require("../../config/config");

class StatusCommand extends BaseCommand {
  async execute(message, args) {
    const senderId = message.key.remoteJid;

    if (!this.isOwner(senderId)) {
      await this.sendMessage(
        senderId,
        "❌ This command is only available to the bot owner."
      );
      return;
    }

    const activeWishes = this.dataService.wishes.filter(
      (w) => !w.archived
    ).length;
    const archivedWishes = this.dataService.wishes.filter(
      (w) => w.archived
    ).length;
    const groupWishes = this.dataService.groupWishes.length;
    const userGroups = Object.keys(this.dataService.userGroups).length;
    const whitelistedUsers = this.dataService.whitelist.length;

    const statusText = `🤖 *Soul Bot Status*

_Bot Status:_ ${this.dataService.botConfig.active ? "🟢 Active" : "🔴 Inactive"}
_Last Activity:_ ${new Date(
      this.dataService.botConfig.lastActivity
    ).toLocaleString()}

_Statistics:_
📅 Active Wishes: ${activeWishes}
📂 Archived Wishes: ${archivedWishes}
👥 Group Wishes: ${groupWishes}
🏷️ User Groups: ${userGroups}
✅ Whitelisted Users: ${whitelistedUsers}

_Owner:_ ${config.OWNER * NUMBER}
\_Command Prefix:* ${config.COMMAND_PREFIX}`;

    await this.sendMessage(senderId, statusText);
  }
}

module.exports = StatusCommand;
