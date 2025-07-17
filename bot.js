const {
  default: makeWASocket,
  DisconnectReason,
  useMultiFileAuthState,
} = require("@whiskeysockets/baileys");
const { Boom } = require("@hapi/boom");
const fs = require("fs");
const path = require("path");
const cron = require("node-cron");
const P = require("pino");
const qrcode = require("qrcode-terminal");
require("dotenv").config();

// File paths
const WISHES_FILE = path.join(__dirname, "wishes.json");
const GROUP_WISHES_FILE = path.join(__dirname, "group_wishes.json");
const USER_GROUPS_FILE = path.join(__dirname, "user_groups.json");
const WHITELIST_FILE = path.join(__dirname, "whitelist.json");
const BOT_CONFIG_FILE = path.join(__dirname, "bot_config.json");
const LOG_FILE = path.join(__dirname, "bot_log.json");

// Bot configuration
const OWNER_NUMBER = process.env.OWNER_NUMBER;
const COMMAND_PREFIX = process.env.COMMAND_PREFIX || "Soul,"; // Default value if not set
const DEBUG_MODE = process.env.DEBUG_MODE === "true";

// Create logger
const logger = P(
  { timestamp: () => `,"time":"${new Date().toJSON()}"` },
  P.destination(process.env.LOG_FILE || "./wa-logs.txt")
);
logger.level = "trace";

class EnhancedWhatsAppBot {
  constructor() {
    this.sock = null;
    this.wishes = this.loadWishes();
    this.groupWishes = this.loadGroupWishes();
    this.userGroups = this.loadUserGroups();
    this.whitelist = this.loadWhitelist();
    this.botConfig = this.loadBotConfig();
    this.setupCronJob();
    this.start();
  }

  // Load data from JSON files
  loadWishes() {
    try {
      if (fs.existsSync(WISHES_FILE)) {
        const data = fs.readFileSync(WISHES_FILE, "utf8");
        return JSON.parse(data);
      }
    } catch (error) {
      console.error("Error loading wishes:", error);
    }
    return [];
  }

  loadGroupWishes() {
    try {
      if (fs.existsSync(GROUP_WISHES_FILE)) {
        const data = fs.readFileSync(GROUP_WISHES_FILE, "utf8");
        return JSON.parse(data);
      }
    } catch (error) {
      console.error("Error loading group wishes:", error);
    }
    return [];
  }

  loadUserGroups() {
    try {
      if (fs.existsSync(USER_GROUPS_FILE)) {
        const data = fs.readFileSync(USER_GROUPS_FILE, "utf8");
        return JSON.parse(data);
      }
    } catch (error) {
      console.error("Error loading user groups:", error);
    }
    return {};
  }

  loadWhitelist() {
    try {
      if (fs.existsSync(WHITELIST_FILE)) {
        const data = fs.readFileSync(WHITELIST_FILE, "utf8");
        return JSON.parse(data);
      }
    } catch (error) {
      console.error("Error loading whitelist:", error);
    }
    return [OWNER_NUMBER]; // Owner is always whitelisted
  }

  loadBotConfig() {
    try {
      if (fs.existsSync(BOT_CONFIG_FILE)) {
        const data = fs.readFileSync(BOT_CONFIG_FILE, "utf8");
        return JSON.parse(data);
      }
    } catch (error) {
      console.error("Error loading bot config:", error);
    }
    return { active: true, lastActivity: new Date().toISOString() };
  }

  // Save data to JSON files
  saveWishes() {
    try {
      fs.writeFileSync(WISHES_FILE, JSON.stringify(this.wishes, null, 2));
    } catch (error) {
      console.error("Error saving wishes:", error);
    }
  }

  saveGroupWishes() {
    try {
      fs.writeFileSync(
        GROUP_WISHES_FILE,
        JSON.stringify(this.groupWishes, null, 2)
      );
    } catch (error) {
      console.error("Error saving group wishes:", error);
    }
  }

  saveUserGroups() {
    try {
      fs.writeFileSync(
        USER_GROUPS_FILE,
        JSON.stringify(this.userGroups, null, 2)
      );
    } catch (error) {
      console.error("Error saving user groups:", error);
    }
  }

  saveWhitelist() {
    try {
      fs.writeFileSync(WHITELIST_FILE, JSON.stringify(this.whitelist, null, 2));
    } catch (error) {
      console.error("Error saving whitelist:", error);
    }
  }

