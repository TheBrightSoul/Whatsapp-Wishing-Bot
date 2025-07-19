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
