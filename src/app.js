// src/app.js (Main entry point)
const WhatsAppBot = require("./bot/whatsAppBot");

// Create and start the bot
const bot = new WhatsAppBot();

// Graceful shutdown handlers
process.on("SIGINT", async () => {
  await bot.shutdown();
});

process.on("uncaughtException", async (error) => {
  console.error("Uncaught Exception:", error);
  await bot.dataService.backupData();
  process.exit(1);
});

process.on("unhandledRejection", async (reason, promise) => {
  console.error("Unhandled Rejection at:", promise, "reason:", reason);
  await bot.dataService.backupData();
  process.exit(1);
});

console.log("Soul Bot starting...");