  saveBotConfig() {
    try {
      fs.writeFileSync(
        BOT_CONFIG_FILE,
        JSON.stringify(this.botConfig, null, 2)
      );
    } catch (error) {
      console.error("Error saving bot config:", error);
    }
  }

  // Log activities
  logActivity(activityData) {
    try {
      let logs = [];
      if (fs.existsSync(LOG_FILE)) {
        const data = fs.readFileSync(LOG_FILE, "utf8");
        logs = JSON.parse(data);
      }

      logs.push({
        timestamp: new Date().toISOString(),
        ...activityData,
      });

      // Keep only last 1000 logs
      if (logs.length > 1000) {
        logs = logs.slice(-1000);
      }

      fs.writeFileSync(LOG_FILE, JSON.stringify(logs, null, 2));
    } catch (error) {
      console.error("Error logging activity:", error);
    }
  }

  // Start the bot
  async start() {
    const { state, saveCreds } = await useMultiFileAuthState(
      process.env.AUTH_STATE_DIR || "./auth_info_baileys"
    );

    this.sock = makeWASocket({
      auth: state,
      logger,
      browser: [
        process.env.BAILEYS_BROWSER_NAME || "Soul Bot",
        "Chrome",
        process.env.BAILEYS_BROWSER_VERSION || "1.0.0",
      ],
    });

    this.sock.ev.on("connection.update", (update) => {
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
        console.log("Owner number configured as:", OWNER_NUMBER);
        console.log(`Send "${COMMAND_PREFIX} help" to see available commands`);
      }
    });

