// WhatsApp Scheduler Bot - ES Module Version
// This bot sends automated wishes based on scheduled dates and times
// It handles repeating events and archives completed non-repeating events
// Bot commands can be sent directly in WhatsApp

import { promises as fs } from "fs";
import path from "path";
import pkg from "whatsapp-web.js";
const { Client, LocalAuth, MessageMedia } = pkg;
import qrcode from "qrcode-terminal";
import schedule from "node-schedule";
import moment from "moment";
import { fileURLToPath } from "url";
import { dirname } from "path";
import readline from "readline";

// Get __dirname equivalent in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// File paths
const EVENTS_FILE = path.join(__dirname, "events.json");
const ARCHIVED_FILE = path.join(__dirname, "archived-events.json");

// Bot configuration
const PREFIX = "Soul,"; // Command prefix
const ADMIN_NUMBER = process.env.ADMIN_NUMBER || ""; // Set your number in environment variable or here

// Initialize WhatsApp client
const client = new Client({
  authStrategy: new LocalAuth(),
  puppeteer: {
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  },
});

// Initialize conversation state
let conversationState = {};

// Initialize readline interface for CLI
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

// Generate QR code for WhatsApp Web authentication
client.on("qr", (qr) => {
  console.log("QR CODE GENERATED. Scan the QR code with your WhatsApp:");
  qrcode.generate(qr, { small: true });
});

// Bot ready event
client.on("ready", () => {
  console.log("WhatsApp Bot is ready!");
  initializeScheduler();
  displayMenu();
});

// Handle WhatsApp messages
client.on("message", async (msg) => {
  // Only process messages starting with the bot prefix
  if (!msg.body.startsWith(PREFIX)) return;

  const command = msg.body.slice(PREFIX.length).trim().toLowerCase();
  const sender = msg.from;

  console.log(`Command received: ${command} from ${sender}`);

  // Parse the command
  if (command === "help") {
    await msg.reply(
      "🤖 *WhatsApp Scheduler Bot Commands*\n\n" +
        "Soul, help - Show this help message\n" +
        "Soul, add_event - Start the process to add a new event\n" +
        "Soul, list_events - Show all scheduled events\n" +
        "Soul, list_archived - Show all archived events\n" +
        "Soul, delete_event [id] - Delete event with specific ID\n" +
        "Soul, cancel - Cancel current operation"
    );
  } else if (command === "add_event") {
    // Start conversation flow for adding an event
    conversationState[sender] = {
      action: "add_event",
      step: "phone_number",
      eventData: {},
    };

    await msg.reply(
      "📅 *Adding New Event*\n\n" +
        "Please provide the following information.\n\n" +
        "Enter the phone number with country code (e.g., 911234567890):"
    );
  } else if (command === "list_events") {
    const events = await loadEvents();

    if (events.length === 0) {
      await msg.reply("No events scheduled.");
      return;
    }

    let response = "📋 *Scheduled Events*\n\n";
    events.forEach((event) => {
      response += `*ID:* ${event.id}\n`;
      response += `*To:* ${event.phoneNumber}\n`;
      response += `*Message:* ${event.message}\n`;
      response += `*Date:* ${event.date} at ${event.time}\n`;
      response += `*Repeat:* ${event.repeat || "None"}\n`;
      response += "-------------------------\n";
    });

    await msg.reply(response);
  } else if (command === "list_archived") {
    const archivedEvents = await loadArchivedEvents();

    if (archivedEvents.length === 0) {
      await msg.reply("No archived events found.");
      return;
    }

    let response = "🗄️ *Archived Events*\n\n";
    archivedEvents.forEach((event) => {
      response += `*ID:* ${event.id}\n`;
      response += `*To:* ${event.phoneNumber}\n`;
      response += `*Message:* ${event.message}\n`;
      response += `*Date:* ${event.date} at ${event.time}\n`;
      response += `*Sent at:* ${new Date(event.sentAt).toLocaleString()}\n`;
      response += "-------------------------\n";
    });

    await msg.reply(response);
  } else if (command.startsWith("delete_event")) {
    // Extract ID from command
    const idStr = command.split(" ")[1];
    const id = parseInt(idStr);

    if (isNaN(id)) {
      await msg.reply(
        "⚠️ Please provide a valid event ID. Example: Soul, delete_event 3"
      );
      return;
    }

    try {
      await deleteEvent(id);
      await msg.reply(`✅ Event with ID ${id} has been deleted.`);
    } catch (error) {
      await msg.reply(`⚠️ Error: ${error.message}`);
    }
  } else if (command === "cancel") {
    delete conversationState[sender];
    await msg.reply("❌ Operation cancelled.");
  } else {
    // Handle ongoing conversation
    if (conversationState[sender]) {
      const convo = conversationState[sender];

      if (convo.action === "add_event") {
        await handleAddEventConversation(msg, convo, conversationState);
      }
    } else {
      await msg.reply(
        "⚠️ Unknown command. Type Soul, help to see available commands."
      );
    }
  }
});

