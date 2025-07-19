Hey i am providing you my main files of the bot and structure too, Please help me organize all the commands properly some files are create by another person on github and some commands were made by other and some by me, so please help me fix all of this mess

Only provide the files which need to be changed, everything else is already set I think Nothing else need to be changed here. just a few conflicts and add ons commands

// src/commands/implementations/adminCommands.js
const BaseCommand = require("../baseCommand");
const { formatJID } = require("../../utils/validators");

class StartCommand extends BaseCommand {
async execute(message, args) {
const senderId = message.key.remoteJid;

    if (!this.isOwner(senderId)) {
      await this.sendMessage(
        senderId,
        "❌ This command is only available to the bot owner."
      );
      return;
    }

    if (this.dataService.botConfig.active) {
      await this.sendMessage(senderId, "✅ Bot is already active.");
      return;
    }

    this.dataService.botConfig.active = true;
    this.dataService.botConfig.lastActivity = new Date().toISOString();
    this.dataService.botConfig.activated_by = senderId;
    this.dataService.botConfig.activated_at = new Date().toISOString();

    if (this.dataService.saveBotConfig()) {
      await this.sendMessage(
        senderId,
        "🟢 Bot activated successfully!\n\nThe bot will now process commands and send scheduled wishes."
      );

      this.dataService.logActivity({
        type: "bot_activated",
        activated_by: senderId,
      });
    } else {
      await this.sendMessage(
        senderId,
        "❌ Failed to activate bot. Please try again."
      );
    }

}
}

class StopCommand extends BaseCommand {
async execute(message, args) {
const senderId = message.key.remoteJid;

    if (!this.isOwner(senderId)) {
      await this.sendMessage(
        senderId,
        "❌ This command is only available to the bot owner."
      );
      return;
    }

    if (!this.dataService.botConfig.active) {
      await this.sendMessage(senderId, "🔴 Bot is already inactive.");
      return;
    }

    this.dataService.botConfig.active = false;
    this.dataService.botConfig.lastActivity = new Date().toISOString();
    this.dataService.botConfig.deactivated_by = senderId;
    this.dataService.botConfig.deactivated_at = new Date().toISOString();

    if (this.dataService.saveBotConfig()) {
      await this.sendMessage(
        senderId,
        "🔴 Bot deactivated successfully!\n\nThe bot will no longer process commands from non-owner users or send scheduled wishes."
      );

      this.dataService.logActivity({
        type: "bot_deactivated",
        deactivated_by: senderId,
      });
    } else {
      await this.sendMessage(
        senderId,
        "❌ Failed to deactivate bot. Please try again."
      );
    }

}
}

class WhitelistCommand extends BaseCommand {
async execute(message, args) {
const senderId = message.key.remoteJid;

    if (!this.isOwner(senderId)) {
      await this.sendMessage(
        senderId,
        "❌ This command is only available to the bot owner."
      );
      return;
    }

    if (args.length < 2) {
      await this.sendMessage(
        senderId,
        "❌ Usage: whitelist [jid] [name]\n\nExample: whitelist 1234567890@s.whatsapp.net John"
      );
      return;
    }

    const jid = formatJID(args[0]);
    const name = args.slice(1).join(" ");

    if (this.dataService.whitelist.includes(jid)) {
      await this.sendMessage(
        senderId,
        `✅ User ${name} (${jid}) is already whitelisted.`
      );
      return;
    }

    this.dataService.whitelist.push(jid);

    if (this.dataService.saveWhitelist()) {
      await this.sendMessage(
        senderId,
        `✅ User ${name} (${jid}) has been added to the whitelist.`
      );

      this.dataService.logActivity({
        type: "user_whitelisted",
        jid: jid,
        name: name,
        added_by: senderId,
      });
    } else {
      await this.sendMessage(
        senderId,
        "❌ Failed to add user to whitelist. Please try again."
      );
    }

}
}

class RemoveWhitelistCommand extends BaseCommand {
async execute(message, args) {
const senderId = message.key.remoteJid;

    if (!this.isOwner(senderId)) {
      await this.sendMessage(
        senderId,
        "❌ This command is only available to the bot owner."
      );
      return;
    }

    if (args.length < 1) {
      await this.sendMessage(
        senderId,
        "❌ Usage: removewhitelist [jid]\n\nExample: removewhitelist 1234567890@s.whatsapp.net"
      );
      return;
    }

    const jid = formatJID(args[0]);

    if (jid === require("../../config/config").OWNER_NUMBER) {
      await this.sendMessage(
        senderId,
        "❌ Cannot remove the bot owner from the whitelist."
      );
      return;
    }

    const index = this.dataService.whitelist.indexOf(jid);
    if (index === -1) {
      await this.sendMessage(
        senderId,
        `❌ User ${jid} is not in the whitelist.`
      );
      return;
    }

    this.dataService.whitelist.splice(index, 1);

    if (this.dataService.saveWhitelist()) {
      await this.sendMessage(
        senderId,
        `✅ User ${jid} has been removed from the whitelist.`
      );

      this.dataService.logActivity({
        type: "user_removed_from_whitelist",
        jid: jid,
        removed_by: senderId,
      });
    } else {
      await this.sendMessage(
        senderId,
        "❌ Failed to remove user from whitelist. Please try again."
      );
    }

}
}

