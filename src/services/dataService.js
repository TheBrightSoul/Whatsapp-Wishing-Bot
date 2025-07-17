// src/services/dataService.js
const FileManager = require("../utils/fileManager");
const config = require("../config/config");
const path = require("path");

class DataService {
  constructor() {
    this.wishes = this.loadWishes();
    this.groupWishes = this.loadGroupWishes();
    this.userGroups = this.loadUserGroups();
    this.whitelist = this.loadWhitelist();
    this.botConfig = this.loadBotConfig();
  }

  // Load methods
  loadWishes() {
    return FileManager.loadJSON(config.WISHES_FILE, []);
  }

  loadGroupWishes() {
    return FileManager.loadJSON(config.GROUP_WISHES_FILE, []);
  }

  loadUserGroups() {
    return FileManager.loadJSON(config.USER_GROUPS_FILE, {});
  }

  loadWhitelist() {
    return FileManager.loadJSON(config.WHITELIST_FILE, [config.OWNER_NUMBER]);
  }

  loadBotConfig() {
    return FileManager.loadJSON(config.BOT_CONFIG_FILE, {
      active: true,
      lastActivity: new Date().toISOString(),
    });
  }

  // Save methods
  saveWishes() {
    return FileManager.saveJSON(config.WISHES_FILE, this.wishes);
  }

  saveGroupWishes() {
    return FileManager.saveJSON(config.GROUP_WISHES_FILE, this.groupWishes);
  }

  saveUserGroups() {
    return FileManager.saveJSON(config.USER_GROUPS_FILE, this.userGroups);
  }

  saveWhitelist() {
    return FileManager.saveJSON(config.WHITELIST_FILE, this.whitelist);
  }

  saveBotConfig() {
    return FileManager.saveJSON(config.BOT_CONFIG_FILE, this.botConfig);
  }

  // Activity logging
  logActivity(activityData) {
    try {
      let logs = FileManager.loadJSON(config.LOG_FILE, []);

      logs.push({
        timestamp: new Date().toISOString(),
        ...activityData,
      });

      // Keep only last 1000 logs
      if (logs.length > 1000) {
        logs = logs.slice(-1000);
      }

      FileManager.saveJSON(config.LOG_FILE, logs);
    } catch (error) {
      console.error("Error logging activity:", error);
    }
  }

  // Backup and restore
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
      const backupDir = path.join(__dirname, "../backups");
      FileManager.ensureDirectoryExists(backupDir);

      const backupPath = path.join(backupDir, backupFileName);

      if (FileManager.saveJSON(backupPath, backupData)) {
        console.log(`Backup created: ${backupFileName}`);
        return backupFileName;
      }

      return null;
    } catch (error) {
      console.error("Error creating backup:", error);
      return null;
    }
  }

  async restoreData(backupFileName) {
    try {
      const backupPath = path.join(dirname, "../backups", backupFileName);
      const backupData = FileManager.loadJSON(backupPath);

      if (!backupData) {
        throw new Error("Backup file not found or invalid");
      }

      this.wishes = backupData.wishes || [];
      this.groupWishes = backupData.groupWishes || [];
      this.userGroups = backupData.userGroups || {};
      this.whitelist = backupData.whitelist || [config.OWNER_NUMBER];
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

module.exports = DataService;