// Handle add_event conversation flow
async function handleAddEventConversation(msg, convo, conversationState) {
  const sender = msg.from;
  const response = msg.body;

  // Process based on current step
  switch (convo.step) {
    case "phone_number":
      convo.eventData.phoneNumber = response;
      convo.step = "message";
      await msg.reply("Enter the message to send:");
      break;

    case "message":
      convo.eventData.message = response;
      convo.step = "date";
      await msg.reply("Enter the date (DD/MM/YYYY):");
      break;

    case "date":
      // Validate date format
      if (!/^\d{2}\/\d{2}\/\d{4}$/.test(response)) {
        await msg.reply(
          "⚠️ Invalid date format. Please use DD/MM/YYYY format:"
        );
        return;
      }
      convo.eventData.date = response;
      convo.step = "time";
      await msg.reply("Enter the time (HH:MM in 24h format):");
      break;

    case "time":
      // Validate time format
      if (!/^\d{2}:\d{2}$/.test(response)) {
        await msg.reply(
          "⚠️ Invalid time format. Please use HH:MM format (24-hour):"
        );
        return;
      }
      convo.eventData.time = response;
      convo.step = "repeat";
      await msg.reply(
        "Should this event repeat? Reply with one option: none, daily, weekly, monthly, yearly"
      );
      break;

    case "repeat":
      const validOptions = ["none", "daily", "weekly", "monthly", "yearly"];
      const repeatOption = response.toLowerCase();

      if (!validOptions.includes(repeatOption)) {
        await msg.reply(
          "⚠️ Invalid option. Please choose: none, daily, weekly, monthly, or yearly"
        );
        return;
      }

      if (repeatOption !== "none") {
        convo.eventData.repeat = repeatOption;
      }

      // Add the event
      try {
        const newEvent = await addEvent(convo.eventData);
        await msg.reply(
          `✅ Event added successfully!\n\n*ID:* ${newEvent.id}\n*Message:* ${
            newEvent.message
          }\n*Date:* ${newEvent.date} at ${newEvent.time}\n*Repeat:* ${
            newEvent.repeat || "None"
          }`
        );
      } catch (error) {
        await msg.reply(`⚠️ Error adding event: ${error.message}`);
      }

      // Clear conversation state
      delete conversationState[sender];
      break;

    default:
      await msg.reply(
        "⚠️ Something went wrong. Please try again with Soul, add_event"
      );
      delete conversationState[sender];
  }
}

// Load events from the JSON file
async function loadEvents() {
  try {
    const data = await fs.readFile(EVENTS_FILE, "utf8");
    return JSON.parse(data);
  } catch (error) {
    console.log("No existing events file found. Creating a new one.");
    await fs.writeFile(EVENTS_FILE, JSON.stringify([], null, 2));
    return [];
  }
}

// Load archived events from the JSON file
async function loadArchivedEvents() {
  try {
    const data = await fs.readFile(ARCHIVED_FILE, "utf8");
    return JSON.parse(data);
  } catch (error) {
    console.log("No existing archived events file found. Creating a new one.");
    await fs.writeFile(ARCHIVED_FILE, JSON.stringify([], null, 2));
    return [];
  }
}