class ListWhitelistCommand extends BaseCommand {
async execute(message, args) {
const senderId = message.key.remoteJid;

    if (!this.isOwner(senderId)) {
      await this.sendMessage(
        senderId,
        "❌ This command is only available to the bot owner."
      );
      return;
    }

    if (this.dataService.whitelist.length === 0) {
      await this.sendMessage(senderId, "📝 Whitelist is empty.");
      return;
    }

    let whitelistText = "📝 *Whitelisted Users:*\n\n";

    this.dataService.whitelist.forEach((jid, index) => {
      const isOwner = jid === require("../../config/config").OWNER_NUMBER;
      whitelistText += `${index + 1}. ${jid}${isOwner ? " (Owner)" : ""}\n`;
    });

    whitelistText += `\n*Total:* ${this.dataService.whitelist.length} users`;

    await this.sendMessage(senderId, whitelistText);

}
}

class BackupCommand extends BaseCommand {
async execute(message, args) {
const senderId = message.key.remoteJid;

    if (!this.isOwner(senderId)) {
      await this.sendMessage(
        senderId,
        "❌ This command is only available to the bot owner."
      );
      return;
    }

    await this.sendMessage(senderId, "🔄 Creating backup...");

    const backupFileName = await this.dataService.backupData();

    if (backupFileName) {
      await this.sendMessage(
        senderId,
        `✅ Backup created successfully!\n\nBackup file: ${backupFileName}\n\nThis backup contains all wishes, groups, and configuration data.`
      );

      this.dataService.logActivity({
        type: "backup_created",
        backup_file: backupFileName,
        created_by: senderId,
      });
    } else {
      await this.sendMessage(
        senderId,
        "❌ Failed to create backup. Please try again."
      );
    }

}
}

class RestoreCommand extends BaseCommand {
async execute(message, args) {
const senderId = message.key.remoteJid;

    if (!this.isOwner(senderId)) {
      await this.sendMessage(
        senderId,
        "❌ This command is only available to the bot owner."
      );
      return;
    }

    if (args.length < 1) {
      await this.sendMessage(
        senderId,
        "❌ Usage: restore [backup_filename]\n\nExample: restore backup_1234567890.json"
      );
      return;
    }

    const backupFileName = args[0];

    await this.sendMessage(
      senderId,
      `🔄 Restoring data from backup: ${backupFileName}...`
    );

    const success = await this.dataService.restoreData(backupFileName);

    if (success) {
      await this.sendMessage(
        senderId,
        `✅ Data restored successfully from backup: ${backupFileName}\n\nAll wishes, groups, and configuration have been restored.`
      );

      this.dataService.logActivity({
        type: "data_restored",
        backup_file: backupFileName,
        restored_by: senderId,
      });
    } else {
      await this.sendMessage(
        senderId,
        `❌ Failed to restore data from backup: ${backupFileName}\n\nPlease check if the backup file exists and is valid.`
      );
    }

}
}

class ClearLogsCommand extends BaseCommand {
async execute(message, args) {
const senderId = message.key.remoteJid;

    if (!this.isOwner(senderId)) {
      await this.sendMessage(
        senderId,
        "❌ This command is only available to the bot owner."
      );
      return;
    }

    const config = require("../../config/config");
    const FileManager = require("../../utils/fileManager");

    const currentLogCount = FileManager.loadJSON(config.LOG_FILE, []).length;

    if (FileManager.saveJSON(config.LOG_FILE, [])) {
      await this.sendMessage(
        senderId,
        `✅ Activity logs cleared successfully!\n\nCleared ${currentLogCount} log entries.`
      );

      this.dataService.logActivity({
        type: "logs_cleared",
        cleared_count: currentLogCount,
        cleared_by: senderId,
      });
    } else {
      await this.sendMessage(
        senderId,
        "❌ Failed to clear logs. Please try again."
      );
    }

}
}