    this.sock.ev.on("creds.update", saveCreds);
    this.sock.ev.on("messages.upsert", async (m) => {
      await this.handleMessage(m);
    });
  }

  // Enhanced command parser
  parseCommand(messageText) {
    if (!messageText.startsWith(COMMAND_PREFIX)) {
      return null;
    }

    const commandText = messageText.substring(COMMAND_PREFIX.length).trim();
    const args = [];
    let currentArg = "";
    let inQuotes = false;
    let quoteChar = "";

    for (let i = 0; i < commandText.length; i++) {
      const char = commandText[i];

      if ((char === '"' || char === "'") && !inQuotes) {
        inQuotes = true;
        quoteChar = char;
      } else if (char === quoteChar && inQuotes) {
        inQuotes = false;
        quoteChar = "";
      } else if (char === " " && !inQuotes) {
        if (currentArg.trim()) {
          args.push(currentArg.trim());
          currentArg = "";
        }
      } else {
        currentArg += char;
      }
    }

    if (currentArg.trim()) {
      args.push(currentArg.trim());
    }

    return {
      command: args[0]?.toLowerCase(),
      args: args.slice(1),
      raw: commandText,
    };
  }

  // Handle incoming messages
  async handleMessage(messageUpdate) {
    const { messages, type } = messageUpdate;

    if (type !== "notify") return;

    for (const message of messages) {
      if (message.key.remoteJid === "status@broadcast" || !message.message) {
        continue;
      }

      const senderId = message.key.remoteJid;
      const messageText =
        message.message.conversation ||
        message.message.extendedTextMessage?.text ||
        "";

      // Check if bot is active
      if (!this.botConfig.active && senderId !== OWNER_NUMBER) {
        continue;
      }

      // Check if user is whitelisted
      if (!this.whitelist.includes(senderId)) {
        if (DEBUG_MODE) {
          console.log("Message from non-whitelisted user:", senderId);
        }
        continue;
      }

      const parsedCommand = this.parseCommand(messageText);
      if (!parsedCommand) {
        continue;
      }

      if (DEBUG_MODE) {
        console.log("Processing command:", parsedCommand);
      }

      try {
        await this.processCommand(message, parsedCommand);
      } catch (error) {
        console.error("Error processing command:", error);
        await this.sendMessage(
          senderId,
          "❌ Error processing command. Please try again."
        );
      }
    }
  }

  // Process commands
  async processCommand(message, parsedCommand) {
    const senderId = message.key.remoteJid;
    const { command, args } = parsedCommand;

    // Bot control commands (Owner only)
    if (
      ["status", "stop", "start", "whitelist", "removewhitelist"].includes(
        command
      )
    ) {
      if (senderId !== OWNER_NUMBER) {
        await this.sendMessage(
          senderId,
          "❌ This command is only available to the bot owner."
        );
        return;
      }
    }

    switch (command) {
      case "status":
        await this.handleStatus(message);
        break;
      case "stop":
        await this.handleStop(message);
        break;
      case "start":
        await this.handleStart(message);
        break;
      case "help":
        await this.handleHelp(message);
        break;
      case "whitelist":
        await this.handleWhitelist(message, args);
        break;
      case "removewhitelist":
        await this.handleRemoveWhitelist(message, args);
        break;
      case "addwish":
        await this.handleAddWish(message, args);
        break;
      case "deletewish":
        await this.handleDeleteWish(message, args);
        break;
      case "archivewish":
        await this.handleArchiveWish(message, args);
        break;
      case "listwishes":
        await this.handleListWishes(message);
        break;
      case "addgroupwish":
        await this.handleAddGroupWish(message, args);
        break;
      case "listgroupwishes":
        await this.handleListGroupWishes(message);
        break;
      case "sendgroupwishnow":
        await this.handleSendGroupWishNow(message, args);
        break;
      case "creategroup":
        await this.handleCreateGroup(message, args);
        break;
      case "addtogroup":
        await this.handleAddToGroup(message, args);
        break;
      case "removefromgroup":
        await this.handleRemoveFromGroup(message, args);
        break;
      case "listgroups":
        await this.handleListGroups(message);
        break;
      case "listgroupmembers":
        await this.handleListGroupMembers(message, args);
        break;
      default:
        await this.sendMessage(
          senderId,
          `❌ Unknown command: ${command}\nUse ${COMMAND_PREFIX} help for available commands.`
        );
    }
  }

  // Command handlers
  async handleStatus(message) {
    const senderId = message.key.remoteJid;
    const activeWishes = this.wishes.filter((w) => !w.archived).length;
    const archivedWishes = this.wishes.filter((w) => w.archived).length;
    const groupWishes = this.groupWishes.length;
    const userGroups = Object.keys(this.userGroups).length;
    const whitelistedUsers = this.whitelist.length;

    const statusText = `🤖 *Soul Bot Status*

*Bot Status:* ${this.botConfig.active ? "🟢 Active" : "🔴 Inactive"}
*Last Activity:* ${new Date(this.botConfig.lastActivity).toLocaleString()}

*Statistics:*
📅 Active Wishes: ${activeWishes}
📂 Archived Wishes: ${archivedWishes}
👥 Group Wishes: ${groupWishes}
🏷️ User Groups: ${userGroups}
✅ Whitelisted Users: ${whitelistedUsers}

*Owner:* ${OWNER_NUMBER}
*Command Prefix:* ${COMMAND_PREFIX}`;

    await this.sendMessage(senderId, statusText);
  }

  async handleStop(message) {
    const senderId = message.key.remoteJid;
    this.botConfig.active = false;
    this.botConfig.lastActivity = new Date().toISOString();
    this.saveBotConfig();

    await this.sendMessage(
      senderId,
      "🔴 Bot has been deactivated. Use 'Soul! start' to reactivate."
    );
    this.logActivity({ type: "bot_stopped", user: senderId });
  }

  async handleStart(message) {
    const senderId = message.key.remoteJid;
    this.botConfig.active = true;
    this.botConfig.lastActivity = new Date().toISOString();
    this.saveBotConfig();

    await this.sendMessage(
      senderId,
      "🟢 Bot has been activated and is ready to serve whitelisted users."
    );
    this.logActivity({ type: "bot_started", user: senderId });
  }

  async handleHelp(message) {
    const senderId = message.key.remoteJid;
    const isOwner = senderId === OWNER_NUMBER;

    let helpText = `🤖 *Soul Bot Commands* 🤖

*General Commands:*
${COMMAND_PREFIX} help - Shows this help menu

📅 *Scheduled Wishes Commands:*
${COMMAND_PREFIX} addwish [date] [time] [jid] [message] - Schedule a new wish
${COMMAND_PREFIX} deletewish [id] - Delete a scheduled wish by ID
${COMMAND_PREFIX} archivewish [id] - Archive a scheduled wish by ID
${COMMAND_PREFIX} listwishes - List all active scheduled wishes

📣 *Group Wishes Commands:*
${COMMAND_PREFIX} addgroupwish [date] [time] [groupName] [message] - Schedule wish for entire group
${COMMAND_PREFIX} addgroupwish [date] [time] "Group Name" [message] - For group names with spaces
${COMMAND_PREFIX} listgroupwishes - List all scheduled group wishes
${COMMAND_PREFIX} sendgroupwishnow [groupName] [message] - Send wish to all group members immediately

👥 *Group Management Commands:*
${COMMAND_PREFIX} creategroup [groupName] [groupPrompt] - Create a new user group
${COMMAND_PREFIX} addtogroup [groupName] [jid] [name] - Add user to a group
${COMMAND_PREFIX} removefromgroup [groupName] [jid] - Remove user from a group
${COMMAND_PREFIX} listgroups - List all available groups
${COMMAND_PREFIX} listgroupmembers [groupName] - List members of a group`;

    if (isOwner) {
      helpText += `

🔧 *Owner Commands:*
${COMMAND_PREFIX} status - Show current bot status
${COMMAND_PREFIX} stop - Deactivates the bot
${COMMAND_PREFIX} start - Activates the bot
${COMMAND_PREFIX} whitelist [jid] [name] - Add user to whitelist
${COMMAND_PREFIX} removewhitelist [jid] - Remove user from whitelist`;
    }

    helpText += `

*Examples:*
${COMMAND_PREFIX} addwish 25/12 09:00 1234567890@s.whatsapp.net "Merry Christmas! 🎄"
${COMMAND_PREFIX} addgroupwish 01/01 00:00 "Family Group" "Happy New Year everyone! 🎉"
${COMMAND_PREFIX} creategroup family "Close family members"`;

    await this.sendMessage(senderId, helpText);
  }

  async handleWhitelist(message, args) {
    const senderId = message.key.remoteJid;

    if (args.length < 2) {
      await this.sendMessage(
        senderId,
        `❌ Usage: ${COMMAND_PREFIX} whitelist [jid] [name]`
      );
      return;
    }

    const jid = args[0].includes("@s.whatsapp.net")
      ? args[0]
      : `${args[0]}@s.whatsapp.net`;
    const name = args.slice(1).join(" ");

    if (!this.whitelist.includes(jid)) {
      this.whitelist.push(jid);
      this.saveWhitelist();
      await this.sendMessage(
        senderId,
        `✅ Added ${name} (${jid}) to whitelist.`
      );
      this.logActivity({
        type: "user_whitelisted",
        user: senderId,
        target: jid,
        name,
      });
    } else {
      await this.sendMessage(senderId, `ℹ️ ${name} is already whitelisted.`);
    }
  }

  async handleRemoveWhitelist(message, args) {
    const senderId = message.key.remoteJid;

    if (args.length < 1) {
      await this.sendMessage(
        senderId,
        `❌ Usage: ${COMMAND_PREFIX} removewhitelist [jid]`
      );
      return;
    }

    const jid = args[0].includes("@s.whatsapp.net")
      ? args[0]
      : `${args[0]}@s.whatsapp.net`;

    if (jid === OWNER_NUMBER) {
      await this.sendMessage(
        senderId,
        "❌ Cannot remove owner from whitelist."
      );
      return;
    }

    const index = this.whitelist.indexOf(jid);
    if (index > -1) {
      this.whitelist.splice(index, 1);
      this.saveWhitelist();
      await this.sendMessage(senderId, `✅ Removed ${jid} from whitelist.`);
      this.logActivity({
        type: "user_removed_whitelist",
        user: senderId,
        target: jid,
      });
    } else {
      await this.sendMessage(senderId, `ℹ️ ${jid} is not in whitelist.`);
    }
  }

  async handleAddWish(message, args) {
    const senderId = message.key.remoteJid;

    if (args.length < 4) {
      await this.sendMessage(
        senderId,
        `❌ Usage: ${COMMAND_PREFIX} addwish [date] [time] [jid] [message]`
      );
      return;
    }

    const date = args[0];
    const time = args[1];
    const jid = args[2].includes("@s.whatsapp.net")
      ? args[2]
      : `${args[2]}@s.whatsapp.net`;
    const message_text = args.slice(3).join(" ");

    // Validate date format (DD/MM)
    const dateRegex = /^(\d{1,2})\/(\d{1,2})$/;
    if (!dateRegex.test(date)) {
      await this.sendMessage(
        senderId,
        "❌ Invalid date format. Use DD/MM format (e.g., 25/12)"
      );
      return;
    }

    // Validate time format (HH:MM)
    const timeRegex = /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/;
    if (!timeRegex.test(time)) {
      await this.sendMessage(
        senderId,
        "❌ Invalid time format. Use HH:MM format (e.g., 09:00)"
      );
      return;
    }

    const wish = {
      id: Date.now(),
      date: date,
      time: time,
      jid: jid,
      message: message_text,
      archived: false,
      created_by: senderId,
      created_at: new Date().toISOString(),
    };

    this.wishes.push(wish);
    this.saveWishes();

    await this.sendMessage(
      senderId,
      `✅ Wish scheduled for ${date} at ${time}`
    );
    this.logActivity({ type: "wish_added", user: senderId, wish_id: wish.id });
  }

  async handleDeleteWish(message, args) {
    const senderId = message.key.remoteJid;

    if (args.length < 1) {
      await this.sendMessage(
        senderId,
        `❌ Usage: ${COMMAND_PREFIX} deletewish [id]`
      );
      return;
    }

    const id = parseInt(args[0]);
    const index = this.wishes.findIndex((w) => w.id === id);

    if (index === -1) {
      await this.sendMessage(senderId, "❌ Wish not found.");
      return;
    }

    const deletedWish = this.wishes.splice(index, 1)[0];
    this.saveWishes();

    await this.sendMessage(senderId, `✅ Wish deleted (ID: ${id})`);
    this.logActivity({ type: "wish_deleted", user: senderId, wish_id: id });
  }

  async handleArchiveWish(message, args) {
    const senderId = message.key.remoteJid;

    if (args.length < 1) {
      await this.sendMessage(
        senderId,
        `❌ Usage: ${COMMAND_PREFIX} archivewish [id]`
      );
      return;
    }

    const id = parseInt(args[0]);
    const wish = this.wishes.find((w) => w.id === id);

    if (!wish) {
      await this.sendMessage(senderId, "❌ Wish not found.");
      return;
    }

    wish.archived = true;
    wish.archived_at = new Date().toISOString();
    this.saveWishes();

    await this.sendMessage(senderId, `✅ Wish archived (ID: ${id})`);
    this.logActivity({ type: "wish_archived", user: senderId, wish_id: id });
  }

  async handleListWishes(message) {
    const senderId = message.key.remoteJid;
    const activeWishes = this.wishes.filter((w) => !w.archived);

    if (activeWishes.length === 0) {
      await this.sendMessage(senderId, "📅 No active wishes found.");
      return;
    }

    let response = "📅 *Active Scheduled Wishes:*\n\n";
    activeWishes.forEach((wish) => {
      response += `*ID:* ${wish.id}\n`;
      response += `*Date:* ${wish.date} at ${wish.time}\n`;
      response += `*Recipient:* ${wish.jid}\n`;
      response += `*Message:* ${wish.message}\n\n`;
    });

    await this.sendMessage(senderId, response);
  }

  // Group wish handlers
  async handleAddGroupWish(message, args) {
    const senderId = message.key.remoteJid;

    if (args.length < 4) {
      await this.sendMessage(
        senderId,
        `❌ Usage: ${COMMAND_PREFIX} addgroupwish [date] [time] [groupName] [message]`
      );
      return;
    }

    const date = args[0];
    const time = args[1];
    const groupName = args[2];
    const message_text = args.slice(3).join(" ");

    // Validate date and time formats
    const dateRegex = /^(\d{1,2})\/(\d{1,2})$/;
    const timeRegex = /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/;

    if (!dateRegex.test(date)) {
      await this.sendMessage(
        senderId,
        "❌ Invalid date format. Use DD/MM format (e.g., 25/12)"
      );
      return;
    }

    if (!timeRegex.test(time)) {
      await this.sendMessage(
        senderId,
        "❌ Invalid time format. Use HH:MM format (e.g., 09:00)"
      );
      return;
    }

    // Check if group exists
    if (!this.userGroups[groupName]) {
      await this.sendMessage(
        senderId,
        `❌ Group "${groupName}" does not exist. Create it first using creategroup command.`
      );
      return;
    }

    const groupWish = {
      id: Date.now(),
      date: date,
      time: time,
      groupName: groupName,
      message: message_text,
      created_by: senderId,
      created_at: new Date().toISOString(),
    };

    this.groupWishes.push(groupWish);
    this.saveGroupWishes();

    await this.sendMessage(
      senderId,
      `✅ Group wish scheduled for "${groupName}" on ${date} at ${time}`
    );
    this.logActivity({
      type: "group_wish_added",
      user: senderId,
      group_wish_id: groupWish.id,
    });
  }

  async handleListGroupWishes(message) {
    const senderId = message.key.remoteJid;

    if (this.groupWishes.length === 0) {
      await this.sendMessage(senderId, "📣 No group wishes found.");
      return;
    }

    let response = "📣 *Scheduled Group Wishes:*\n\n";
    this.groupWishes.forEach((wish) => {
      response += `*ID:* ${wish.id}\n`;
      response += `*Date:* ${wish.date} at ${wish.time}\n`;
      response += `*Group:* ${wish.groupName}\n`;
      response += `*Message:* ${wish.message}\n\n`;
    });

    await this.sendMessage(senderId, response);
  }

  async handleSendGroupWishNow(message, args) {
    const senderId = message.key.remoteJid;

    if (args.length < 2) {
      await this.sendMessage(
        senderId,
        `❌ Usage: ${COMMAND_PREFIX} sendgroupwishnow [groupName] [message]`
      );
      return;
    }

    const groupName = args[0];
    const message_text = args.slice(1).join(" ");

    // Check if group exists
    if (!this.userGroups[groupName]) {
      await this.sendMessage(
        senderId,
        `❌ Group "${groupName}" does not exist.`
      );
      return;
    }

    const group = this.userGroups[groupName];
    let sentCount = 0;

    for (const member of group.members) {
      try {
        await this.sendMessage(member.jid, message_text);
        sentCount++;
      } catch (error) {
        console.error(`Error sending message to ${member.jid}:`, error);
      }
    }

    await this.sendMessage(
      senderId,
      `✅ Group wish sent to ${sentCount}/${group.members.length} members of "${groupName}"`
    );
    this.logActivity({
      type: "group_wish_sent",
      user: senderId,
      group: groupName,
      sent_count: sentCount,
    });
  }

  // Group management handlers
  async handleCreateGroup(message, args) {
    const senderId = message.key.remoteJid;

    if (args.length < 2) {
      await this.sendMessage(
        senderId,
        `❌ Usage: ${COMMAND_PREFIX} creategroup [groupName] [groupPrompt]`
      );
      return;
    }

    const groupName = args[0];
    const groupPrompt = args.slice(1).join(" ");

    if (this.userGroups[groupName]) {
      await this.sendMessage(
        senderId,
        `❌ Group "${groupName}" already exists.`
      );
      return;
    }

    this.userGroups[groupName] = {
      name: groupName,
      prompt: groupPrompt,
      members: [],
      created_by: senderId,
      created_at: new Date().toISOString(),
    };

    this.saveUserGroups();

    await this.sendMessage(
      senderId,
      `✅ Group "${groupName}" created successfully.`
    );
    this.logActivity({
      type: "group_created",
      user: senderId,
      group: groupName,
    });
  }

  async handleAddToGroup(message, args) {
    const senderId = message.key.remoteJid;

    if (args.length < 3) {
      await this.sendMessage(
        senderId,
        `❌ Usage: ${COMMAND_PREFIX} addtogroup [groupName] [jid] [name]`
      );
      return;
    }

    const groupName = args[0];
    const jid = args[1].includes("@s.whatsapp.net")
      ? args[1]
      : `${args[1]}@s.whatsapp.net`;
    const name = args.slice(2).join(" ");

    if (!this.userGroups[groupName]) {
      await this.sendMessage(
        senderId,
        `❌ Group "${groupName}" does not exist.`
      );
      return;
    }

    const group = this.userGroups[groupName];
    const existingMember = group.members.find((m) => m.jid === jid);

    if (existingMember) {
      await this.sendMessage(
        senderId,
        `❌ ${name} is already in group "${groupName}".`
      );
      return;
    }

    group.members.push({
      jid: jid,
      name: name,
      added_by: senderId,
      added_at: new Date().toISOString(),
    });

    this.saveUserGroups();

    await this.sendMessage(
      senderId,
      `✅ Added ${name} to group "${groupName}".`
    );
    this.logActivity({
      type: "member_added_to_group",
      user: senderId,
      group: groupName,
      member: jid,
    });
  }

  async handleRemoveFromGroup(message, args) {
    const senderId = message.key.remoteJid;

    if (args.length < 2) {
      await this.sendMessage(
        senderId,
        `❌ Usage: ${COMMAND_PREFIX} removefromgroup [groupName] [jid]`
      );
      return;
    }

    const groupName = args[0];
    const jid = args[1].includes("@s.whatsapp.net")
      ? args[1]
      : `${args[1]}@s.whatsapp.net`;

    if (!this.userGroups[groupName]) {
      await this.sendMessage(
        senderId,
        `❌ Group "${groupName}" does not exist.`
      );
      return;
    }

    const group = this.userGroups[groupName];
    const memberIndex = group.members.findIndex((m) => m.jid === jid);

    if (memberIndex === -1) {
      await this.sendMessage(
        senderId,
        `❌ User not found in group "${groupName}".`
      );
      return;
    }

    const removedMember = group.members.splice(memberIndex, 1)[0];
    this.saveUserGroups();

    await this.sendMessage(
      senderId,
      `✅ Removed ${removedMember.name} from group "${groupName}".`
    );
    this.logActivity({
      type: "member_removed_from_group",
      user: senderId,
      group: groupName,
      member: jid,
    });
  }

  async handleListGroups(message) {
    const senderId = message.key.remoteJid;
    const groupNames = Object.keys(this.userGroups);

    if (groupNames.length === 0) {
      await this.sendMessage(senderId, "👥 No groups found.");
      return;
    }

    let response = "👥 *Available Groups:*\n\n";
    groupNames.forEach((groupName) => {
      const group = this.userGroups[groupName];
      response += `*${groupName}*\n`;
      response += `  Description: ${group.prompt}\n`;
      response += `  Members: ${group.members.length}\n`;
      response += `  Created: ${new Date(
        group.created_at
      ).toLocaleDateString()}\n\n`;
    });

    await this.sendMessage(senderId, response);
  }

  async handleListGroupMembers(message, args) {
    const senderId = message.key.remoteJid;

    if (args.length < 1) {
      await this.sendMessage(
        senderId,
        `❌ Usage: ${COMMAND_PREFIX} listgroupmembers [groupName]`
      );
      return;
    }

    const groupName = args[0];

    if (!this.userGroups[groupName]) {
      await this.sendMessage(
        senderId,
        `❌ Group "${groupName}" does not exist.`
      );
      return;
    }

    const group = this.userGroups[groupName];

    if (group.members.length === 0) {
      await this.sendMessage(
        senderId,
        `👥 Group "${groupName}" has no members.`
      );
      return;
    }

    let response = `👥 *Members of "${groupName}":*\n\n`;
    group.members.forEach((member, index) => {
      response += `${index + 1}. *${member.name}*\n`;
      response += `   JID: ${member.jid}\n`;
      response += `   Added: ${new Date(
        member.added_at
      ).toLocaleDateString()}\n\n`;
    });

    await this.sendMessage(senderId, response);
  }

  // Send message helper
  async sendMessage(jid, text) {
    try {
      await this.sock.sendMessage(jid, { text });
    } catch (error) {
      console.error("Error sending message:", error);
    }
  }

  // Setup cron job to check for scheduled wishes
  setupCronJob() {
    // Run every minute to check for scheduled wishes
    cron.schedule("* * * * *", async () => {
      if (this.botConfig.active) {
        await this.checkAndSendScheduledWishes();
      }
    });
  }

  // Check and send scheduled wishes
  async checkAndSendScheduledWishes() {
    try {
      const now = new Date();
      const currentDate = `${now.getDate().toString().padStart(2, "0")}/${(
        now.getMonth() + 1
      )
        .toString()
        .padStart(2, "0")}`;
      const currentTime = `${now.getHours().toString().padStart(2, "0")}:${now
        .getMinutes()
        .toString()
        .padStart(2, "0")}`;

      // Check individual wishes
      const todaysWishes = this.wishes.filter(
        (wish) =>
          !wish.archived &&
          wish.date === currentDate &&
          wish.time === currentTime
      );

      for (const wish of todaysWishes) {
        try {
          await this.sendMessage(wish.jid, wish.message);
          console.log(`Wish sent to ${wish.jid} (ID: ${wish.id})`);

          // Archive the wish after sending
          wish.archived = true;
          wish.archived_at = new Date().toISOString();
          wish.sent_at = new Date().toISOString();

          this.logActivity({
            type: "wish_sent",
            wish_id: wish.id,
            recipient: wish.jid,
            message: wish.message,
          });
        } catch (error) {
          console.error(`Error sending wish (ID: ${wish.id}):`, error);
        }
      }

      // Check group wishes
      const todaysGroupWishes = this.groupWishes.filter(
        (wish) => wish.date === currentDate && wish.time === currentTime
      );

      for (const groupWish of todaysGroupWishes) {
        try {
          const group = this.userGroups[groupWish.groupName];
          if (group && group.members.length > 0) {
            let sentCount = 0;

            for (const member of group.members) {
              try {
                await this.sendMessage(member.jid, groupWish.message);
                sentCount++;
              } catch (error) {
                console.error(
                  `Error sending group wish to ${member.jid}:`,
                  error
                );
              }
            }

            console.log(
              `Group wish sent to ${sentCount}/${group.members.length} members of "${groupWish.groupName}" (ID: ${groupWish.id})`
            );

            // Remove the group wish after sending
            const index = this.groupWishes.findIndex(
              (w) => w.id === groupWish.id
            );
            if (index > -1) {
              this.groupWishes.splice(index, 1);
            }

            this.logActivity({
              type: "group_wish_sent",
              group_wish_id: groupWish.id,
              group: groupWish.groupName,
              sent_count: sentCount,
              total_members: group.members.length,
            });
          }
        } catch (error) {
          console.error(
            `Error sending group wish (ID: ${groupWish.id}):`,
            error
          );
        }
      }

      // Save changes
      if (todaysWishes.length > 0) {
        this.saveWishes();
      }
      if (todaysGroupWishes.length > 0) {
        this.saveGroupWishes();
      }

      // Notify owner if wishes were sent
      const totalSent = todaysWishes.length + todaysGroupWishes.length;
      if (totalSent > 0) {
        await this.sendMessage(
          OWNER_NUMBER,
          `🎉 Sent ${totalSent} scheduled wishes at ${currentTime} on ${currentDate}!`
        );
      }
    } catch (error) {
      console.error("Error checking scheduled wishes:", error);
    }
  }

  // Utility method to get formatted date and time
  getCurrentDateTime() {
    const now = new Date();
    return {
      date: `${now.getDate().toString().padStart(2, "0")}/${(now.getMonth() + 1)
        .toString()
        .padStart(2, "0")}`,
      time: `${now.getHours().toString().padStart(2, "0")}:${now
        .getMinutes()
        .toString()
        .padStart(2, "0")}`,
      full: now.toISOString(),
    };
  }

  // Method to backup all data
  async backupData() {
    try {
      const backupData = {
        wishes: this.wishes,
        groupWishes: this.groupWishes,
        userGroups: this.userGroups,
        whitelist: this.whitelist,
        botConfig: this.botConfig,
        backup_date: new Date().toISOString(),
      };

      const backupFileName = `backup_${Date.now()}.json`;
      const backupPath = path.join(__dirname, "backups", backupFileName);

      // Create backups directory if it doesn't exist
      const backupDir = path.join(__dirname, "backups");
      if (!fs.existsSync(backupDir)) {
        fs.mkdirSync(backupDir, { recursive: true });
      }

      fs.writeFileSync(backupPath, JSON.stringify(backupData, null, 2));
      console.log(`Backup created: ${backupFileName}`);

      return backupFileName;
    } catch (error) {
      console.error("Error creating backup:", error);
      return null;
    }
  }

  // Method to restore data from backup
  async restoreData(backupFileName) {
    try {
      const backupPath = path.join(__dirname, "backups", backupFileName);

      if (!fs.existsSync(backupPath)) {
        throw new Error("Backup file not found");
      }

      const backupData = JSON.parse(fs.readFileSync(backupPath, "utf8"));

      this.wishes = backupData.wishes || [];
      this.groupWishes = backupData.groupWishes || [];
      this.userGroups = backupData.userGroups || {};
      this.whitelist = backupData.whitelist || [OWNER_NUMBER];
      this.botConfig = backupData.botConfig || {
        active: true,
        lastActivity: new Date().toISOString(),
      };

      // Save restored data
      this.saveWishes();
      this.saveGroupWishes();
      this.saveUserGroups();
      this.saveWhitelist();
      this.saveBotConfig();

      console.log(`Data restored from backup: ${backupFileName}`);
      return true;
    } catch (error) {
      console.error("Error restoring backup:", error);
      return false;
    }
  }
}

// Create and start the bot
const bot = new EnhancedWhatsAppBot();

// Graceful shutdown with backup
process.on("SIGINT", async () => {
  console.log("Shutting down bot...");

  // Create backup before shutdown
  const backupFile = await bot.backupData();
  if (backupFile) {
    console.log(`Backup created before shutdown: ${backupFile}`);
  }

  process.exit(0);
});

// Handle uncaught exceptions
process.on("uncaughtException", (error) => {
  console.error("Uncaught Exception:", error);
  // Create emergency backup
  bot.backupData().then(() => {
    process.exit(1);
  });
});

// Handle unhandled promise rejections
process.on("unhandledRejection", (reason, promise) => {
  console.error("Unhandled Rejection at:", promise, "reason:", reason);
  // Create emergency backup
  bot.backupData().then(() => {
    process.exit(1);
  });
});
