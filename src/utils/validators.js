// src/utils/validators.js
class Validators {
  static validateDateFormat(date) {
    const dateRegex = /^(\d{2})\/(\d{2})\/(\d{4})$/;
    if (!dateRegex.test(date)) return false;

    const [day, month, year] = date.split("/").map(Number);
    const isValidDate = !isNaN(new Date(`${year}-${month}-${day}`).getTime());
    return isValidDate;
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
        .padStart(2, "0")}/${now.getFullYear()}`,
      time: `${now.getHours().toString().padStart(2, "0")}:${now
        .getMinutes()
        .toString()
        .padStart(2, "0")}`,
      full: now.toISOString(),
    };
  }
}

module.exports = Validators;