class ArchiveOldWishesCommand extends BaseCommand {
async execute(message, args) {
const senderId = message.key.remoteJid;

    if (!this.isOwner(senderId)) {
      await this.sendMessage(
        senderId,
        "❌ This command is only available to the bot owner."
      );
      return;
    }

    const { getCurrentDateTime } = require("../../utils/validators");
    const { date: currentDate } = getCurrentDateTime();

    let archivedCount = 0;
    const currentDateObj = new Date();

    for (const wish of this.dataService.wishes) {
      if (!wish.archived) {
        // Parse wish date (DD/MM format)
        const [day, month] = wish.date.split("/").map(Number);
        const wishDate = new Date(currentDateObj.getFullYear(), month - 1, day);

        // If wish date is in the past, archive it
        if (wishDate < currentDateObj) {
          wish.archived = true;
          wish.archived_at = new Date().toISOString();
          wish.archived_reason = "auto_archived_past_date";
          archivedCount++;
        }
      }
    }

    if (archivedCount > 0) {
      if (this.dataService.saveWishes()) {
        await this.sendMessage(
          senderId,
          `✅ Archived ${archivedCount} old wishes that have passed their scheduled date.`
        );

        this.dataService.logActivity({
          type: "old_wishes_archived",
          archived_count: archivedCount,
          archived_by: senderId,
        });
      } else {
        await this.sendMessage(
          senderId,
          "❌ Failed to archive old wishes. Please try again."
        );
      }
    } else {
      await this.sendMessage(senderId, "✅ No old wishes found to archive.");
    }

}
}

module.exports = {
StartCommand,
StopCommand,
WhitelistCommand,
RemoveWhitelistCommand,
ListWhitelistCommand,
BackupCommand,
RestoreCommand,
ClearLogsCommand,
ArchiveOldWishesCommand,
};
// src/commands/implementations/groupCommands.js
const BaseCommand = require("../baseCommand");
const {
validateDateFormat,
validateTimeFormat,
formatJID,
} = require("../../utils/validators");

class CreateGroupCommand extends BaseCommand {
async execute(message, args) {
const senderId = message.key.remoteJid;

    if (!this.isWhitelisted(senderId)) {
      await this.sendMessage(
        senderId,
        "❌ You are not authorized to use this command."
      );
      return;
    }

    if (args.length < 2) {
      await this.sendMessage(
        senderId,
        '❌ Usage: creategroup [groupName] [description]\nExample: creategroup family "Close family members"'
      );
      return;
    }

    const groupName = args[0];
    const description = args.slice(1).join(" ");

    // Check if group already exists
    if (this.dataService.userGroups[groupName]) {
      await this.sendMessage(
        senderId,
        `❌ Group "${groupName}" already exists.`
      );
      return;
    }

    // Create new group
    this.dataService.userGroups[groupName] = {
      name: groupName,
      description: description,
      created_by: senderId,
      created_at: new Date().toISOString(),
      members: [],
    };

    // Save to file
    if (this.dataService.saveUserGroups()) {
      await this.sendMessage(
        senderId,
        `✅ Group created successfully!\n\n🏷️ *Name:* ${groupName}\n📝 *Description:* ${description}\n👤 *Created by:* ${senderId}\n👥 *Members:* 0`
      );

      this.dataService.logActivity({
        type: "group_created",
        group_name: groupName,
        created_by: senderId,
      });
    } else {
      await this.sendMessage(
        senderId,
        "❌ Failed to create group. Please try again."
      );
    }

}
}

class AddToGroupCommand extends BaseCommand {
async execute(message, args) {
const senderId = message.key.remoteJid;

    if (!this.isWhitelisted(senderId)) {
      await this.sendMessage(
        senderId,
        "❌ You are not authorized to use this command."
      );
      return;
    }

    if (args.length < 3) {
      await this.sendMessage(
        senderId,
        '❌ Usage: addtogroup [groupName] [jid] [name]\nExample: addtogroup family 1234567890@s.whatsapp.net "John Doe"'
      );
      return;
    }

    const groupName = args[0];
    const jid = formatJID(args[1]);
    const memberName = args.slice(2).join(" ");

    // Check if group exists
    if (!this.dataService.userGroups[groupName]) {
      await this.sendMessage(
        senderId,
        `❌ Group "${groupName}" does not exist.`
      );
      return;
    }

    const group = this.dataService.userGroups[groupName];

    // Check if user is already in group
    const existingMember = group.members.find((m) => m.jid === jid);
    if (existingMember) {
      await this.sendMessage(
        senderId,
        `❌ User ${jid} is already a member of "${groupName}".`
      );
      return;
    }

    // Add member to group
    group.members.push({
      jid: jid,
      name: memberName,
      added_by: senderId,
      added_at: new Date().toISOString(),
    });

    // Save to file
    if (this.dataService.saveUserGroups()) {
      await this.sendMessage(
        senderId,
        `✅ Member added successfully!\n\n👥 *Group:* ${groupName}\n👤 *Member:* ${memberName} (${jid})\n📊 *Total members:* ${group.members.length}`
      );

      this.dataService.logActivity({
        type: "member_added_to_group",
        group_name: groupName,
        member_jid: jid,
        member_name: memberName,
        added_by: senderId,
      });
    } else {
      await this.sendMessage(
        senderId,
        "❌ Failed to add member. Please try again."
      );
    }

}
}

