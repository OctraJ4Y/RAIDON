import dotenv from 'dotenv';
dotenv.config();

export const TOKEN = process.env.DISCORD_TOKEN;
export const SUPABASE_URL = process.env.SUPABASE_URL;
export const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;
export const TEST_GUILD_ID = process.env.TEST_GUILD_ID;