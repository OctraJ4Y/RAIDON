import dotenv from "dotenv";
dotenv.config();

import {
  Client,
  GatewayIntentBits,
  Collection,
  Partials,
  ActivityType,
} from "discord.js";
import { readdirSync, statSync, existsSync } from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { TOKEN, TEST_GUILD_ID } from "./config.js";
import { getBotStats, supabase } from "./supabase.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
  partials: [Partials.Channel],
});

client.commands = new Collection();
client.cooldowns = new Collection();

// Hilfsfunktion: rekursiv alle JS-Dateien finden
function getCommandFiles(dir) {
  let files = [];
  if (!existsSync(dir)) return files;

  for (const file of readdirSync(dir)) {
    const filePath = path.join(dir, file);
    if (statSync(filePath).isDirectory()) {
      files = files.concat(getCommandFiles(filePath));
    } else if (file.endsWith(".js")) {
      files.push(filePath);
    }
  }
  return files;
}

// Commands laden
const commandFiles = getCommandFiles(path.join(__dirname, "commands"));
for (const filePath of commandFiles) {
  try {
    const commandModule = await import(`file://${filePath}`);
    const command = commandModule.default || commandModule; // default oder named export

    if (command && "data" in command && "execute" in command) {
      client.commands.set(command.data.name, command);
      console.log(`[LOAD] Command geladen: ${command.data.name}`);
    } else {
      console.warn(`[WARN] Die Command-Datei ${filePath} ist unvollständig.`);
    }
  } catch (err) {
    console.error(`[ERROR] Fehler beim Laden von ${filePath}:`, err);
  }
}

// Events laden (nur wenn Ordner existiert)
const eventsPath = path.join(__dirname, "events");
if (existsSync(eventsPath)) {
  const eventFiles = readdirSync(eventsPath).filter(f => f.endsWith(".js"));

  for (const filePath of eventFiles.map(f => path.join(eventsPath, f))) {
    try {
      const eventModule = await import(`file://${filePath}`);
      const event = eventModule.default || eventModule;

      if (!event || !event.name || !event.execute) {
        console.warn(`[WARN] Event-Datei ${filePath} ist unvollständig.`);
        continue;
      }

      if (event.once) {
        client.once(event.name, (...args) => event.execute(...args, client));
      } else {
        client.on(event.name, (...args) => event.execute(...args, client));
      }
    } catch (err) {
      console.error(`[ERROR] Fehler beim Laden von Event ${filePath}:`, err);
    }
  }
}

// Slash Command Handler
client.on("interactionCreate", async interaction => {
  if (!interaction.isChatInputCommand()) return;

  const command = client.commands.get(interaction.commandName);
  if (!command) return;

  try {
    await command.execute(interaction, client);
  } catch (error) {
    console.error(error);
    await interaction.reply({
      content: "❌ Es gab einen Fehler beim Ausführen dieses Befehls!",
      ephemeral: true,
    });
  }
});

// Bot Ready
client.once("ready", async c => {
  console.log(`✅ Bot ist online als ${c.user.tag}`);
  await updateStatus("online");

  // Commands registrieren
  try {
    const guild = client.guilds.cache.get(TEST_GUILD_ID);
    if (guild) {
      await guild.commands.set(client.commands.map(cmd => cmd.data));
      console.log(`📦 Commands in Test-Guild ${guild.name} registriert.`);
    } else {
      await client.application.commands.set(client.commands.map(cmd => cmd.data));
      console.log("🌍 Commands global registriert.");
    }
  } catch (err) {
    console.error("Fehler beim Registrieren der Commands:", err);
  }

  updateBotActivity(c);
  setInterval(() => updateBotActivity(c), 30_000);
});

client.on("shardDisconnect", () => updateStatus("offline"));
client.on("error", () => updateStatus("offline"));

// Funktionen
async function updateStatus(status) {
  try {
    await supabase.from("bot_status").insert({
      status,
      updated_at: new Date().toISOString(),
    });
  } catch (err) {
    console.error("❌ Fehler beim Update des Bot-Status:", err);
  }
}

async function updateBotActivity(client) {
  const { memberCount, commandCount } = await getBotStats(client);

  client.user.setPresence({
    activities: [
      {
        name: `/help | ${memberCount} User | ${commandCount} Commands`,
        type: ActivityType.Playing,
      },
    ],
    status: "online",
  });
}

// Start
client.login(TOKEN).catch(err => {
  console.error("Login fehlgeschlagen:", err);
  process.exit(1);
});