class RemoveFromGroupCommand extends BaseCommand {
async execute(message, args) {
const senderId = message.key.remoteJid;

    if (!this.isWhitelisted(senderId)) {
      await this.sendMessage(
        senderId,
        "❌ You are not authorized to use this command."
      );
      return;
    }

    if (args.length < 2) {
      await this.sendMessage(
        senderId,
        "❌ Usage: removefromgroup [groupName] [jid]\nExample: removefromgroup family 1234567890@s.whatsapp.net"
      );
      return;
    }

    const groupName = args[0];
    const jid = formatJID(args[1]);

    // Check if group exists
    if (!this.dataService.userGroups[groupName]) {
      await this.sendMessage(
        senderId,
        `❌ Group "${groupName}" does not exist.`
      );
      return;
    }

    const group = this.dataService.userGroups[groupName];

    // Find member index
    const memberIndex = group.members.findIndex((m) => m.jid === jid);
    if (memberIndex === -1) {
      await this.sendMessage(
        senderId,
        `❌ User ${jid} is not a member of "${groupName}".`
      );
      return;
    }

    // Remove member
    const removedMember = group.members.splice(memberIndex, 1)[0];

    // Save to file
    if (this.dataService.saveUserGroups()) {
      await this.sendMessage(
        senderId,
        `✅ Member removed successfully!\n\n👥 *Group:* ${groupName}\n👤 *Removed:* ${removedMember.name} (${jid})\n📊 *Total members:* ${group.members.length}`
      );

      this.dataService.logActivity({
        type: "member_removed_from_group",
        group_name: groupName,
        member_jid: jid,
        member_name: removedMember.name,
        removed_by: senderId,
      });
    } else {
      await this.sendMessage(
        senderId,
        "❌ Failed to remove member. Please try again."
      );
    }

}
}

class ListGroupsCommand extends BaseCommand {
async execute(message, args) {
const senderId = message.key.remoteJid;

    if (!this.isWhitelisted(senderId)) {
      await this.sendMessage(
        senderId,
        "❌ You are not authorized to use this command."
      );
      return;
    }

    const groups = Object.values(this.dataService.userGroups);

    if (groups.length === 0) {
      await this.sendMessage(senderId, "👥 No groups found.");
      return;
    }

    let groupList = `👥 *Available Groups* (${groups.length})\n\n`;

    for (const group of groups) {
      const createdDate = new Date(group.created_at).toLocaleDateString();
      groupList += `🏷️ *Name:* ${group.name}\n`;
      groupList += `📝 *Description:* ${group.description}\n`;
      groupList += `👤 *Created by:* ${group.created_by}\n`;
      groupList += `📅 *Created:* ${createdDate}\n`;
      groupList += `👥 *Members:* ${group.members.length}\n\n`;
    }

    await this.sendMessage(senderId, groupList);

}
}

class ListGroupMembersCommand extends BaseCommand {
async execute(message, args) {
const senderId = message.key.remoteJid;

    if (!this.isWhitelisted(senderId)) {
      await this.sendMessage(
        senderId,
        "❌ You are not authorized to use this command."
      );
      return;
    }

    if (args.length < 1) {
      await this.sendMessage(
        senderId,
        "❌ Usage: listgroupmembers [groupName]\nExample: listgroupmembers family"
      );
      return;
    }

    const groupName = args[0];

    // Check if group exists
    if (!this.dataService.userGroups[groupName]) {
      await this.sendMessage(
        senderId,
        `❌ Group "${groupName}" does not exist.`
      );
      return;
    }

    const group = this.dataService.userGroups[groupName];

    if (group.members.length === 0) {
      await this.sendMessage(
        senderId,
        `👥 Group "${groupName}" has no members.`
      );
      return;
    }

    let memberList = `👥 *Members of "${groupName}"* (${group.members.length})\n\n`;

    for (let i = 0; i < group.members.length; i++) {
      const member = group.members[i];
      const addedDate = new Date(member.added_at).toLocaleDateString();
      memberList += `${i + 1}. *${member.name}*\n`;
      memberList += `   📱 ${member.jid}\n`;
      memberList += `   📅 Added: ${addedDate}\n`;
      memberList += `   👤 Added by: ${member.added_by}\n\n`;
    }

    await this.sendMessage(senderId, memberList);

}
}

