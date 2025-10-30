// js/script.js
// RAIDON – LIVE STATS, 401-FIXED, CORS-SICHER

const SUPABASE_URL = 'https://negfiesrxejowqjmuwxn.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5lZ2ZpZXNyeGVqb3dxam11d3huIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjE1NjkyNzAsImV4cCI6MjA3NzE0NTI3MH0.IRqGb-_RXqyuDe53G2L9gb0rC4WPmWBtvuaA-GSWs5w';

// === ANIMATE COUNT ===
function animateCount(id, target) {
  const el = document.getElementById(id);
  if (!el) {
    console.warn(`[ANIMATE] Element #${id} nicht gefunden!`);
    return;
  }

  let current = 0;
  const step = Math.max(1, Math.floor(target / 80));
  const timer = setInterval(() => {
    current += step;
    if (current >= target) {
      el.textContent = target.toLocaleString('de-DE');
      clearInterval(timer);
    } else {
      el.textContent = Math.floor(current).toLocaleString('de-DE');
    }
  }, 15);
}

// === LIVE STATS LADEN ===
async function updateStats() {
  try {
    const url = `${SUPABASE_URL}/functions/v1/bot-stats?t=${Date.now()}`;

    const response = await fetch(url, {
      method: 'GET',
      cache: 'no-cache',
      headers: {
        'apikey': SUPABASE_ANON_KEY,           // WICHTIG: Auth für Supabase!
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`, // WICHTIG!
        // KEIN Cache-Control → CORS-Sicher!
      },
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`HTTP ${response.status}: ${text}`);
    }

    const data = await response.json();

    console.log('[LIVE] Stats geladen:', data);

    animateCount('live-users', data.users || 0);
    animateCount('live-servers', data.servers || 0);
    animateCount('live-topLevel', data.topLevel || 0);

  } catch (error) {
    console.error('[LIVE] Fehler:', error);
  }
}

// === BOT STATUS ===
async function updateBotStatus() {
  try {
    const res = await fetch(`${SUPABASE_URL}/functions/v1/bot-status?t=${Date.now()}`, {
      cache: 'no-cache',
      headers: {
        'apikey': SUPABASE_ANON_KEY,
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
      },
    });

    if (!res.ok) return;

    const { status } = await res.json();
    const statusText = document.getElementById('statusText');
    const statusDot = document.getElementById('statusDot');

    if (statusText && statusDot) {
      const config = {
        online: { color: 'bg-green-500', text: 'ONLINE' },
        offline: { color: 'bg-gray-600', text: 'OFFLINE' },
        standby: { color: 'bg-yellow-500', text: 'STANDBY' },
      }[status] || { color: 'bg-gray-600', text: 'OFFLINE' };

      statusText.textContent = config.text;
      statusDot.className = `absolute -bottom-3 -right-3 w-9 h-9 ${config.color} rounded-full border-4 border-[#0a0a10] shadow-2xl animate-pulse-deep`;
    }
  } catch (err) {
    console.warn('Status-Fehler:', err);
  }
}

// === INIT ===
document.addEventListener('DOMContentLoaded', () => {
  console.log('[RAIDON] Starte Live-Update...');
  updateStats();
  updateBotStatus();
  setInterval(updateStats, 15000);
  setInterval(updateBotStatus, 15000);
});