// Save events to the JSON file
async function saveEvents(events) {
  await fs.writeFile(EVENTS_FILE, JSON.stringify(events, null, 2));
}

// Save archived events to the JSON file
async function saveArchivedEvents(events) {
  await fs.writeFile(ARCHIVED_FILE, JSON.stringify(events, null, 2));
}

// Schedule all events
async function initializeScheduler() {
  const events = await loadEvents();

  // Clear all existing schedules
  schedule.gracefulShutdown();

  // Schedule each event
  events.forEach((event) => {
    scheduleEvent(event);
  });

  console.log(`Scheduled ${events.length} events`);
}

// Schedule a single event
function scheduleEvent(event) {
  const { id, date, time, phoneNumber, message, repeat } = event;

  // Parse the date and time
  const [day, month, year] = date.split("/");
  const [hour, minute] = time.split(":");

  // Create a date object
  const eventDate = new Date(year, month - 1, day, hour, minute);

  // Skip if the event date is in the past and not repeating
  if (eventDate < new Date() && !repeat) {
    console.log(`Event ${id} has passed and will not be scheduled: ${message}`);
    return;
  }

  // Create a cron expression for the job
  let cronExpression;

  if (repeat === "yearly") {
    // For yearly events (like birthdays): At specific time on specific day of specific month
    cronExpression = `${minute} ${hour} ${day} ${month} *`;
  } else if (repeat === "monthly") {
    // For monthly events: At specific time on specific day of every month
    cronExpression = `${minute} ${hour} ${day} * *`;
  } else if (repeat === "weekly") {
    // For weekly events: At specific time on a specific day of the week
    const dayOfWeek = new Date(eventDate).getDay();
    cronExpression = `${minute} ${hour} * * ${dayOfWeek}`;
  } else if (repeat === "daily") {
    // For daily events: At specific time every day
    cronExpression = `${minute} ${hour} * * *`;
  } else {
    // For one-time events: Exact date and time
    cronExpression = `${minute} ${hour} ${day} ${month} *`;
    // Make sure the event is in the future
    if (eventDate < new Date()) {
      console.log(`One-time event ${id} has passed and will not be scheduled`);
      return;
    }
  }

  // Schedule the job
  const job = schedule.scheduleJob(id.toString(), cronExpression, async () => {
    try {
      console.log(`Sending message for event: ${message} to ${phoneNumber}`);

      // Format phone number (remove any non-numeric characters and add @c.us suffix)
      const formattedNumber = `${phoneNumber.replace(/\D/g, "")}@c.us`;

      // Add a small delay to ensure WhatsApp client is ready
      await new Promise((resolve) => setTimeout(resolve, 1000));

      // Check if client is ready before sending
      if (!client.info) {
        console.error(`WhatsApp client not ready for event ${id}`);
        return;
      }

      // Send the message with error handling
      try {
        await client.sendMessage(formattedNumber, message);
        console.log(`✅ Message sent successfully to ${phoneNumber}`);

        // Handle event after sending (only if message was sent successfully)
        await handleEventAfterSending(event);
      } catch (sendError) {
        console.error(
          `Failed to send message for event ${id}:`,
          sendError.message
        );

        // If it's a serialization error but message might have been sent,
        // don't handle the event (to avoid archiving prematurely)
        if (sendError.message.includes("serialize")) {
          console.log(
            `⚠️ Serialization error for event ${id}, but message may have been sent`
          );
        }
      }
    } catch (error) {
      console.error(`Error in scheduled job for event ${id}:`, error.message);

      // Notify admin about the error (only if admin number is set and client is ready)
      if (ADMIN_NUMBER && client.info) {
        try {
          const adminNumber = `${ADMIN_NUMBER.replace(/\D/g, "")}@c.us`;
          await client.sendMessage(
            adminNumber,
            `⚠️ *Error sending scheduled message*\n\n` +
              `*Event ID:* ${id}\n` +
              `*To:* ${phoneNumber}\n` +
              `*Error:* ${error.message}`
          );
        } catch (adminError) {
          console.error(`Failed to notify admin:`, adminError.message);
        }
      }
    }
  });

  console.log(
    `Scheduled event ${id}: ${message} for ${date} at ${time}, repeat: ${
      repeat || "none"
    }`
  );
}