class AddGroupWishCommand extends BaseCommand {
async execute(message, args) {
const senderId = message.key.remoteJid;

    if (!this.isWhitelisted(senderId)) {
      await this.sendMessage(
        senderId,
        "❌ You are not authorized to use this command."
      );
      return;
    }

    if (args.length < 4) {
      await this.sendMessage(
        senderId,
        '❌ Usage: addgroupwish [date] [time] [groupName] [message]\nExample: addgroupwish 01/01 00:00 family "Happy New Year everyone! 🎉"'
      );
      return;
    }

    const [date, time, groupName, ...messageParts] = args;
    const wishMessage = messageParts.join(" ");

    // Validate date format
    if (!validateDateFormat(date)) {
      await this.sendMessage(
        senderId,
        "❌ Invalid date format. Use DD/MM format (e.g., 01/01)"
      );
      return;
    }

    // Validate time format
    if (!validateTimeFormat(time)) {
      await this.sendMessage(
        senderId,
        "❌ Invalid time format. Use HH:MM format (e.g., 00:00)"
      );
      return;
    }

    // Check if group exists
    if (!this.dataService.userGroups[groupName]) {
      await this.sendMessage(
        senderId,
        `❌ Group "${groupName}" does not exist.`
      );
      return;
    }

    const group = this.dataService.userGroups[groupName];

    if (group.members.length === 0) {
      await this.sendMessage(
        senderId,
        `❌ Group "${groupName}" has no members.`
      );
      return;
    }

    // Create group wish object
    const groupWish = {
      id: Date.now().toString(),
      date,
      time,
      groupName,
      message: wishMessage,
      created_by: senderId,
      created_at: new Date().toISOString(),
    };

    // Add to group wishes array
    this.dataService.groupWishes.push(groupWish);

    // Save to file
    if (this.dataService.saveGroupWishes()) {
      await this.sendMessage(
        senderId,
        `✅ Group wish scheduled successfully!\n\n📅 *Date:* ${date}\n⏰ *Time:* ${time}\n👥 *Group:* ${groupName} (${group.members.length} members)\n💬 *Message:* "${wishMessage}"\n🆔 *ID:* ${groupWish.id}`
      );

      this.dataService.logActivity({
        type: "group_wish_added",
        group_wish_id: groupWish.id,
        group_name: groupName,
        created_by: senderId,
        scheduled_for: `${date} ${time}`,
        member_count: group.members.length,
      });
    } else {
      await this.sendMessage(
        senderId,
        "❌ Failed to save group wish. Please try again."
      );
    }

}
}

class ListGroupWishesCommand extends BaseCommand {
async execute(message, args) {
const senderId = message.key.remoteJid;

    if (!this.isWhitelisted(senderId)) {
      await this.sendMessage(
        senderId,
        "❌ You are not authorized to use this command."
      );
      return;
    }

    const isOwner = this.isOwner(senderId);

    // Filter group wishes based on user permissions
    const userGroupWishes = isOwner
      ? this.dataService.groupWishes
      : this.dataService.groupWishes.filter((w) => w.created_by === senderId);

    if (userGroupWishes.length === 0) {
      await this.sendMessage(senderId, "📅 No group wishes found.");
      return;
    }

    // Sort wishes by date and time
    userGroupWishes.sort((a, b) => {
      const dateA = new Date(`2024/${a.date} ${a.time}`);
      const dateB = new Date(`2024/${b.date} ${b.time}`);
      return dateA - dateB;
    });

    let wishList = `📅 *Scheduled Group Wishes* (${userGroupWishes.length})\n\n`;

    for (const wish of userGroupWishes) {
      const createdDate = new Date(wish.created_at).toLocaleDateString();
      const group = this.dataService.userGroups[wish.groupName];
      const memberCount = group ? group.members.length : 0;

      wishList += `🆔 *ID:* ${wish.id}\n`;
      wishList += `📅 *Date:* ${wish.date}\n`;
      wishList += `⏰ *Time:* ${wish.time}\n`;
      wishList += `👥 *Group:* ${wish.groupName} (${memberCount} members)\n`;
      wishList += `💬 *Message:* "${wish.message}"\n`;
      wishList += `📝 *Created:* ${createdDate}\n`;

      if (isOwner) {
        wishList += `👨‍💼 *Created by:* ${wish.created_by}\n`;
      }

      wishList += `\n`;
    }

    await this.sendMessage(senderId, wishList);

}
}

class SendGroupWishNowCommand extends BaseCommand {
async execute(message, args) {
const senderId = message.key.remoteJid;

    if (!this.isWhitelisted(senderId)) {
      await this.sendMessage(
        senderId,
        "❌ You are not authorized to use this command."
      );
      return;
    }

    if (args.length < 2) {
      await this.sendMessage(
        senderId,
        '❌ Usage: sendgroupwishnow [groupName] [message]\nExample: sendgroupwishnow family "Hello everyone!"'
      );
      return;
    }

    const groupName = args[0];
    const wishMessage = args.slice(1).join(" ");

    // Check if group exists
    if (!this.dataService.userGroups[groupName]) {
      await this.sendMessage(
        senderId,
        `❌ Group "${groupName}" does not exist.`
      );
      return;
    }

    const group = this.dataService.userGroups[groupName];

    if (group.members.length === 0) {
      await this.sendMessage(
        senderId,
        `❌ Group "${groupName}" has no members.`
      );
      return;
    }

    // Send message to all group members
    const sentCount = await this.messageService.sendToGroup(
      group.members,
      wishMessage
    );

    await this.sendMessage(
      senderId,
      `✅ Group wish sent successfully!\n\n👥 *Group:* ${groupName}\n📊 *Sent to:* ${sentCount}/${group.members.length} members\n💬 *Message:* "${wishMessage}"`
    );

    this.dataService.logActivity({
      type: "group_wish_sent_now",
      group_name: groupName,
      sent_by: senderId,
      sent_count: sentCount,
      total_members: group.members.length,
      message: wishMessage,
    });

}
}

