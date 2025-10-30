const SUPABASE_URL = 'https://negfiesrxejowqjmuwxn.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5lZ2ZpZXNyeGVqb3dxam11d3huIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjE1NjkyNzAsImV4cCI6MjA3NzE0NTI3MH0.IRqGb-_RXqyuDe53G2L9gb0rC4WPmWBtvuaA-GSWs5w';

async function fetchAPI(endpoint) {
  const url = `${SUPABASE_URL}/functions/v1/${endpoint}?t=${Date.now()}`;

  try {
    const response = await fetch(url, {
      method: 'GET',
      cache: 'no-cache', // <-- WICHTIG: Nur hier!
      headers: {
        'apikey': SUPABASE_ANON_KEY,
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        // KEIN Cache-Control!
        // KEIN Pragma!
      },
    });

    console.log(`[API] ${endpoint} → Status: ${response.status}`);

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    return await response.json();
  } catch (err) {
    console.error(`[API] ${endpoint} failed:`, err);
    return null;
  }
}

// === STATUS ===
async function updateStatus() {
  const data = await fetchAPI('bot-status');
  if (!data?.status) return;

  const config = {
    online: { color: 'bg-green-500', text: 'ONLINE' },
    offline: { color: 'bg-gray-600', text: 'OFFLINE' },
    standby: { color: 'bg-yellow-500', text: 'STANDBY' },
  }[data.status] || { color: 'bg-gray-600', text: 'OFFLINE' };

  document.getElementById('statusText').textContent = config.text;
  document.getElementById('statusDot').className = 
    `absolute -bottom-3 -right-3 w-9 h-9 ${config.color} rounded-full border-4 border-[#0a0a10] shadow-2xl animate-pulse-deep`;
}

// === STATS ===
function animateCount(id, target) {
  const el = document.getElementById(id);
  if (!el) return;

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

async function updateStats() {
  const data = await fetchAPI('bot-stats');
  if (!data) {
    console.warn('Using fallback stats');
    animateCount('live-users', 1);
    animateCount('live-servers', 1);
    animateCount('live-top-level', 1);
    return;
  }

  const users = parseInt(data.users, 10) || 1;
  const servers = parseInt(data.servers, 10) || 1;
  const topLevel = parseInt(data.topLevel, 10) || 1;

  console.log(`[STATS] → Users: ${users}, Servers: ${servers}, Top: ${topLevel}`);

  animateCount('live-users', users);
  animateCount('live-servers', servers);
  animateCount('live-top-level', topLevel);
  
  
}

// === INIT ===
let initialized = false;
document.addEventListener('DOMContentLoaded', () => {
  if (initialized) return;
  initialized = true;

  console.log('[RAIDON] Starting...');
  updateStatus();
  updateStats();

  setInterval(updateStatus, 15000);
  setInterval(updateStats, 20000);
});


async function updateStats() {
  try {
    const res = await fetch('https://negfiesrxejowqjmuwxn.supabase.co/functions/v1/bot-stats?t=' + Date.now(), {
      cache: 'no-cache'
    });
    const data = await res.json();

    console.log('[WEBSITE] Geladene Stats:', data);

    animateCount('live-users', data.users || 0);
    animateCount('live-servers', data.servers || 0);
    animateCount('live-top-level', data.topLevel || 0);
  } catch (err) {
    console.error('Stats-Fehler:', err);
  }
}

// Beim Laden + alle 15s

document.addEventListener('DOMContentLoaded', () => {
  updateStats();
  setInterval(updateStats, 15000);
});