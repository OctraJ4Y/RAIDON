// === KONFIGURATION ===
const SUPABASE_URL = 'https://negfiesrxejowqjmuwxn.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5lZ2ZpZXNyeGVqb3dxam11d3huIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjE1NjkyNzAsImV4cCI6MjA3NzE0NTI3MH0.IRqGb-_RXqyuDe53G2L9gb0rC4WPmWBtvuaA-GSWs5w';

// === HELFER: Fetch mit Headers (CORS-safe) ===
async function fetchSupabase(url) {
  return fetch(url, {
    method: 'GET',
    headers: {
      'apikey': SUPABASE_ANON_KEY,
      'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
    },
  });
}

// === 1. BOT STATUS BADGE ===
const statusText = document.getElementById('statusText');
const statusDot = document.getElementById('statusDot');

const STATUS_CONFIG = {
  online: { text: 'online', dot: 'bg-green-500', textColor: 'text-green-400', glow: 'shadow-green-500/50' },
  offline: { text: 'offline', dot: 'bg-gray-500', textColor: 'text-gray-400', glow: 'shadow-gray-500/50' },
  standby: { text: 'standby', dot: 'bg-yellow-500', textColor: 'text-yellow-400', glow: 'shadow-yellow-500/50' },
};

async function updateBotStatus() {
  try {
    const res = await fetchSupabase(`${SUPABASE_URL}/functions/v1/bot-status?t=${Date.now()}`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const { status } = await res.json();

    const cfg = STATUS_CONFIG[status] || STATUS_CONFIG.offline;
    statusText.textContent = cfg.text;
    statusText.className = `text-sm font-medium ${cfg.textColor}`;
    statusDot.className = `absolute bottom-0 right-0 w-4 h-4 ${cfg.dot} rounded-full border-2 border-gray-800 shadow-lg ${cfg.glow}`;
  } catch (err) {
    console.warn("Bot-Status-Fehler:", err);
    statusText.textContent = 'offline';
    statusText.className = 'text-sm font-medium text-gray-400';
    statusDot.className = 'absolute bottom-0 right-0 w-4 h-4 bg-gray-500 rounded-full border-2 border-gray-800 shadow-lg shadow-gray-500/50';
  }
}

// === 2. LIVE STATS ===
const STATS_API = `${SUPABASE_URL}/functions/v1/bot-stats`;
const FALLBACK = { users: 404, servers: 404, topLevel: 404 };

function animateValue(id, end, duration = 1500) {
  const el = document.getElementById(id);
  if (!el) return;
  let start = 0;
  const range = end - start;
  const step = Math.max(Math.floor(duration / range), 1);
  const timer = setInterval(() => {
    start += end > start ? 1 : -1;
    el.textContent = start.toLocaleString();
    if (start === end) clearInterval(timer);
  }, step);
}

async function updateLiveStats() {
  try {
    const res = await fetchSupabase(STATS_API);
    const stats = res.ok ? await res.json() : FALLBACK;
    animateValue('live-users', stats.users ?? FALLBACK.users);
    animateValue('live-servers', stats.servers ?? FALLBACK.servers);
    animateValue('live-top-level', stats.topLevel ?? FALLBACK.topLevel);
  } catch (err) {
    console.warn("Stats-Fehler:", err);
    animateValue('live-users', FALLBACK.users);
    animateValue('live-servers', FALLBACK.servers);
    animateValue('live-top-level', FALLBACK.topLevel);
  }
}

// === 3. AUTO SCROLL ===
let autoScrollInterval = null;
let isUserScrolling = false;
const SECTIONS = ['hero', 'stats', 'features'];
let currentIndex = 0;

function startAutoScroll() {
  if (autoScrollInterval) return;
  autoScrollInterval = setInterval(() => {
    if (isUserScrolling || document.getElementById('quickMenuPanel')?.classList.contains('open')) return;
    const target = document.getElementById(SECTIONS[currentIndex]);
    target?.scrollIntoView({ behavior: 'smooth' });
    currentIndex = (currentIndex + 1) % SECTIONS.length;
  }, 5000);
}

function stopAutoScroll() {
  clearInterval(autoScrollInterval);
  autoScrollInterval = null;
}

window.addEventListener('scroll', () => {
  isUserScrolling = true;
  stopAutoScroll();
  setTimeout(() => { isUserScrolling = false; startAutoScroll(); }, 3000);
}, { passive: true });

// === 4. QUICK MENU (FAB) ===
const fab = document.getElementById('quickMenuFab');
const panel = document.getElementById('quickMenuPanel');
const closeBtn = document.getElementById('closePanel');

fab?.addEventListener('click', () => {
  panel.classList.remove('hidden');
  panel.classList.add('open');
  fab.style.display = 'none';
  stopAutoScroll();
});

closeBtn?.addEventListener('click', () => {
  panel.classList.add('hidden');
  panel.classList.remove('open');
  fab.style.display = 'block';
  setTimeout(startAutoScroll, 1000);
});

panel?.addEventListener('click', (e) => {
  if (e.target === panel) {
    panel.classList.add('hidden');
    panel.classList.remove('open');
    fab.style.display = 'block';
    setTimeout(startAutoScroll, 1000);
  }
});

// === 5. DARK MODE ===
const darkModeToggle = document.getElementById('darkModeToggle');
const sunIcon = document.getElementById('sunIcon');
const moonIcon = document.getElementById('moonIcon');

const isDark = localStorage.getItem('darkMode') === 'true';
if (isDark) document.documentElement.classList.add('dark');
sunIcon.style.display = isDark ? 'none' : 'inline';
moonIcon.style.display = isDark ? 'inline' : 'none';

darkModeToggle?.addEventListener('click', () => {
  const currentlyDark = document.documentElement.classList.toggle('dark');
  localStorage.setItem('darkMode', currentlyDark);
  sunIcon.style.display = currentlyDark ? 'none' : 'inline';
  moonIcon.style.display = currentlyDark ? 'inline' : 'none';
});

// === 6. INIT ===
document.addEventListener('DOMContentLoaded', () => {
  updateBotStatus();
  updateLiveStats();
  setInterval(updateBotStatus, 15000);
  setInterval(updateLiveStats, 30000);
  setTimeout(startAutoScroll, 2000);
});