module.exports = {
CreateGroupCommand,
AddToGroupCommand,
RemoveFromGroupCommand,
ListGroupsCommand,
ListGroupMembersCommand,
AddGroupWishCommand,
ListGroupWishesCommand,
SendGroupWishNowCommand,
};
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
${config.COMMAND_PREFIX} addgroupwish [date] [time] "Group Name" [message] - For group names with spaces
${config.COMMAND_PREFIX} listgroupwishes - List all scheduled group wishes
${config.COMMAND_PREFIX} sendgroupwishnow [groupName] [message] - Send wish to all group members immediately

👥 _Group Management Commands:_
${config.COMMAND_PREFIX} creategroup [groupName] [groupPrompt] - Create a new user group
${config.COMMAND_PREFIX} addtogroup [groupName] [jid] [name] - Add user to a group
${config.COMMAND_PREFIX} removefromgroup [groupName] [jid] - Remove user from a group
${config.COMMAND_PREFIX} listgroups - List all available groups
${config.COMMAND_PREFIX} listgroupmembers [groupName] - List members of a group`;

    if (isOwner) {
      helpText += `

🔧 _Owner Commands:_
${config.COMMAND_PREFIX} status - Show current bot status
${config.COMMAND_PREFIX} stop - Deactivates the bot
${config.COMMAND_PREFIX} start - Activates the bot
${config.COMMAND_PREFIX} whitelist [jid] [name] - Add user to whitelist
${config.COMMAND_PREFIX} removewhitelist [jid] - Remove user from whitelist`;
}

    helpText += `

