import { createClient } from '@supabase/supabase-js';
import { SUPABASE_URL, SUPABASE_ANON_KEY } from './config.js';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// --- Helper Functions ---
export const upsertUser = async (userId, guildId, username) => {
  const { data, error } = await supabase
    .from('users')
    .upsert({
      user_id: userId,
      guild_id: guildId,
      username,
      level: 1,
      xp: 0,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'user_id,guild_id' });

  if (error) console.error('upsertUser error:', error);
  return { data, error };
};

export const addXP = async (userId, guildId, amount) => {
  const { data, error } = await supabase.rpc('add_xp', {
    p_user_id: userId,
    p_guild_id: guildId,
    p_amount: amount,
  });
  return { data, error };
};

export const getUser = async (userId, guildId) => {
  const { data, error } = await supabase
    .from('users')
    .select('*')
    .eq('user_id', userId)
    .eq('guild_id', guildId)
    .single();
  return { data, error };
};

export const logWarn = async (guildId, modId, targetId, reason) => {
  const { data, error } = await supabase
    .from('moderation_logs')
    .insert({
      guild_id: guildId,
      moderator_id: modId,
      target_id: targetId,
      action: 'warn',
      reason,
    });
  return { data, error };
};

export const getWarns = async (targetId, guildId) => {
  const { data, error } = await supabase
    .from('moderation_logs')
    .select('*')
    .eq('target_id', targetId)
    .eq('guild_id', guildId)
    .order('created_at', { ascending: false })
    .limit(5);
  return { data, error };
};
// supabase.js – Ersetze deine getBotStats Funktion
export const getBotStats = async () => {
  try {
    // 1. Server-Anzahl (unique guilds)
    const { data: guildData, error: guildError } = await supabase
      .from('users')
      .select('guild_id');

    if (guildError) throw guildError;

    const serverCount = guildData && Array.isArray(guildData)
      ? new Set(guildData.map(u => u.guild_id)).size
      : 0;

    // 2. User-Anzahl
    const { count: userCount, error: countError } = await supabase
      .from('users')
      .select('*', { count: 'exact', head: true });

    if (countError) throw countError;

    // 3. Top-Level
    let topLevel = 1;
    const { data: topData, error: topError } = await supabase
      .from('users')
      .select('level')
      .order('level', { ascending: false })
      .limit(1);

    if (topError) {
      console.warn('Top-Level Fehler:', topError);
    } else if (topData && topData.length > 0) {
      topLevel = topData[0].level;
    }

    return {
      users: userCount || 0,
      servers: serverCount,
      topLevel,
    };
  } catch (err) {
    console.error('getBotStats Fehler:', err.message || err);
    return { users: 0, servers: 0, topLevel: 1 };
  }
};