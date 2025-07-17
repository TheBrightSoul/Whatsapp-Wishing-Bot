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