_Examples:_
${config.COMMAND_PREFIX} addwish 25/12 09:00 1234567890@s.whatsapp.net "Merry Christmas! 🎄"
${config.COMMAND_PREFIX} addgroupwish 01/01 00:00 "Family Group" "Happy New Year everyone! 🎉"
${config.COMMAND_PREFIX} creategroup family "Close family members"`;

    await this.sendMessage(senderId, helpText);

}
}

module.exports = HelpCommand;
// src/commands/implementations/wishCommands.js
const BaseCommand = require("../baseCommand");
const {
validateDateFormat,
validateTimeFormat,
formatJID,
} = require("../../utils/validators");

class AddWishCommand extends BaseCommand {
async execute(message, args) {
const senderId = message.key.remoteJid;

    if (!this.isWhitelisted(senderId)) {
      await this.sendMessage(
        senderId,
        "❌ You are not authorized to use this command."
      );
      return;
    }

    if (args.length < 4) {
      await this.sendMessage(
        senderId,
        '❌ Usage: addwish [date] [time] [jid] [message]\nExample: addwish 25/12 09:00 1234567890@s.whatsapp.net "Merry Christmas! 🎄"'
      );
      return;
    }

    const [date, time, jid, ...messageParts] = args;
    const wishMessage = messageParts.join(" ");

    // Validate date format
    if (!validateDateFormat(date)) {
      await this.sendMessage(
        senderId,
        "❌ Invalid date format. Use DD/MM format (e.g., 25/12)"
      );
      return;
    }

    // Validate time format
    if (!validateTimeFormat(time)) {
      await this.sendMessage(
        senderId,
        "❌ Invalid time format. Use HH:MM format (e.g., 09:00)"
      );
      return;
    }

    // Format JID
    const formattedJID = formatJID(jid);

    // Create wish object
    const wish = {
      id: Date.now().toString(),
      date,
      time,
      jid: formattedJID,
      message: wishMessage,
      created_by: senderId,
      created_at: new Date().toISOString(),
      archived: false,
    };

    // Add to wishes array
    this.dataService.wishes.push(wish);

    // Save to file
    if (this.dataService.saveWishes()) {
      await this.sendMessage(
        senderId,
        `✅ Wish scheduled successfully!\n\n📅 Date: ${date}\n⏰ Time: ${time}\n👤 Recipient: ${formattedJID}\n💬 Message: "${wishMessage}"\n🆔 ID: ${wish.id}`
      );

      this.dataService.logActivity({
        type: "wish_added",
        wish_id: wish.id,
        created_by: senderId,
        recipient: formattedJID,
        scheduled_for: `${date} ${time}`,
      });
    } else {
      await this.sendMessage(
        senderId,
        "❌ Failed to save wish. Please try again."
      );
    }

}
}

class DeleteWishCommand extends BaseCommand {
async execute(message, args) {
const senderId = message.key.remoteJid;

    if (!this.isWhitelisted(senderId)) {
      await this.sendMessage(
        senderId,
        "❌ You are not authorized to use this command."
      );
      return;
    }

    if (args.length < 1) {
      await this.sendMessage(
        senderId,
        "❌ Usage: deletewish [id]\nExample: deletewish 1234567890"
      );
      return;
    }

    const wishId = args[0];
    const wishIndex = this.dataService.wishes.findIndex((w) => w.id === wishId);

    if (wishIndex === -1) {
      await this.sendMessage(
        senderId,
        "❌ Wish not found with the provided ID."
      );
      return;
    }

    const wish = this.dataService.wishes[wishIndex];

    // Check if user owns the wish or is owner
    if (wish.created_by !== senderId && !this.isOwner(senderId)) {
      await this.sendMessage(
        senderId,
        "❌ You can only delete wishes you created."
      );
      return;
    }

    // Remove wish
    this.dataService.wishes.splice(wishIndex, 1);

    // Save to file
    if (this.dataService.saveWishes()) {
      await this.sendMessage(
        senderId,
        `✅ Wish deleted successfully!\n\n🆔 ID: ${wishId}\n📅 Was scheduled for: ${wish.date} ${wish.time}\n👤 Recipient: ${wish.jid}`
      );

      this.dataService.logActivity({
        type: "wish_deleted",
        wish_id: wishId,
        deleted_by: senderId,
      });
    } else {
      await this.sendMessage(
        senderId,
        "❌ Failed to delete wish. Please try again."
      );
    }

}
}

class ArchiveWishCommand extends BaseCommand {
async execute(message, args) {
const senderId = message.key.remoteJid;

    if (!this.isWhitelisted(senderId)) {
      await this.sendMessage(
        senderId,
        "❌ You are not authorized to use this command."
      );
      return;
    }

    if (args.length < 1) {
      await this.sendMessage(
        senderId,
        "❌ Usage: archivewish [id]\nExample: archivewish 1234567890"
      );
      return;
    }

    const wishId = args[0];
    const wish = this.dataService.wishes.find((w) => w.id === wishId);

    if (!wish) {
      await this.sendMessage(
        senderId,
        "❌ Wish not found with the provided ID."
      );
      return;
    }

    // Check if user owns the wish or is owner
    if (wish.created_by !== senderId && !this.isOwner(senderId)) {
      await this.sendMessage(
        senderId,
        "❌ You can only archive wishes you created."
      );
      return;
    }

    if (wish.archived) {
      await this.sendMessage(senderId, "❌ Wish is already archived.");
      return;
    }

    // Archive wish
    wish.archived = true;
    wish.archived_at = new Date().toISOString();
    wish.archived_by = senderId;

    // Save to file
    if (this.dataService.saveWishes()) {
      await this.sendMessage(
        senderId,
        `✅ Wish archived successfully!\n\n🆔 ID: ${wishId}\n📅 Was scheduled for: ${wish.date} ${wish.time}\n👤 Recipient: ${wish.jid}`
      );

      this.dataService.logActivity({
        type: "wish_archived",
        wish_id: wishId,
        archived_by: senderId,
      });
    } else {
      await this.sendMessage(
        senderId,
        "❌ Failed to archive wish. Please try again."
      );
    }

}
}

class ListWishesCommand extends BaseCommand {
async execute(message, args) {
const senderId = message.key.remoteJid;

    if (!this.isWhitelisted(senderId)) {
      await this.sendMessage(
        senderId,
        "❌ You are not authorized to use this command."
      );
      return;
    }

    const isOwner = this.isOwner(senderId);

    // Filter wishes based on user permissions
    const userWishes = isOwner
      ? this.dataService.wishes.filter((w) => !w.archived)
      : this.dataService.wishes.filter(
          (w) => !w.archived && w.created_by === senderId
        );

    if (userWishes.length === 0) {
      await this.sendMessage(senderId, "📅 No active wishes found.");
      return;
    }

    // Sort wishes by date and time
    userWishes.sort((a, b) => {
      const dateA = new Date(`2024/${a.date} ${a.time}`);
      const dateB = new Date(`2024/${b.date} ${b.time}`);
      return dateA - dateB;
    });

    let wishList = `📅 *Active Wishes* (${userWishes.length})\n\n`;

    for (const wish of userWishes) {
      const createdDate = new Date(wish.created_at).toLocaleDateString();
      wishList += `🆔 *ID:* ${wish.id}\n`;
      wishList += `📅 *Date:* ${wish.date}\n`;
      wishList += `⏰ *Time:* ${wish.time}\n`;
      wishList += `👤 *Recipient:* ${wish.jid}\n`;
      wishList += `💬 *Message:* "${wish.message}"\n`;
      wishList += `📝 *Created:* ${createdDate}\n`;

      if (isOwner) {
        wishList += `👨‍💼 *Created by:* ${wish.created_by}\n`;
      }

      wishList += `\n`;
    }

    // Split message if too long
    if (wishList.length > 4000) {
      const chunks = this.splitMessage(wishList, 4000);
      for (let i = 0; i < chunks.length; i++) {
        await this.sendMessage(senderId, chunks[i]);
        if (i < chunks.length - 1) {
          await new Promise((resolve) => setTimeout(resolve, 1000)); // 1 second delay
        }
      }
    } else {
      await this.sendMessage(senderId, wishList);
    }

}

splitMessage(text, maxLength) {
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
}

module.exports = {
AddWishCommand,
DeleteWishCommand,
ArchiveWishCommand,
ListWishesCommand,
};
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

_Owner:_ ${config.OWNER}

_Command Prefix:_ ${config.COMMAND_PREFIX}`;

    await this.sendMessage(senderId, statusText);

}
}

