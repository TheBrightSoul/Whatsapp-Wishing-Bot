// src/commands/implementations/helpCommand.js
const BaseCommand = require("../baseCommand");
const config = require("../../config/config");

class HelpCommand extends BaseCommand {
  async execute(message, args) {
    const senderId = message.key.remoteJid;
    const isOwner = this.isOwner(senderId);

    let helpText = `🤖 *Soul Bot Commands* 🤖

_General Commands:_
${config.COMMAND_PREFIX} help - Shows this help menu

📅 _Scheduled Wishes Commands:_
${config.COMMAND_PREFIX} addwish [date] [time] [jid] [message] - Schedule a new wish
${config.COMMAND_PREFIX} deletewish [id] - Delete a scheduled wish by ID
${config.COMMAND_PREFIX} archivewish [id] - Archive a scheduled wish by ID
${config.COMMAND_PREFIX} listwishes - List all active scheduled wishes

📣 _Group Wishes Commands:_
${config.COMMAND_PREFIX} addgroupwish [date] [time] [groupName] [message] - Schedule wish for entire group
${config.COMMAND_PREFIX} listgroupwishes - List all scheduled group wishes
${config.COMMAND_PREFIX} sendgroupwishnow [groupName] [message] - Send wish to all group members immediately

👥 _Group Management Commands:_
${config.COMMAND_PREFIX} creategroup [groupName] [description] - Create a new user group
${config.COMMAND_PREFIX} addtogroup [groupName] [jid] [name] - Add user to a group
${config.COMMAND_PREFIX} removefromgroup [groupName] [jid] - Remove user from a group
${config.COMMAND_PREFIX} listgroups - List all available groups
${config.COMMAND_PREFIX} listgroupmembers [groupName] - List members of a group`;

    if (isOwner) {
      helpText += `

🔧 _Owner Commands:_
${config.COMMAND_PREFIX} status - Show current bot status
${config.COMMAND_PREFIX} start - Activates the bot
${config.COMMAND_PREFIX} stop - Deactivates the bot
${config.COMMAND_PREFIX} whitelist [jid] [name] - Add user to whitelist
${config.COMMAND_PREFIX} removewhitelist [jid] - Remove user from whitelist
${config.COMMAND_PREFIX} listwhitelist - List all whitelisted users
${config.COMMAND_PREFIX} backup - Create data backup
${config.COMMAND_PREFIX} restore [filename] - Restore from backup
${config.COMMAND_PREFIX} clearlogs - Clear activity logs
${config.COMMAND_PREFIX} archiveoldwishes - Archive wishes with past dates`;
    }

    helpText += `

_Examples:_
${config.COMMAND_PREFIX} addwish 25/12/2025 09:00 1234567890@s.whatsapp.net "Merry Christmas! 🎄"
${config.COMMAND_PREFIX} addgroupwish 01/01/2026 00:00 family "Happy New Year everyone! 🎉"
${config.COMMAND_PREFIX} creategroup family "Close family members"

_Date Format:_ DD/MM/YYYY (e.g., 25/12/2025 for December 25th, 2025)
_Time Format:_ HH:MM (e.g., 09:00 for 9:00 AM)
_JID Format:_ Full WhatsApp JID (e.g., 1234567890@s.whatsapp.net)`;

    await this.sendLongMessage(senderId, helpText);
  }
}

module.exports = HelpCommand;
