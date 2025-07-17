// src/utils/validators.js
class Validators {
  static validateDateFormat(date) {
    const dateRegex = /^(\d{1,2})\/(\d{1,2})$/;
    return dateRegex.test(date);
  }

  static validateTimeFormat(time) {
    const timeRegex = /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/;
    return timeRegex.test(time);
  }

  static formatJID(jid) {
    return jid.includes("@s.whatsapp.net") ? jid : `${jid}@s.whatsapp.net`;
  }

  static getCurrentDateTime() {
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
}

module.exports = Validators;