module.exports = StatusCommand;

// src/bot/whatsAppBot.js
const {
default: makeWASocket,
DisconnectReason,
useMultiFileAuthState,
} = require("@whiskeysockets/baileys");
const { Boom } = require("@hapi/boom");
const qrcode = require("qrcode-terminal");

const config = require("../config/config");
const logger = require("../utils/logger");
const DataService = require("../services/dataService");
const MessageService = require("../services/messageService");
const SchedulerService = require("../services/schedulerService");
const CommandManager = require("../commands/commandManager");

class WhatsAppBot {
constructor() {
this.sock = null;
this.dataService = new DataService();
this.messageService = null;
this.schedulerService = null;
this.commandManager = null;
this.start();
}

async start() {
const { state, saveCreds } = await useMultiFileAuthState(
config.AUTH_STATE_DIR
);

    this.sock = makeWASocket({
      auth: state,
      logger,
      browser: [config.BROWSER_NAME, "Chrome", config.BROWSER_VERSION],
    });

    // Initialize services
    this.messageService = new MessageService(this.sock);
    this.schedulerService = new SchedulerService(
      this.dataService,
      this.messageService
    );
    this.commandManager = new CommandManager(
      this.dataService,
      this.messageService
    );

    this.sock.ev.on("connection.update", (update) => {
      this.handleConnectionUpdate(update);
    });

    this.sock.ev.on("creds.update", saveCreds);
    this.sock.ev.on("messages.upsert", async (m) => {
      await this.handleMessage(m);
    });

}

handleConnectionUpdate(update) {
const { connection, lastDisconnect, qr } = update;

    if (qr) {
      console.clear();
      console.log("📲 Scan the QR code below to log in:");
      qrcode.generate(qr, { small: true });
    }

    if (connection === "close") {
      const shouldReconnect =
        (lastDisconnect.error = Boom)?.output?.statusCode !==
        DisconnectReason.loggedOut;

      console.log(
        "Connection closed due to ",
        lastDisconnect.error,
        ", reconnecting ",
        shouldReconnect
      );

      if (shouldReconnect) {
        this.start();
      }
    } else if (connection === "open") {
      console.log("🎉 Soul Bot is ready!");
      console.log("Owner number configured as:", config.OWNER_NUMBER);
      console.log(
        `Send "${config.COMMAND_PREFIX} help" to see available commands`
      );
    }

}

async handleMessage(messageUpdate) {
const { messages, type } = messageUpdate;

    if (type !== "notify") return;

    for (const message of messages) {
      if (message.key.remoteJid === "status@broadcast" || !message.message) {
        continue;
      }

      if (config.DEBUG_MODE) {
        console.log("Processing message from:", message.key.remoteJid);
      }

      await this.commandManager.processMessage(message);
    }

}

async shutdown() {
console.log("Shutting down bot...");

    // Create backup before shutdown
    const backupFile = await this.dataService.backupData();
    if (backupFile) {
      console.log(`Backup created before shutdown: ${backupFile}`);
    }

    process.exit(0);

}
}

module.exports = WhatsAppBot;
// Directory structure:
/_
src/
├── app.js # Main entry point
├── config/
│ └── config.js # Configuration settings
├── utils/
│ ├── logger.js # Logging utility
│ ├── fileManager.js # File operations
│ └── validators.js # Validation utilities
├── services/
│ ├── dataService.js # Data management
│ ├── messageService.js # Message handling
│ └── schedulerService.js # Cron job management
├── commands/
│ ├── commandParser.js # Command parsing
│ ├── baseCommand.js # Base command class
│ ├── commandManager.js # Command routing
│ └── implementations/ # Individual command implementations
│ ├── helpCommand.js
│ ├── statusCommand.js
│ ├── wishCommands.js
│ ├── groupCommands.js
│ └── adminCommands.js
├── bot/
│ └── whatsAppBot.js # Main bot class
└── data/ # JSON data files
├── wishes.json
├── group_wishes.json
├── user_groups.json
├── whitelist.json
├── bot_config.json
└── bot_log.json
_/
