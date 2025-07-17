// src/services/messageService.js
class MessageService {
  constructor(sock) {
    this.sock = sock;
  }

  async sendMessage(jid, text) {
    try {
      await this.sock.sendMessage(jid, { text });
      return true;
    } catch (error) {
      console.error("Error sending message:", error);
      return false;
    }
  }

  async sendToGroup(groupMembers, message) {
    let sentCount = 0;

    for (const member of groupMembers) {
      try {
        await this.sendMessage(member.jid, message);
        sentCount++;
      } catch (error) {
        console.error(`Error sending message to ${member.jid}:`, error);
      }
    }

    return sentCount;
  }
}

module.exports = MessageService;