// Handle event after sending message (archive or update)
async function handleEventAfterSending(event) {
  const events = await loadEvents();

  if (!event.repeat) {
    // For non-repeating events, archive it
    const archivedEvents = await loadArchivedEvents();
    const eventToArchive = {
      ...event,
      sentAt: new Date().toISOString(),
    };

    archivedEvents.push(eventToArchive);
    await saveArchivedEvents(archivedEvents);

    // Remove from active events
    const updatedEvents = events.filter((e) => e.id !== event.id);
    await saveEvents(updatedEvents);

    console.log(`Archived event ${event.id}: ${event.message}`);

    // Notify admin (if configured)
    if (ADMIN_NUMBER) {
      const adminNumber = `${ADMIN_NUMBER.replace(/\D/g, "")}@c.us`;
      await client.sendMessage(
        adminNumber,
        `✅ *Event Completed and Archived*\n\n` +
          `*ID:* ${event.id}\n` +
          `*To:* ${event.phoneNumber}\n` +
          `*Message:* ${event.message}\n` +
          `*Date:* ${event.date} at ${event.time}`
      );
    }
  } else {
    // For repeating events, update the next occurrence if needed
    const eventIndex = events.findIndex((e) => e.id === event.id);
    if (eventIndex !== -1) {
      if (event.repeat === "yearly") {
        // Update the year for next occurrence
        const [day, month, year] = event.date.split("/");
        const updatedYear = parseInt(year) + 1;
        events[eventIndex].date = `${day}/${month}/${updatedYear}`;

        // Notify admin (if configured)
        if (ADMIN_NUMBER) {
          const adminNumber = `${ADMIN_NUMBER.replace(/\D/g, "")}@c.us`;
          await client.sendMessage(
            adminNumber,
            `🔄 *Yearly Event Updated*\n\n` +
              `*ID:* ${event.id}\n` +
              `*Message:* ${event.message}\n` +
              `*New Date:* ${events[eventIndex].date} at ${event.time}\n` +
              `*Status:* Scheduled for next year`
          );
        }
      }
      // Note: For monthly, weekly, and daily events, we don't need to update the date
      // as the cron scheduler will handle the repetition automatically

      await saveEvents(events);
      console.log(`Updated repeating event ${event.id} for next occurrence`);
    }
  }
}

// Add a new event
async function addEvent(event) {
  const events = await loadEvents();
  const newEvent = {
    id: events.length > 0 ? Math.max(...events.map((e) => e.id)) + 1 : 1,
    ...event,
  };

  events.push(newEvent);
  await saveEvents(events);

  // Schedule the new event
  scheduleEvent(newEvent);

  // Notify admin (if configured and not the one who added the event)
  if (ADMIN_NUMBER && event.phoneNumber !== ADMIN_NUMBER) {
    const adminNumber = `${ADMIN_NUMBER.replace(/\D/g, "")}@c.us`;
    await client.sendMessage(
      adminNumber,
      `➕ *New Event Added*\n\n` +
        `*ID:* ${newEvent.id}\n` +
        `*To:* ${newEvent.phoneNumber}\n` +
        `*Message:* ${newEvent.message}\n` +
        `*Date:* ${newEvent.date} at ${newEvent.time}\n` +
        `*Repeat:* ${newEvent.repeat || "None"}`
    );
  }

  return newEvent;
}

// Delete an event
async function deleteEvent(id) {
  const events = await loadEvents();
  const eventToDelete = events.find((event) => event.id === id);

  if (!eventToDelete) {
    throw new Error(`Event with ID ${id} not found`);
  }

  const updatedEvents = events.filter((event) => event.id !== id);
  await saveEvents(updatedEvents);

  // Cancel the scheduled job
  const job = schedule.scheduledJobs[id.toString()];
  if (job) {
    job.cancel();
  }

  // Notify admin (if configured)
  if (ADMIN_NUMBER) {
    const adminNumber = `${ADMIN_NUMBER.replace(/\D/g, "")}@c.us`;
    await client.sendMessage(
      adminNumber,
      `🗑️ *Event Deleted*\n\n` +
        `*ID:* ${eventToDelete.id}\n` +
        `*To:* ${eventToDelete.phoneNumber}\n` +
        `*Message:* ${eventToDelete.message}\n` +
        `*Date:* ${eventToDelete.date} at ${eventToDelete.time}`
    );
  }

  return id;
}

