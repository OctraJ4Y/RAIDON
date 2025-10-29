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

const SUPABASE_URL = "https://negfiesrxejowqjmuwxn.supabase.co";
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY; // NICHT ANON_KEY!

client.on('messageCreate', async (message) => {
  if (message.author.bot) return;

  // Beispiel: XP +10, Coins +5
  const currentXP = 15;   // Aus deiner DB oder Cache
  const currentCoins = 10;
  const currentLevel = 1;

  try {
    await fetch(`${SUPABASE_URL}/functions/v1/update-user`, {
      method: "POST",
      headers: {
        "apikey": SERVICE_ROLE_KEY,
        "Authorization": `Bearer ${SERVICE_ROLE_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        discord_id: message.author.id,
        username: message.author.username,
        global_name: message.author.globalName,
        avatar: message.author.avatar,
        coins: currentCoins + 5,
        level: currentLevel,
        xp: currentXP + 10,
      }),
    });
  } catch (err) {
    console.error("User-Update fehlgeschlagen:", err);
  }

  // Dein Befehl hier...
  if (message.content === "!ping") {
    message.reply("Pong! Dein Profil wurde aktualisiert.");
  }
  client.once('ready', async () => {
  console.log(`Bot online: ${client.user.tag}`);

  for (const [id, member] of client.users.cache) {
    if (member.bot) continue;

    await fetch(`${SUPABASE_URL}/functions/v1/update-user`, {
      method: "POST",
      headers: {
        "apikey": SERVICE_ROLE_KEY,
        "Authorization": `Bearer ${SERVICE_ROLE_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        discord_id: member.id,
        username: member.username,
        global_name: member.globalName,
        avatar: member.avatar,
        coins: 0,
        level: 1,
        xp: 0,
      }),
    });
  }
});
});

// Start
client.login(TOKEN).catch(err => {
  console.error("Login fehlgeschlagen:", err);
  process.exit(1);
});



// === HELFER: User in DB eintragen ===
async function trackUser(user) {
  if (user.bot) return;

  try {
    await fetch(`${SUPABASE_URL}/functions/v1/update-user`, {
      method: "POST",
      headers: {
        "apikey": SERVICE_ROLE_KEY,
        "Authorization": `Bearer ${SERVICE_ROLE_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        discord_id: user.id,
        username: user.username,
        global_name: user.globalName,
        avatar: user.avatar,
      }),
    });
  } catch (err) {
    console.error("User-Tracking fehlgeschlagen:", err);
  }
}

// === 1. BEI NACHRICHT (schreibt) ===
client.on('messageCreate', async (message) => {
  if (message.author.bot) return;

  await trackUser(message.author); // SOFORT EINGETRAGEN

  // Dein Befehl hier...
  if (message.content === "!ping") {
    message.reply("Pong! Du bist jetzt in der DB.");
  }
});

// === 2. BEI REAKTION (reagiert) ===
client.on('messageReactionAdd', async (reaction, user) => {
  if (user.bot) return;

  await trackUser(user); // SOFORT EINGETRAGEN
});

// === 3. BEI JOIN (Server beitreten) ===
client.on('guildMemberAdd', async (member) => {
  if (member.user.bot) return;

  await trackUser(member.user); // SOFORT EINGETRAGEN
});

// === 4. BEI BOT-START (alle Member eintragen) ===
client.once('ready', async () => {
  console.log(`Bot online: ${client.user.tag}`);

  for (const [_, guild] of client.guilds.cache) {
    for (const [_, member] of guild.members.cache) {
      if (!member.user.bot) {
        await trackUser(member.user);
      }
    }
  }
});