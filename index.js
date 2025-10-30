import dotenv from "dotenv";
dotenv.config();

import { createClient } from '@supabase/supabase-js';
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

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// === SUPABASE (Service Role!) ===
const supabase = createClient(
  'https://negfiesrxejowqjmuwxn.supabase.co',
  process.env.SUPABASE_SERVICE_ROLE_KEY // NICHT anon!
);

// === DISCORD CLIENT ===
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMessageReactions,
  ],
  partials: [Partials.Message, Partials.Channel, Partials.Reaction],
});

client.commands = new Collection();
client.cooldowns = new Collection();

// === HELFER: Alle .js-Dateien rekursiv laden ===
function getFiles(dir, ext = ".js") {
  const files = [];
  if (!existsSync(dir)) return files;

  for (const file of readdirSync(dir)) {
    const filePath = path.join(dir, file);
    if (statSync(filePath).isDirectory()) {
      files.push(...getFiles(filePath, ext));
    } else if (file.endsWith(ext)) {
      files.push(filePath);
    }
  }
  return files;
}

// === COMMANDS LADEN ===
const commandFiles = getFiles(path.join(__dirname, "commands"));
for (const filePath of commandFiles) {
  try {
    const { default: command } = await import(`file://${filePath}`);
    if (command?.data?.name && command?.execute) {
      client.commands.set(command.data.name, command);
      console.log(`[CMD] ${command.data.name}`);
    } else {
      console.warn(`[WARN] Ungültig: ${filePath}`);
    }
  } catch (err) {
    console.error(`[ERROR] Command ${filePath}:`, err);
  }
}

// === EVENTS LADEN ===
const eventsPath = path.join(__dirname, "events");
if (existsSync(eventsPath)) {
  const eventFiles = getFiles(eventsPath);
  for (const filePath of eventFiles) {
    try {
      const { default: event } = await import(`file://${filePath}`);
      if (event?.name && event?.execute) {
        if (event.once) {
          client.once(event.name, (...args) => event.execute(...args, client));
        } else {
          client.on(event.name, (...args) => event.execute(...args, client));
        }
        console.log(`[EVENT] ${event.name}`);
      }
    } catch (err) {
      console.error(`[ERROR] Event ${filePath}:`, err);
    }
  }
}

// === SLASH COMMANDS ===
client.on("interactionCreate", async (interaction) => {
  if (!interaction.isChatInputCommand()) return;

  const command = client.commands.get(interaction.commandName);
  if (!command) return;

  try {
    await command.execute(interaction, client);
  } catch (error) {
    console.error(error);
    await interaction.reply({ content: "Fehler!", ephemeral: true }).catch(() => {});
  }
});

// === USER TRACKING HELFER ===
async function trackUser(user) {
  if (user.bot) return;

  try {
    await fetch("https://negfiesrxejowqjmuwxn.supabase.co/functions/v1/update-user", {
      method: "POST",
      headers: {
        "apikey": process.env.SUPABASE_SERVICE_ROLE_KEY,
        "Authorization": `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        discord_id: user.id,
        username: user.username,
        global_name: user.globalName,
        avatar: user.avatar,
        coins: 0,
        level: 1,
        xp: 0,
      }),
    });
  } catch (err) {
    console.error("User-Tracking fehlgeschlagen:", err);
  }
}

// === EVENTS FÜR USER-TRACKING ===
client.on('messageCreate', async (message) => {
  if (message.author.bot) return;
  await trackUser(message.author);

  // Beispiel: XP +10, Coins +5
  if (message.content === "!ping") {
    message.reply("Pong! Du bist in der DB.");
  }
});

client.on('messageReactionAdd', async (reaction, user) => {
  if (user.bot) return;
  await trackUser(user);
});

client.on('guildMemberAdd', async (member) => {
  if (member.user.bot) return;
  await trackUser(member.user);
});

// === BOT READY ===
client.once("ready", async (c) => {
  console.log(`Bot online: ${c.user.tag}`);

  // === ALLE MEMBER BEIM START EINTRAGEN ===
  for (const [_, guild] of c.guilds.cache) {
    for (const [_, member] of guild.members.cache) {
      if (!member.user.bot) {
        await trackUser(member.user);
      }
    }
  }

  // === SLASH COMMANDS REGISTRIEREN ===
  try {
    const commandsData = client.commands.map(cmd => cmd.data);
    const guild = c.guilds.cache.get(TEST_GUILD_ID);
    if (guild) {
      await guild.commands.set(commandsData);
      console.log(`Commands in ${guild.name} registriert.`);
    } else {
      await c.application.commands.set(commandsData);
      console.log("Globale Commands registriert.");
    }
  } catch (err) {
    console.error("Commands registrieren fehlgeschlagen:", err);
  }

  // === BOT STATUS & AKTIVITÄT ===
  await updateStatus("online");
  updateBotActivity(c);
  setInterval(() => updateBotActivity(c), 30_000);

  // === STATS UPLOAD ALLE 30s ===
  setInterval(async () => {
    try {
      // 1. Server & User
      const servers = c.guilds.cache.size;
      const users = c.users.cache.size;

      // 2. Max Level aus DB
      const { data: levelData, error } = await supabase
        .from('user_levels')
        .select('level')
        .order('level', { ascending: false })
        .limit(1);

      const topLevel = levelData?.[0]?.level || 1;

      const stats = { users, servers, top_level: topLevel };
      console.log('[STATS] Sende:', stats);

      const res = await fetch("https://negfiesrxejowqjmuwxn.supabase.co/functions/v1/update-stats", {
        method: "POST",
        headers: {
          "apikey": process.env.SUPABASE_SERVICE_ROLE_KEY,
          "Authorization": `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(stats),
      });

      if (!res.ok) {
        console.error('[STATS] Upload fehlgeschlagen:', await res.text());
      } else {
        console.log('[STATS] Erfolgreich hochgeladen');
      }
    } catch (err) {
      console.error('[STATS] Fehler:', err);
    }
  }, 30_000);
});

// === BOT STATUS UPDATE ===
async function updateStatus(status) {
  try {
    await supabase.from("bot_status").insert({
      status,
      updated_at: new Date().toISOString(),
    });
  } catch (err) {
    console.error("Status-Update fehlgeschlagen:", err);
  }
}

// === BOT AKTIVITÄT ===
async function updateBotActivity(c) {
  try {
    const { data } = await supabase
      .from('bot_stats')
      .select('users')
      .order('updated_at', { ascending: false })
      .limit(1)
      .single();

    const memberCount = data?.users || 0;

    c.user.setActivity(`/help | ${memberCount} User | ${client.commands.size} Commands`, {
      type: ActivityType.Playing,
    });
  } catch (err) {
    console.error("Aktivität-Update fehlgeschlagen:", err);
  }
}

// === SHUTDOWN ===
client.on("shardDisconnect", () => updateStatus("offline"));
client.on("error", () => updateStatus("offline"));

// === START ===
client.login(TOKEN).catch(err => {
  console.error("Login fehlgeschlagen:", err);
  process.exit(1);
});