// CLI Menu Functions
function displayMenu() {
  console.log("\n===== WhatsApp Scheduler Bot =====");
  console.log("1. Add Event");
  console.log("2. List Events");
  console.log("3. Delete Event");
  console.log("4. List Archived Events");
  console.log("5. Exit");
  console.log("==================================");

  rl.question("Choose an option: ", (choice) => {
    switch (choice) {
      case "1":
        addEventCLI();
        break;
      case "2":
        listEventsCLI();
        break;
      case "3":
        deleteEventCLI();
        break;
      case "4":
        listArchivedEventsCLI();
        break;
      case "5":
        console.log("Goodbye!");
        process.exit(0);
        break;
      default:
        console.log("Invalid choice. Please try again.");
        displayMenu();
    }
  });
}

async function addEventCLI() {
  console.log("\n===== Add New Event =====");
  const event = {};

  event.phoneNumber = await askQuestion(
    "Enter phone number with country code (e.g., 911234567890): "
  );
  event.message = await askQuestion("Enter message: ");
  event.date = await askQuestion("Enter date (DD/MM/YYYY): ");
  event.time = await askQuestion("Enter time (HH:MM in 24h format): ");

  const repeatOption = await askQuestion(
    "Repeat event? (none/daily/weekly/monthly/yearly): "
  );
  if (repeatOption !== "none") {
    event.repeat = repeatOption;
  }

  try {
    const newEvent = await addEvent(event);
    console.log(`Event added with ID: ${newEvent.id}`);
  } catch (error) {
    console.log(`Error adding event: ${error.message}`);
  }

  displayMenu();
}

async function listEventsCLI() {
  const events = await loadEvents();

  if (events.length === 0) {
    console.log("No events scheduled");
  } else {
    console.log("\n===== Scheduled Events =====");
    events.forEach((event) => {
      console.log(`ID: ${event.id}`);
      console.log(`To: ${event.phoneNumber}`);
      console.log(`Message: ${event.message}`);
      console.log(`Date: ${event.date} at ${event.time}`);
      console.log(`Repeat: ${event.repeat || "None"}`);
      console.log("-------------------------");
    });
  }

  displayMenu();
}

async function deleteEventCLI() {
  const events = await loadEvents();

  if (events.length === 0) {
    console.log("No events to delete");
    displayMenu();
    return;
  }

  console.log("\n===== Delete Event =====");
  events.forEach((event) => {
    console.log(
      `ID: ${event.id}, Message: ${event.message}, Date: ${event.date} at ${event.time}`
    );
  });

  const idStr = await askQuestion("Enter event ID to delete: ");
  const id = parseInt(idStr);

  try {
    await deleteEvent(id);
    console.log(`Event ${id} deleted`);
  } catch (error) {
    console.log(`Error: ${error.message}`);
  }

  displayMenu();
}

async function listArchivedEventsCLI() {
  const events = await loadArchivedEvents();

  if (events.length === 0) {
    console.log("No archived events");
  } else {
    console.log("\n===== Archived Events =====");
    events.forEach((event) => {
      console.log(`ID: ${event.id}`);
      console.log(`To: ${event.phoneNumber}`);
      console.log(`Message: ${event.message}`);
      console.log(`Date: ${event.date} at ${event.time}`);
      console.log(`Sent at: ${new Date(event.sentAt).toLocaleString()}`);
      console.log("-------------------------");
    });
  }

  displayMenu();
}

function askQuestion(question) {
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      resolve(answer);
    });
  });
}

// Initialize the bot
client.initialize();

// Export functions for testing
export { addEvent, deleteEvent, loadEvents, loadArchivedEvents, scheduleEvent };
