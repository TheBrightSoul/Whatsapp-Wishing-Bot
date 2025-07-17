// src/utils/fileManager.js
const fs = require("fs");
const path = require("path");

class FileManager {
  static loadJSON(filePath, defaultValue = null) {
    try {
      if (fs.existsSync(filePath)) {
        const data = fs.readFileSync(filePath, "utf8");
        return JSON.parse(data);
      }
    } catch (error) {
      console.error(`Error loading ${filePath}:`, error);
    }
    return defaultValue;
  }

  static saveJSON(filePath, data) {
    try {
      // Ensure directory exists
      const dir = path.dirname(filePath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }

      fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
      return true;
    } catch (error) {
      console.error(`Error saving ${filePath}:`, error);
      return false;
    }
  }

  static ensureDirectoryExists(dirPath) {
    if (!fs.existsSync(dirPath)) {
      fs.mkdirSync(dirPath, { recursive: true });
    }
  }
}

module.exports = FileManager;
