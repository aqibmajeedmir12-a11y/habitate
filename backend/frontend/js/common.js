/* ══════════════════════════════════════
   COMMON.JS — Shared state, utilities, auth
══════════════════════════════════════ */

const API_BASE = window.location.origin.includes('localhost') ? 'http://localhost:3001' : window.location.origin;

/* ─── SHARED STATE ─── */
window.habits = [];
window.currentPage = "dashboard";
window.currentUser = null;
window.selectedDays = [];
window.selEmoji = "🧘‍♂️";
window.selColor = "#7c3aed";
window.editId = null;
window.nextId = 7;

window.emojis = ["🧘‍♂️", "📚", "💪", "🏃", "💧", "🧠", "🌙", "🥗", "🎨", "🎵", "💻", "🌿", "✍️", "🚿", "🎯", "🔥", "⭐", "🏃‍♀️"];
window.colors = ["#7c3aed", "#3b82f6", "#22c55e", "#f59e0b", "#ec4899", "#06b6d4", "#ef4444", "#f97316"];

window.settingsToggles = [
  { label: "Daily reminder notifications", key: "notif", on: true },
  { label: "Streak milestone alerts", key: "streak", on: true },
  { label: "Weekly AI insights email", key: "email", on: false },
  { label: "Achievement unlocked alerts", key: "ach", on: true },
  { label: "Motivational quotes", key: "quotes", on: true },
  { label: "Sound Effects (Ding!)", key: "sound", on: true },
  { label: "Haptic Feedback (Vibration)", key: "haptics", on: true }
];

window.achievements = [
  { icon: "🔥", name: "Week Warrior", desc: "Complete all habits for 7 days straight", tier: "gold", xp: 150, requiredStreak: 7, unlocked: false, progress: 0 },
  { icon: "📚", name: "Bookworm", desc: "Read for 30 days total", tier: "silver", xp: 120, requiredStreak: 30, unlocked: false, progress: 0 },
  { icon: "💧", name: "Hydration Hero", desc: "Hit water goal 14 days in a row", tier: "gold", xp: 150, requiredStreak: 14, unlocked: false, progress: 0 },
  { icon: "🌅", name: "Early Bird", desc: "Complete a habit before 7 AM, 10 times", tier: "silver", xp: 120, requiredStreak: 10, unlocked: false, progress: 0 },
  { icon: "⚡", name: "Speed Runner", desc: "Complete all habits before noon", tier: "bronze", xp: 80, requiredStreak: 5, unlocked: false, progress: 0 },
  { icon: "🎯", name: "Perfect Week", desc: "100% completion rate for a full week", tier: "gold", xp: 180, requiredStreak: 7, unlocked: false, progress: 0 },
  { icon: "💪", name: "Iron Will", desc: "30-day workout streak", tier: "silver", xp: 140, requiredStreak: 30, unlocked: false, progress: 0 },
  { icon: "🌟", name: "Habit Master", desc: "Maintain 5 habits for 30 days", tier: "gold", xp: 200, requiredStreak: 30, unlocked: false, progress: 0 },
  { icon: "🏔️", name: "Mountain Mover", desc: "Complete 500 total habits", tier: "gold", xp: 250, requiredStreak: 50, unlocked: false, progress: 0 },
  { icon: "🎖️", name: "Century Club", desc: "100-day streak on any habit", tier: "gold", xp: 300, requiredStreak: 100, unlocked: false, progress: 0 },
  { icon: "🌈", name: "Well Rounded", desc: "Complete habits in all 5 categories", tier: "silver", xp: 130, requiredStreak: 15, unlocked: false, progress: 0 },
  { icon: "🦁", name: "Consistency King", desc: "90% rate for 60 days", tier: "gold", xp: 220, requiredStreak: 60, unlocked: false, progress: 0 },
  { icon: "🚀", name: "Rocket Start", desc: "Complete all habits for first 7 days", tier: "bronze", xp: 90, requiredStreak: 7, unlocked: false, progress: 0 },
  { icon: "🧘", name: "Inner Peace", desc: "50 meditation sessions", tier: "silver", xp: 140, requiredStreak: 50, unlocked: false, progress: 0 },
  { icon: "💎", name: "Diamond Habit", desc: "365 day streak", tier: "gold", xp: 500, requiredStreak: 365, unlocked: false, progress: 0 }
];

/* ══════════════════════════════════════
   AUTHENTICATED FETCH WRAPPER
══════════════════════════════════════ */
async function fetchAuth(url, options = {}) {
  const token = localStorage.getItem("hab_token");
  if (!token) {
    if (window.location.pathname !== "/index.html") {
      doLogout();
    }
    return Promise.reject("No token found");
  }

  const headers = { ...options.headers };
  headers["Authorization"] = `Bearer ${token}`;
  if (!headers["Content-Type"] && !(options.body instanceof FormData)) {
    headers["Content-Type"] = "application/json";
  }

  const res = await fetch(url, { ...options, headers });

  if (res.status === 401) {
    doLogout();
    throw new Error("Unauthorized");
  }

  return res;
}

/* ══════════════════════════════════════
   UTILITY FUNCTIONS
══════════════════════════════════════ */
function easeOut(t) { return 1 - Math.pow(1 - t, 3); }

function animNum(id, tgt) {
  const el = document.getElementById(id);
  if (!el) return;
  const start = parseInt(el.textContent) || 0;
  const t0 = performance.now();
  const step = now => {
    const p = Math.min((now - t0) / 700, 1);
    el.textContent = Math.round(start + (tgt - start) * easeOut(p));
    if (p < 1) requestAnimationFrame(step);
  };
  requestAnimationFrame(step);
}

function showToast(msg) {
  const t = document.getElementById("toast");
  if (!t) return;
  document.getElementById("toast-msg").textContent = msg;
  t.classList.add("show");
  clearTimeout(t._t);
  t._t = setTimeout(() => t.classList.remove("show"), 3000);
}

function launchConfetti() {
  const cols = ["#7c3aed", "#3b82f6", "#22c55e", "#f59e0b", "#ec4899", "#06b6d4"];
  for (let i = 0; i < 28; i++) {
    setTimeout(() => {
      const el = document.createElement("div");
      el.className = "confetti";
      el.style.cssText = `left:${Math.random() * 100}vw;top:-10px;background:${cols[~~(Math.random() * cols.length)]};animation-duration:${1 + Math.random()}s;animation-delay:${Math.random() * .2}s;transform:rotate(${Math.random() * 360}deg)`;
      document.body.appendChild(el);
      setTimeout(() => el.remove(), 2000);
    }, i * 25);
  }
}

function createParticles() {
  const cols = ["rgba(124,58,237,.8)", "rgba(59,130,246,.8)", "rgba(6,182,212,.8)", "rgba(34,197,94,.8)"];
  for (let i = 0; i < 10; i++) {
    const el = document.createElement("div");
    el.className = "particle";
    const s = 3 + Math.random() * 5;
    el.style.cssText = `width:${s}px;height:${s}px;left:${Math.random() * 100}vw;background:${cols[~~(Math.random() * cols.length)]};animation-duration:${8 + Math.random() * 12}s;animation-delay:${Math.random() * 8}s`;
    document.body.appendChild(el);
  }
}

function showUnlock(name) {
  const div = document.createElement("div");
  div.className = "unlock-pop";
  div.textContent = "🏆 Achievement Unlocked: " + name;
  document.body.appendChild(div);

  if (getSetting("haptics")) triggerHaptic([100, 50, 100, 50, 200]);

  setTimeout(() => div.remove(), 3000);
}

/* ══════════════════════════════════════
   SENSORY FEEDBACK (Audio & Haptics)
══════════════════════════════════════ */
let audioCtx = null;

function playAudioSequence(type) {
  try {
    if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    if (audioCtx.state === 'suspended') audioCtx.resume();

    const playTone = (freq, typeStr, timeStart, duration) => {
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = typeStr;
      osc.frequency.setValueAtTime(freq, audioCtx.currentTime + timeStart);

      gain.gain.setValueAtTime(0.2, audioCtx.currentTime + timeStart);
      gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + timeStart + duration);

      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.start(audioCtx.currentTime + timeStart);
      osc.stop(audioCtx.currentTime + timeStart + duration);
    };

    if (type === "complete") {
      // Much more pleasant chime for completion
      playTone(523.25, 'sine', 0, 0.15); // C5
      playTone(659.25, 'sine', 0.1, 0.2); // E5
      playTone(783.99, 'sine', 0.2, 0.4); // G5 
    }
    else if (type === "uncomplete") {
      // Very soft UI dull thud
      playTone(200, 'triangle', 0, 0.1);
      playTone(180, 'triangle', 0.1, 0.15);
    }
    else if (type === "badge") {
      // Happy arpeggio
      playTone(523.25, 'sine', 0, 0.15); // C5
      playTone(659.25, 'sine', 0.15, 0.15); // E5
      playTone(783.99, 'sine', 0.3, 0.15); // G5
      playTone(1046.50, 'sine', 0.45, 0.5); // C6
    }
    else if (type === "click") {
      // Intentionally empty to remove annoying UI tap sounds
    }
  } catch (e) {
    console.error("Audio block:", e);
  }
}

let _notifInterval = null;
function startDailyReminderService() {
  if (_notifInterval) clearInterval(_notifInterval);
  _notifInterval = setInterval(() => {
    if (!getSetting("notif") || Notification.permission !== "granted") return;
    const now = new Date();
    // At exactly 6 PM, check if there are incomplete habits
    if (now.getHours() === 18 && now.getMinutes() === 0) {
      const incomplete = window.habits.filter(h => !h.done);
      if (incomplete.length > 0) {
        new Notification("Daily Habit Reminder", {
          body: `You still have ${incomplete.length} habit(s) to complete today! Finish strong!`,
          icon: "/favicon.ico"
        });
      }
    }
  }, 60000); // Check every minute
}
window.addEventListener("load", startDailyReminderService);

function triggerHaptic(pattern) {
  if ("vibrate" in navigator) {
    navigator.vibrate(pattern);
  }
}

function buildHeatmap(id, logs) {
  const container = document.getElementById(id);
  if (!container) return;
  const map = {};
  if (!Array.isArray(logs)) logs = [];
  logs.forEach(l => {
    const d = new Date(l.date);
    const key = d.toISOString().split("T")[0];
    map[key] = (map[key] || 0) + 1;
  });
  let html = '<div class="heatmap-grid"><div class="hm-labels">';
  ["", "M", "", "W", "", "F", ""].forEach(d => { html += `<div class="hm-dl">${d}</div>`; });
  html += "</div><div class=\"hm-weeks\">";
  for (let w = 0; w < 26; w++) {
    html += "<div class=\"hm-week\">";
    for (let d = 0; d < 7; d++) {
      const date = new Date();
      date.setDate(date.getDate() - (w * 7 + d));
      const key = date.toISOString().split("T")[0];
      const val = map[key] || 0;
      const level = val >= 4 ? 4 : val >= 3 ? 3 : val >= 2 ? 2 : val >= 1 ? 1 : 0;
      html += `<div class="hm-cell" data-l="${level}"></div>`;
    }
    html += "</div>";
  }
  html += "</div></div>";
  container.innerHTML = html;
}

async function renderWeekDots(id) {
  const el = document.getElementById(id);
  if (!el) return;

  const labels = ["M", "T", "W", "T", "F", "S", "S"];

  /* Build the last 7 dates starting from Monday of this week */
  const today = new Date();
  const todayDow = today.getDay(); // 0=Sun,1=Mon,...,6=Sat
  /* Monday = start of week */
  const monday = new Date(today);
  monday.setDate(today.getDate() - ((todayDow + 6) % 7));

  const weekDates = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    return d.getFullYear() + "-" +
      String(d.getMonth() + 1).padStart(2, "0") + "-" +
      String(d.getDate()).padStart(2, "0");
  });

  /* Fetch real logs from API */
  let activeDates = new Set();
  try {
    const res = await fetchAuth(`${API_BASE}/api/habits/analytics/logs`);
    const data = await res.json();
    const heatmap = data.heatmap || {};
    /* A day is "active" if at least 1 habit was completed */
    weekDates.forEach(d => { if (heatmap[d]) activeDates.add(d); });
  } catch (e) { /* fallback: show nothing */ }

  const todayStr = today.getFullYear() + "-" +
    String(today.getMonth() + 1).padStart(2, "0") + "-" +
    String(today.getDate()).padStart(2, "0");

  el.innerHTML = weekDates.map((dateStr, i) => {
    const isActive = activeDates.has(dateStr);
    const isToday = dateStr === todayStr;
    const isFuture = dateStr > todayStr;
    let cls = "wdot";
    if (isActive) cls += " on";
    if (isToday) cls += " today";
    if (isFuture) cls += " future";
    return `<div class="${cls}" title="${dateStr}">${labels[i]}</div>`;
  }).join("");
}

/* ══════════════════════════════════════
   HABIT DATA LOADING
══════════════════════════════════════ */
async function loadHabitsFromDB() {
  try {
    const res = await fetchAuth(`${API_BASE}/api/habits`);
    const data = await res.json();
    if (data.length >= 0) {
      window.habits = data.map(h => ({
        id: h.id,
        name: h.name,
        emoji: h.emoji,
        color: h.color,
        done: h.done === 1,
        streak: h.streak,
        time: h.time,
        cat: h.category
      }));
    }

    // Trigger Onboarding for Brand New Users
    if (window.habits.length === 0 && window.location.pathname.includes("index")) {
      setTimeout(initOnboarding, 500);
    }

    if (typeof renderDashboard === "function") renderDashboard();
    if (typeof renderHabitsPage === "function") renderHabitsPage();
  } catch (err) {
    console.error("DB Load Error:", err);
  }
}

/* ══════════════════════════════════════
   ONBOARDING CATEGORY ENGINE
══════════════════════════════════════ */
const ONBOARDING_HABITS = {
  "Mind": [
    { n: "Meditate 10 min", e: "🧘‍♂️", c: "#8b5cf6" },
    { n: "Read 10 pages", e: "📚", c: "#6366f1" },
    { n: "Journal feelings", e: "✍️", c: "#14b8a6" },
    { n: "Listen to podcast", e: "🎧", c: "#f59e0b" },
    { n: "No phone in bed", e: "📱", c: "#ef4444" },
    { n: "Deep breathing", e: "🌬️", c: "#0ea5e9" },
    { n: "Gratitude list", e: "🙏", c: "#ec4899" },
    { n: "Digital detox", e: "🔌", c: "#64748b" },
    { n: "Review goals", e: "🎯", c: "#eab308" },
    { n: "Practice focus", e: "🧠", c: "#a855f7" }
  ],
  "Health": [
    { n: "Drink 2L Water", e: "💧", c: "#06b6d4" },
    { n: "Eat 1 Fruit", e: "🍎", c: "#ef4444" },
    { n: "Take vitamins", e: "💊", c: "#f59e0b" },
    { n: "Sleep 8 hours", e: "😴", c: "#6366f1" },
    { n: "Cook dinner", e: "🍳", c: "#f97316" },
    { n: "No sugar today", e: "🚫", c: "#3b82f6" },
    { n: "Stretch morning", e: "🤸‍♀️", c: "#8b5cf6" },
    { n: "Floss teeth", e: "🦷", c: "#14b8a6" },
    { n: "Skin care routine", e: "🧴", c: "#ec4899" },
    { n: "Track calories", e: "📊", c: "#64748b" }
  ],
  "Fitness": [
    { n: "Gym workout", e: "🏋️‍♂️", c: "#f97316" },
    { n: "Morning run", e: "🏃‍♂️", c: "#22c55e" },
    { n: "10,000 steps", e: "👟", c: "#3b82f6" },
    { n: "Yoga session", e: "🧘‍♀️", c: "#a855f7" },
    { n: "50 pushups", e: "💪", c: "#ef4444" },
    { n: "Cycle 20 mins", e: "🚴‍♂️", c: "#0ea5e9" },
    { n: "Dance class", e: "💃", c: "#ec4899" },
    { n: "Take stairs", e: "🪜", c: "#64748b" },
    { n: "Core workout", e: "🔥", c: "#f59e0b" },
    { n: "Protein shake", e: "🥤", c: "#8b5cf6" }
  ],
  "Learn": [
    { n: "Study 30 mins", e: "📖", c: "#14b8a6" },
    { n: "Learn language", e: "🌍", c: "#3b82f6" },
    { n: "Watch tutorial", e: "📺", c: "#f59e0b" },
    { n: "Practice coding", e: "💻", c: "#22c55e" },
    { n: "Read article", e: "📰", c: "#64748b" },
    { n: "Play instrument", e: "🎸", c: "#a855f7" },
    { n: "Review notes", e: "📝", c: "#ef4444" },
    { n: "Watch documentary", e: "🎬", c: "#0ea5e9" },
    { n: "Solve puzzle", e: "🧩", c: "#8b5cf6" },
    { n: "Read nonfiction", e: "📘", c: "#ec4899" }
  ],
  "Career": [
    { n: "Inbox zero", e: "📧", c: "#3b82f6" },
    { n: "Plan tomorrow", e: "📅", c: "#f59e0b" },
    { n: "Update resume", e: "📄", c: "#64748b" },
    { n: "Network reachout", e: "🤝", c: "#14b8a6" },
    { n: "Deep work 1hr", e: "⏱️", c: "#ef4444" },
    { n: "Organize desk", e: "🖥️", c: "#8b5cf6" },
    { n: "Read industry news", e: "📊", c: "#0ea5e9" },
    { n: "Reply to blockers", e: "🛑", c: "#ec4899" },
    { n: "Skill building", e: "🔨", c: "#a855f7" },
    { n: "Review metrics", e: "📈", c: "#22c55e" }
  ],
  "Finance": [
    { n: "Track expenses", e: "🧾", c: "#f59e0b" },
    { n: "No spend day", e: "🛑", c: "#ef4444" },
    { n: "Check budget", e: "📊", c: "#3b82f6" },
    { n: "Read finance news", e: "📰", c: "#64748b" },
    { n: "Save $10", e: "💵", c: "#22c55e" },
    { n: "Pack lunch", e: "🍱", c: "#14b8a6" },
    { n: "Invest 10%", e: "📈", c: "#8b5cf6" },
    { n: "Review subs", e: "💳", c: "#ec4899" },
    { n: "Pay bills", e: "📮", c: "#0ea5e9" },
    { n: "Learn trading", e: "💹", c: "#a855f7" }
  ],
  "Social": [
    { n: "Call family", e: "📞", c: "#3b82f6" },
    { n: "Text a friend", e: "💬", c: "#14b8a6" },
    { n: "Compliment someone", e: "😊", c: "#f59e0b" },
    { n: "Plan weekend", e: "🎉", c: "#a855f7" },
    { n: "Attend event", e: "🎫", c: "#ef4444" },
    { n: "Quality time", e: "⏱️", c: "#ec4899" },
    { n: "Help someone", e: "🤝", c: "#22c55e" },
    { n: "Listen actively", e: "👂", c: "#8b5cf6" },
    { n: "Express love", e: "❤️", c: "#0ea5e9" },
    { n: "Meet new person", e: "👋", c: "#64748b" }
  ],
  "Chores": [
    { n: "Make bed", e: "🛏️", c: "#3b82f6" },
    { n: "Do dishes", e: "🍽️", c: "#14b8a6" },
    { n: "Wipe counters", e: "✨", c: "#f59e0b" },
    { n: "Take out trash", e: "🗑️", c: "#ef4444" },
    { n: "Sweep floor", e: "🧹", c: "#8b5cf6" },
    { n: "Do laundry", e: "👕", c: "#0ea5e9" },
    { n: "Water plants", e: "🪴", c: "#22c55e" },
    { n: "Organize room", e: "📦", c: "#a855f7" },
    { n: "Clean bathroom", e: "🛁", c: "#ec4899" },
    { n: "Vacuum house", e: "🔌", c: "#64748b" }
  ],
  "Spirit": [
    { n: "Morning prayer", e: "🕌", c: "#8b5cf6" },
    { n: "Read scripture", e: "📖", c: "#3b82f6" },
    { n: "Silent reflection", e: "🧘", c: "#14b8a6" },
    { n: "Volunteer time", e: "🤝", c: "#f97316" },
    { n: "Donate charity", e: "💝", c: "#ec4899" },
    { n: "Nature walk", e: "🌲", c: "#22c55e" },
    { n: "Digital fast", e: "📵", c: "#64748b" },
    { n: "Forgive someone", e: "🕊️", c: "#0ea5e9" },
    { n: "Mindful eating", e: "🍎", c: "#ef4444" },
    { n: "Night gratitude", e: "✨", c: "#f59e0b" }
  ],
  "Creative": [
    { n: "Draw 15 mins", e: "🎨", c: "#ec4899" },
    { n: "Write poem", e: "📝", c: "#8b5cf6" },
    { n: "Take photos", e: "📸", c: "#3b82f6" },
    { n: "Brainstorm ideas", e: "💡", c: "#f59e0b" },
    { n: "Learn magic trick", e: "🎩", c: "#14b8a6" },
    { n: "Play piano", e: "🎹", c: "#a855f7" },
    { n: "Graphic design", e: "🖼️", c: "#0ea5e9" },
    { n: "Craft project", e: "✂️", c: "#ef4444" },
    { n: "Edit video", e: "🎞️", c: "#64748b" },
    { n: "Sing a song", e: "🎤", c: "#22c55e" }
  ]
};

window.selectedOnboardHabits = [];

function initOnboarding() {
  document.getElementById("onboarding-overlay").classList.add("open");
  renderOnboardChips();
}

function renderOnboardChips() {
  const cat = document.getElementById("onboard-cat-select").value;
  const list = ONBOARDING_HABITS[cat] || [];
  const container = document.getElementById("onboard-chips");

  if (!container) return;

  container.innerHTML = list.map((h, i) => {
    const isSel = window.selectedOnboardHabits.some(x => x.n === h.n);
    return `
      <div class="chip ${isSel ? 'sel' : ''}" style="${isSel ? `background:${h.c};border-color:${h.c}` : ''}" 
           onclick="toggleOnboardHabit('${cat}', ${i})">
        ${h.e} ${h.n}
      </div>
    `;
  }).join("");

  updateOnboardButton();
}

function toggleOnboardHabit(cat, index) {
  const h = ONBOARDING_HABITS[cat][index];
  const exists = window.selectedOnboardHabits.findIndex(x => x.n === h.n);

  if (exists > -1) {
    window.selectedOnboardHabits.splice(exists, 1);
  } else {
    h.cat = cat;
    window.selectedOnboardHabits.push(h);
  }

  renderOnboardChips();
}

function updateOnboardButton() {
  const btn = document.getElementById("onboard-finish-btn");
  if (!btn) return;
  if (window.selectedOnboardHabits.length > 0) {
    btn.style.opacity = "1";
    btn.style.pointerEvents = "auto";
    btn.textContent = `Finish (${window.selectedOnboardHabits.length} selected)`;
  } else {
    btn.style.opacity = "0.5";
    btn.style.pointerEvents = "none";
    btn.textContent = "Finish Setup";
  }
}

async function closeOnboarding(skip = false) {
  const overlay = document.getElementById("onboarding-overlay");

  if (!skip && window.selectedOnboardHabits.length > 0) {
    const btn = document.getElementById("onboard-finish-btn");
    btn.innerHTML = `<i class="fa fa-spinner fa-spin"></i> Saving...`;
    btn.disabled = true;

    // Save all selected onboarding habits to DB securely
    for (const h of window.selectedOnboardHabits) {
      try {
        const res = await fetchAuth(`${API_BASE}/api/habits`, {
          method: "POST",
          body: JSON.stringify({
            name: h.n, emoji: h.e, color: h.c, category: h.cat, time: "Any time", done: 0, streak: 0
          })
        });
        const newHabit = await res.json();
        // Default schedule mapping (Everyday 0-6)
        for (let i = 0; i < 7; i++) {
          await fetchAuth(`${API_BASE}/api/schedule`, {
            method: "POST", body: JSON.stringify({ habit_id: newHabit.id, weekday: i })
          });
        }
      } catch (err) {
        console.error("Failed to inject onboarding habit", err);
      }
    }
  }

  overlay.classList.remove("open");
  await loadHabitsFromDB(); // Perform final sync to show the new habits seamlessly
}

async function toggleHabit(id) {
  const h = window.habits.find(x => x.id === id);
  if (!h) return;
  h.done = !h.done;
  h.streak = h.done ? h.streak + 1 : 0;
  await fetchAuth(`${API_BASE}/api/habits/${id}`, {
    method: "PUT",
    body: JSON.stringify({ done: h.done ? 1 : 0, streak: h.streak })
  });

  // Feedback
  if (h.done) {
    if (getSetting("sound")) playAudioSequence("complete");
    if (getSetting("haptics")) triggerHaptic(50);
    // Streak Milestone Check
    if (getSetting("streak") && [7, 14, 30, 50, 100].includes(h.streak)) {
      if (Notification.permission === "granted") {
        new Notification("Milestone Reached! 🏆", {
          body: `You hit a ${h.streak}-day streak for ${h.name}! Incredible work!`,
          icon: "/favicon.ico"
        });
      }
      showToast(`🏆 ${h.streak} Day Streak!`);
      if (getSetting("sound")) playAudioSequence("badge");
    }
  } else {
    if (getSetting("sound")) playAudioSequence("uncomplete");
    if (getSetting("haptics")) triggerHaptic([30, 50, 30]);
  }

  if (typeof renderDashboard === "function") renderDashboard();
  if (typeof renderHabitsPage === "function") renderHabitsPage();
  if (typeof loadDashboardXP === "function") loadDashboardXP();
}

async function deleteHabit(id) {
  await fetchAuth(`${API_BASE}/api/habits/${id}`, { method: "DELETE" });
  await loadHabitsFromDB();
  if (typeof renderSchedule === "function") renderSchedule();
  showToast("🗑️ Habit removed");
}

/* ══════════════════════════════════════
   MODAL
══════════════════════════════════════ */
function openModal() {
  window.editId = null;
  document.getElementById("modal-title-text").textContent = "Add New Habit";
  document.getElementById("modal-sub-text").textContent = "Build a new routine, one day at a time.";
  document.getElementById("modal-btn-text").textContent = "Add Habit";
  document.getElementById("h-name").value = "";
  document.getElementById("h-time").value = "08:00";
  window.selEmoji = window.emojis[0];
  window.selColor = window.colors[0];
  setupEmojiPicker();
  setupColorPicker();
  setupDayPicker();
  setupQuickHabits(); // Initialize Quick Add chips
  document.getElementById("overlay").classList.add("open");
  setTimeout(() => document.getElementById("h-name").focus(), 300);
}

function closeModal() {
  document.getElementById("overlay").classList.remove("open");
}

function closeModalOut(e) {
  if (e.target === document.getElementById("overlay")) closeModal();
}

function editHabit(id) {
  const h = window.habits.find(x => x.id === id);
  if (!h) return;
  window.editId = id;
  document.getElementById("modal-title-text").textContent = "Edit Habit";
  document.getElementById("modal-sub-text").textContent = "Update your habit details.";
  document.getElementById("modal-btn-text").textContent = "Save Changes";
  document.getElementById("h-name").value = h.name;
  document.getElementById("h-cat").value = h.cat;
  document.getElementById("h-time").value = h.time;
  window.selEmoji = h.emoji;
  window.selColor = h.color;
  setupEmojiPicker();
  setupColorPicker();
  document.getElementById("overlay").classList.add("open");
}

async function submitHabit() {
  const name = document.getElementById("h-name").value.trim();
  if (!name) { showToast("⚠️ Enter habit name"); return; }
  if (window.selectedDays.length === 0) { showToast("⚠️ Select at least one day"); return; }

  const habitData = {
    name,
    emoji: window.selEmoji,
    color: window.selColor,
    done: 0,
    streak: 0,
    time: document.getElementById("h-time").value || "Any time",
    category: document.getElementById("h-cat").value
  };

  try {
    const res = await fetchAuth(`${API_BASE}/api/habits`, {
      method: "POST",
      body: JSON.stringify(habitData)
    });
    if (!res.ok) throw new Error("Habit save failed");
    const newHabit = await res.json();

    for (const day of window.selectedDays) {
      await fetchAuth(`${API_BASE}/api/schedule`, {
        method: "POST",
        body: JSON.stringify({ habit_id: newHabit.id, weekday: day })
      });
    }

    closeModal();
    await loadHabitsFromDB();
    if (typeof renderSchedule === "function") renderSchedule();
    showToast("✅ Habit added + scheduled");
  } catch (err) {
    console.error(err);
    showToast("❌ Add failed");
  }
}

function setupEmojiPicker() {
  const r = document.getElementById("ep-row");
  if (!r) return;
  r.innerHTML = window.emojis.map(e => `<div class="ep${e === window.selEmoji ? " sel" : ""}" data-e="${e}">${e}</div>`).join("");
  r.querySelectorAll(".ep").forEach(el => el.addEventListener("click", () => {
    r.querySelectorAll(".ep").forEach(x => x.classList.remove("sel"));
    el.classList.add("sel");
    window.selEmoji = el.dataset.e;
  }));
}

function setupColorPicker() {
  const r = document.getElementById("cp-row");
  if (!r) return;
  r.innerHTML = window.colors.map(c => `<div class="cp${c === window.selColor ? " sel" : ""}" style="background:${c}" data-c="${c}"></div>`).join("");
  r.querySelectorAll(".cp").forEach(el => el.addEventListener("click", () => {
    r.querySelectorAll(".cp").forEach(x => x.classList.remove("sel"));
    el.classList.add("sel");
    window.selColor = el.dataset.c;
  }));
}

function setupDayPicker() {
  const buttons = document.querySelectorAll(".day-btn");
  window.selectedDays = [];
  buttons.forEach(btn => {
    btn.classList.remove("active");
    btn.onclick = () => {
      const day = parseInt(btn.dataset.day);
      if (window.selectedDays.includes(day)) {
        window.selectedDays = window.selectedDays.filter(d => d !== day);
        btn.classList.remove("active");
      } else {
        window.selectedDays.push(day);
        btn.classList.add("active");
      }
    };
  });
}

function setupQuickHabits() {
  const container = document.getElementById("quick-habits-container");
  if (!container) return;
  const quickHabits = [
    { n: "Meditate", c: "Mind", e: "🧘", t: "07:00", col: "#8b5cf6" },
    { n: "Gym Workout", c: "Fitness", e: "💪", t: "18:00", col: "#ec4899" },
    { n: "Drink Water", c: "Health", e: "💧", t: "08:00", col: "#3b82f6" },
    { n: "Read Book", c: "Learn", e: "📚", t: "20:00", col: "#f59e0b" }
  ];
  window._qh = quickHabits;
  container.innerHTML = quickHabits.map((qh, i) =>
    `<div class="chip" style="cursor:pointer;background:rgba(255,255,255,0.05);border:1px solid rgba(255,255,255,0.1)" onclick="applyQuickHabit(${i})">${qh.e} ${qh.n}</div>`
  ).join("");
}

function applyQuickHabit(index) {
  if (!window._qh) return;
  const qh = window._qh[index];
  document.getElementById("h-name").value = qh.n;
  document.getElementById("h-cat").value = qh.c;
  document.getElementById("h-time").value = qh.t;
  window.selEmoji = qh.e;
  window.selColor = qh.col;
  setupEmojiPicker();
  setupColorPicker();
}

/* ══════════════════════════════════════
   ROUTER
══════════════════════════════════════ */
const pageTitles = {
  dashboard: "AI Habit Intelligence Dashboard",
  habits: "My Habits",
  analytics: "Analytics & Insights",
  insights: "AI Insights",
  achievements: "Achievements",
  schedule: "Weekly Schedule",
  calendar: "Monthly Calendar",
  settings: "Settings",
  features: "Smart Features",
  profile: "User Profile"
};

function goTo(page) {
  document.querySelectorAll(".page").forEach(p => p.classList.remove("active"));
  const target = document.getElementById("page-" + page);
  if (!target) { console.error("Page not found:", page); return; }
  target.classList.add("active");
  document.querySelectorAll(".nav-item").forEach(n => {
    n.classList.toggle("active", n.dataset.page === page);
  });
  document.getElementById("pageTitle").textContent = pageTitles[page] || page;
  window.currentPage = page;

  if (page === "dashboard") renderDashboard();
  else if (page === "habits") renderHabitsPage();
  else if (page === "analytics") renderAnalytics();
  else if (page === "insights") renderInsightsPage();
  else if (page === "achievements") renderAchievements();
  else if (page === "schedule") setTimeout(() => renderSchedule(), 50);
  else if (page === "calendar") renderCalendar();
  else if (page === "settings") renderSettings();
  else if (page === "features") initFeatures();
  else if (page === "profile") loadProfilePage();

  syncUserUI();
}

/* ══════════════════════════════════════
   SETTINGS
══════════════════════════════════════ */
function getSetting(key) {
  const t = window.settingsToggles.find(x => x.key === key);
  return t ? t.on : false;
}

function renderSettings() {
  document.getElementById("settings-toggles").innerHTML = window.settingsToggles.map(t => `
    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:14px">
      <div><div style="font-size:14px;font-weight:600">${t.label}</div></div>
      <div style="width:44px;height:24px;border-radius:12px;background:${t.on ? "var(--purple)" : "rgba(255,255,255,.1)"};cursor:pointer;position:relative;transition:background .3s;flex-shrink:0"
        onclick="toggleSetting('${t.key}',this)">
        <div style="width:20px;height:20px;background:white;border-radius:50%;position:absolute;top:2px;left:${t.on ? "22px" : "2px"};transition:left .3s"></div>
      </div>
    </div>`).join("");
}

function toggleSetting(key, el) {
  const t = window.settingsToggles.find(x => x.key === key);
  if (!t) return;

  if (key === "notif" && !t.on) {
    if ("Notification" in window) {
      if (Notification.permission === "granted") {
        new Notification("Notifications Enabled", {
          body: "You will now receive daily reminders!",
          icon: "/favicon.ico"
        });
        finalizeToggle(t, el);
      } else if (Notification.permission !== "denied") {
        Notification.requestPermission().then(permission => {
          if (permission === "granted") {
            new Notification("Notifications Enabled", {
              body: "You will now receive daily reminders!",
              icon: "/favicon.ico"
            });
            finalizeToggle(t, el);
          } else {
            showToast("❌ Permission denied by browser.");
          }
        });
        return; // wait for permission
      } else {
        showToast("❌ Notifications are blocked in your browser settings.");
        return;
      }
    } else {
      showToast("❌ Browser doesn't support notifications.");
      return;
    }
  }

  finalizeToggle(t, el);
}

function finalizeToggle(t, el) {
  t.on = !t.on;
  el.style.background = t.on ? "var(--purple)" : "rgba(255,255,255,.1)";
  el.querySelector("div").style.left = t.on ? "22px" : "2px";
  showToast(t.on ? `🔔 ${t.label} enabled` : `🔕 ${t.label} disabled`);
}

async function loadSettings() {
  try {
    const res = await fetchAuth(`${API_BASE}/api/habits/settings`);
    const data = await res.json();
    const nameEl = document.getElementById("set-name");
    const goalEl = document.getElementById("set-goal");
    if (nameEl) nameEl.value = data.name;
    if (goalEl) goalEl.value = data.dailyGoal;

    /* Sync name everywhere dynamically */
    const uname = document.querySelector(".user-name");
    if (uname) uname.textContent = data.name;

    /* Sync avatar initials */
    const avatar = document.querySelector(".user-avatar");
    if (avatar) {
      const parts = (data.name || "U").split(" ");
      avatar.textContent = parts.map(p => p[0]).join("").toUpperCase().slice(0, 2);
    }

    /* Update greeting with settings name */
    if (data.name) updateGreeting(data.name);

    /* Store in currentUser so all pages see it */
    if (!window.currentUser) window.currentUser = {};
    window.currentUser.name = data.name;
  } catch (err) {
    console.error("Settings load error:", err);
  }
}

async function saveSettings() {
  const name = document.getElementById("set-name").value;
  const goal = document.getElementById("set-goal").value;
  try {
    await fetchAuth(`${API_BASE}/api/habits/settings`, {
      method: "PUT",
      body: JSON.stringify({ name, dailyGoal: goal, notif: 1, streak: 1, email: 0, ach: 1, quotes: 1 })
    });
    const uname = document.querySelector(".user-name");
    if (uname) uname.textContent = name;
    const avatar = document.querySelector(".user-avatar");
    if (avatar) {
      const parts = (name || "U").split(" ");
      avatar.textContent = parts.map(p => p[0]).join("").toUpperCase().slice(0, 2);
    }
    if (window.currentUser) window.currentUser.name = name;
    updateGreeting(name);
    showToast("✅ Settings saved");
  } catch (err) {
    showToast("❌ Save failed");
  }
}

function resetProgress() {
  if (confirm("Reset all habit streaks? This cannot be undone.")) {
    window.habits.forEach(h => { h.done = false; h.streak = 0; });
    showToast("🔄 Progress reset");
    if (window.currentPage === "habits") renderHabitsPage();
    if (window.currentPage === "dashboard") renderDashboard();
  }
}

/* ══════════════════════════════════════
   AUTH
══════════════════════════════════════ */
function createAuthParticles() {
  const wrap = document.getElementById("auth-particles");
  if (!wrap) return;
  const cols = ["rgba(124,58,237,.7)", "rgba(59,130,246,.7)", "rgba(6,182,212,.7)", "rgba(34,197,94,.5)", "rgba(236,72,153,.6)"];
  for (let i = 0; i < 22; i++) {
    const el = document.createElement("div");
    const s = 2 + Math.random() * 6;
    el.style.cssText = `position:absolute;width:${s}px;height:${s}px;border-radius:50%;background:${cols[~~(Math.random() * cols.length)]};left:${Math.random() * 100}%;animation:floatup ${7 + Math.random() * 10}s linear ${Math.random() * 8}s infinite;opacity:0;`;
    wrap.appendChild(el);
  }
  for (let i = 0; i < 4; i++) {
    const orb = document.createElement("div");
    const size = 80 + Math.random() * 120;
    orb.style.cssText = `position:absolute;width:${size}px;height:${size}px;border-radius:50%;background:radial-gradient(circle,${cols[i]},transparent 70%);left:${Math.random() * 90}%;top:${Math.random() * 90}%;animation:floatCard ${6 + Math.random() * 8}s ease-in-out ${Math.random() * 4}s infinite;pointer-events:none;opacity:.4;`;
    wrap.appendChild(orb);
  }
}

function switchAuthTab(tab) {
  document.getElementById("tab-login").classList.toggle("active", tab === "login");
  document.getElementById("tab-register").classList.toggle("active", tab === "register");
  document.getElementById("form-login").classList.toggle("active", tab === "login");

  // Only show the register form if we're on the register tab AND we're not currently verifying an OTP
  const isOtpVisible = document.getElementById("form-otp").style.display === "block";
  document.getElementById("form-register").classList.toggle("active", tab === "register" && !isOtpVisible);

  if (tab === "login") {
    document.getElementById("form-otp").style.display = "none";
  }

  document.getElementById("login-error").classList.remove("show");
  document.getElementById("reg-error").classList.remove("show");
  document.getElementById("otp-error").classList.remove("show");
}

function checkStrength(val) {
  const bar = document.getElementById("strength-bar");
  const lbl = document.getElementById("strength-label");
  if (!bar || !lbl) return;
  let score = 0;
  if (val.length >= 8) score++;
  if (/[A-Z]/.test(val)) score++;
  if (/[0-9]/.test(val)) score++;
  if (/[^A-Za-z0-9]/.test(val)) score++;
  const colors = ["#ef4444", "#f59e0b", "#3b82f6", "#22c55e"];
  const labels = ["Weak", "Fair", "Good", "Strong"];
  bar.style.width = (score / 4 * 100) + "%";
  bar.style.background = colors[score - 1] || "rgba(255,255,255,.1)";
  lbl.textContent = score > 0 ? (labels[score - 1] + " password") : "Password strength";
}

async function doLogin() {
  const email = document.getElementById("login-email").value.trim();
  const pass = document.getElementById("login-pass").value;
  if (!email || !pass) { showAuthError("login", "Please enter email and password."); return; }

  try {
    const res = await fetch(`${API_BASE}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password: pass })
    });

    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Login failed");

    loginSuccess(data.user, data.token);
  } catch (error) {
    showAuthError("login", error.message);
  }
}

async function doRegister() {
  const name = document.getElementById("reg-name").value.trim();
  const email = document.getElementById("reg-email").value.trim();
  const pass = document.getElementById("reg-pass").value;
  const confirm = document.getElementById("reg-confirm").value;

  if (!name || !email || !pass || !confirm) { showAuthError("reg", "Please fill all fields."); return; }
  if (pass !== confirm) { showAuthError("reg", "Passwords do not match."); return; }
  if (pass.length < 6) { showAuthError("reg", "Password must be at least 6 characters."); return; }

  // Disable button while processing
  const btn = document.getElementById("reg-submit-btn");
  const origText = btn.innerHTML;
  btn.innerHTML = `<i class="fa fa-spinner fa-spin"></i> Sending OTP...`;
  btn.disabled = true;

  try {
    const res = await fetch(`${API_BASE}/api/auth/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, email, password: pass })
    });

    const data = await res.json();
    btn.innerHTML = origText;
    btn.disabled = false;

    if (!res.ok) throw new Error(data.error || "Registration failed");

    if (data.requiresOtp) {
      // Transition to OTP Screen
      window.tempRegEmail = email;
      document.getElementById("otp-email-lbl").textContent = email;
      document.getElementById("form-register").classList.remove("active");
      document.getElementById("form-otp").style.display = "block";
      setTimeout(() => document.getElementById("reg-otp").focus(), 100);
    } else {
      // Fallback if OTP is completely disabled
      showToast("✅ Registered successfully! Please log in.");
      switchAuthTab("login");
    }
  } catch (error) {
    btn.innerHTML = origText;
    btn.disabled = false;
    showAuthError("reg", error.message);
  }
}

async function verifyOtp() {
  const otp = document.getElementById("reg-otp").value.trim();
  const email = window.tempRegEmail;
  if (!otp || otp.length !== 6) {
    const err = document.getElementById("otp-error");
    err.textContent = "Please enter the 6-digit code";
    err.classList.add("show");
    return;
  }

  const btn = document.getElementById("otp-submit-btn");
  const origText = btn.innerHTML;
  btn.innerHTML = `<i class="fa fa-spinner fa-spin"></i> Verifying...`;
  btn.disabled = true;

  try {
    const res = await fetch(`${API_BASE}/api/auth/verify-otp`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, otp })
    });

    const data = await res.json();
    btn.innerHTML = origText;
    btn.disabled = false;

    if (!res.ok) throw new Error(data.error || "Invalid OTP");

    // Success! Log the user in
    showToast("✅ Email Verified!");
    document.getElementById("form-otp").style.display = "none";
    loginSuccess(data.user, data.token);
  } catch (error) {
    btn.innerHTML = origText;
    btn.disabled = false;
    const err = document.getElementById("otp-error");
    err.textContent = error.message;
    err.classList.add("show");
  }
}

function doSocialLogin(provider) {
  showToast("Social login not configured in this demo.");
}

async function handleGoogleLogin(response) {
  try {
    const res = await fetch(`${API_BASE}/api/auth/google`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ credential: response.credential })
    });

    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Google Auth failed");

    loginSuccess(data.user, data.token);
  } catch (error) {
    showAuthError("login", "Google Sign-In failed: " + error.message);
  }
}

async function initGoogleAuth() {
  try {
    const res = await fetch(`${API_BASE}/api/auth/client-id`);
    if (!res.ok) return;
    const data = await res.json();
    const id = data.clientId;

    // Only initialize Google SDK if a valid ID was detected in the backend .env
    if (id && id !== "YOUR_GOOGLE_CLIENT_ID.apps.googleusercontent.com" && typeof google !== 'undefined') {
      google.accounts.id.initialize({
        client_id: id,
        callback: handleGoogleLogin,
        context: "use",
        ux_mode: "popup"
      });
      // Render login button
      const loginBtn = document.getElementById("google-btn-login");
      if (loginBtn) {
        google.accounts.id.renderButton(loginBtn,
          { theme: "outline", size: "large", type: "standard", shape: "rectangular", text: "signin_with" });
      }
      // Render register button
      const regBtn = document.getElementById("google-btn-reg");
      if (regBtn) {
        google.accounts.id.renderButton(regBtn,
          { theme: "outline", size: "large", type: "standard", shape: "rectangular", text: "signup_with" });
      }
    } else {
      // Hide the dividers to keep the UI clean if no google login is available
      const dLogin = document.getElementById("divider-login");
      const dReg = document.getElementById("divider-reg");
      if (dLogin) dLogin.style.display = "none";
      if (dReg) dReg.style.display = "none";
    }
  } catch (err) {
    console.error("Failed to init Google Auth", err);
  }
}

function showAuthError(type, msg) {
  const id = type === "login" ? "login-error" : "reg-error";
  const el = document.getElementById(id);
  if (!el) return;
  el.textContent = msg;
  el.classList.remove("show");
  void el.offsetWidth;
  el.classList.add("show");
}

function loginSuccess(user, token) {
  window.currentUser = user;
  localStorage.setItem("hab_user", JSON.stringify(user));
  if (token) localStorage.setItem("hab_token", token);

  const screen = document.getElementById("auth-screen");
  screen.style.transition = "opacity .5s ease, transform .5s ease";
  screen.style.opacity = "0";
  screen.style.transform = "scale(1.04)";

  setTimeout(() => {
    screen.classList.add("hidden");
    const shell = document.getElementById("app-shell");
    if (shell) shell.style.display = "flex";
    updateGreeting(user.name);
    launchConfetti();
    showToast("🎉 Welcome, " + user.name.split(" ")[0] + "!");

    // Refresh all data after confirmed login
    loadHabitsFromDB();
    renderSchedule();
    loadSettings();
    renderAchievements();
    loadXP();

    goTo("dashboard");
  }, 500);
}

function updateGreeting(name) {
  const hour = new Date().getHours();
  let greet, emoji, sub;
  if (hour >= 5 && hour < 12) {
    greet = "Good morning"; emoji = "🌅"; sub = "Rise and shine! Your habits await.";
  } else if (hour >= 12 && hour < 17) {
    greet = "Good afternoon"; emoji = "☀️"; sub = "Keep the momentum going!";
  } else if (hour >= 17 && hour < 21) {
    greet = "Good evening"; emoji = "🌇"; sub = "Finishing strong — you've got this!";
  } else {
    greet = "Good night"; emoji = "🌙"; sub = "Almost there. End the day strong!";
  }
  const firstName = name.split(" ")[0];
  const msgEl = document.getElementById("greeting-msg");
  const subEl = document.getElementById("greeting-sub");
  const emoEl = document.getElementById("greeting-emoji");
  if (msgEl) msgEl.textContent = `${greet}, ${firstName}! 👋`;
  if (subEl) subEl.textContent = sub;
  if (emoEl) emoEl.textContent = emoji;
  const uname = document.querySelector(".user-name");
  if (uname) uname.textContent = name;
}

function doLogout() {
  localStorage.removeItem("hab_user");
  localStorage.removeItem("hab_token");
  window.currentUser = null;

  // Clear local arrays so data doesn't cross over
  window.habits = [];

  const screen = document.getElementById("auth-screen");
  const shell = document.getElementById("app-shell");
  if (shell) shell.style.display = "none";
  screen.style.opacity = "0";
  screen.style.transform = "scale(1.04)";
  screen.classList.remove("hidden");
  void screen.offsetWidth;
  screen.style.transition = "opacity .4s ease, transform .4s ease";
  screen.style.opacity = "1";
  screen.style.transform = "scale(1)";

  switchAuthTab("login");
  document.getElementById("login-email").value = "";
  document.getElementById("login-pass").value = "";
}

/* ══════════════════════════════════════
   XP & LEVEL
══════════════════════════════════════ */
async function loadXP() {
  try {
    const res = await fetchAuth(`${API_BASE}/api/xp`);
    if (!res.ok) throw new Error("XP API failed");
    const data = await res.json();
    const setText = (id, value) => { const el = document.getElementById(id); if (el) el.textContent = value; };
    setText("sideLevel", data.level || 1);
    document.querySelectorAll("#dash-level").forEach(el => { el.textContent = data.level || 1; });
    setText("s-xp", data.xp || 0);
    setText("dash-xp-disp", (data.xp || 0) + " XP");
    setText("dash-xp-text", (data.xp || 0) + " XP");
    const remaining = document.getElementById("dash-xp-remaining");
    if (remaining) remaining.textContent = (data.remainingXP || 0) + " XP to Level " + ((data.level || 1) + 1);
    const fill = document.getElementById("dash-xpfill");
    if (fill) { const pct = ((data.xp || 0) % 500) / 500 * 100; fill.style.width = pct + "%"; }
  } catch (err) {
    console.error("XP Load Error:", err);
  }
}

async function loadDashboardXP() {
  try {
    const res = await fetchAuth(`${API_BASE}/api/xp`);
    const data = await res.json();
    const xp = data.xp || 0;
    const level = data.level || 1;
    const nextLevelXP = level * 500;
    const remainingXP = nextLevelXP - xp;

    const levelTitles = {
      1: "Beginner", 2: "Apprentice", 3: "Consistent", 4: "Focused",
      5: "Dedicated", 6: "Expert", 7: "Master", 8: "Champion",
      9: "Legend", 10: "Grandmaster"
    };

    const set = (id, v) => { const el = document.getElementById(id); if (el) el.textContent = v; };
    set("s-xp", xp);
    set("dash-xp-disp", xp + " XP");
    set("dash-xp-text", xp + " XP");
    set("dash-level", level);
    set("dash-level-name", levelTitles[level] || "Legend");
    set("sideLevel", level);

    /* Update "X XP to Level Y" text */
    const remEl = document.querySelector(".dashboard .xp-bar-w")?.nextElementSibling?.lastElementChild;
    const remEl2 = document.getElementById("dash-xp-remaining");
    if (remEl2) remEl2.textContent = remainingXP + " XP to Level " + (level + 1);
    /* Also update the static text in dashboard level card */
    document.querySelectorAll("[id='dash-level']").forEach(el => el.textContent = level);

    const pct = (xp % 500) / 500 * 100;
    const fill = document.getElementById("dash-xpfill");
    if (fill) fill.style.width = pct + "%";

    /* Update "of XXXX XP" text */
    document.querySelectorAll(".xp-of-text").forEach(el => el.textContent = "of " + nextLevelXP + " XP");

    /* Dynamically render unlocked badges */
    const badgeContainer = document.getElementById("dash-badges-container");
    if (badgeContainer && window.achievements) {
      // Find max streak across all habits
      const streaks = await fetchAuth(`${API_BASE}/api/habits/analytics/streak`).then(r => r.json()).catch(() => ({ best: 0 }));
      const maxStreak = streaks.best || 0;

      const unlocked = window.achievements.filter(a => maxStreak >= a.requiredStreak);
      if (unlocked.length === 0) {
        badgeContainer.innerHTML = `<div style="font-size:11px;color:var(--muted);width:100%;text-align:center;padding:10px 0;">Keep building streaks to unlock badges!</div>`;
      } else {
        const top5 = unlocked.slice(0, 5);
        badgeContainer.innerHTML = top5.map(a => `
          <div class="badge-item" title="${a.name}">
            <div class="be">${a.icon}</div>
            <p>${a.name.split(" ")[0]}</p>
          </div>
        `).join("");
      }
    }
  } catch (err) {
    console.error("XP Load Error:", err);
  }
}

/* ══════════════════════════════════════
   AI NOTIFICATIONS PANEL
══════════════════════════════════════ */
let notifPanelOpen = false;

async function toggleNotifPanel(e) {
  if (e) e.stopPropagation();
  const panel = document.getElementById("notif-panel");
  if (!panel) return;

  notifPanelOpen = !notifPanelOpen;

  if (!notifPanelOpen) {
    panel.style.display = "none";
    return;
  }

  panel.style.display = "block";
  const content = document.getElementById("notif-panel-content");
  content.innerHTML = `<div style="text-align:center; padding:20px 0;"><i class="fa fa-spinner fa-spin" style="font-size:24px; color:var(--purple-light); margin-bottom:10px;"></i><br>Consulting AI for insights...</div>`;

  try {
    const res = await fetchAuth(`${API_BASE}/api/features/ai-notifications`);
    const data = await res.json();

    if (data.notifications && data.notifications.length) {
      content.innerHTML = data.notifications.map(n => `
        <div style="background:rgba(255,255,255,.03); padding:12px 14px; border-radius:10px; border-left:3px solid var(--purple-light); font-size:13px; line-height:1.5;">
          ${n}
        </div>
      `).join("");

      const dot = document.querySelector(".notif-dot");
      if (dot) dot.style.display = "none";
    } else {
      content.innerHTML = `<div style="text-align:center; padding:15px; background:rgba(255,255,255,.03); border-radius:10px;">You're all caught up! No insights right now.</div>`;
    }
  } catch (err) {
    content.innerHTML = `<div style="text-align:center; padding:15px; background:rgba(239,68,68,.1); color:var(--red); border-radius:10px;">Failed to load AI insights. Check your connection.</div>`;
  }
}

document.addEventListener("click", () => {
  const panel = document.getElementById("notif-panel");
  if (panel && notifPanelOpen) {
    panel.style.display = "none";
    notifPanelOpen = false;
  }
});

async function loadDashboardStreak() {
  try {
    const res = await fetchAuth(`${API_BASE}/api/habits/analytics/streak`);
    if (!res.ok) throw new Error("Streak API failed");
    const data = await res.json();
    const cur = document.getElementById("dash-streak");
    if (cur) cur.textContent = data.current ?? 0;
    const best = document.getElementById("dash-best");
    if (best) best.textContent = data.best ?? 0;
    const stat = document.getElementById("s-streak");
    if (stat) stat.textContent = data.current ?? 0;
    renderWeekDots("dash-wdots");
  } catch (err) {
    console.error("Streak Load Error:", err);
  }
}

/* ══════════════════════════════════════
   KEYBOARD SHORTCUTS
══════════════════════════════════════ */
document.addEventListener("keydown", e => {
  if (e.key === "Escape") closeModal();
  if (e.ctrlKey && e.key === "n") { e.preventDefault(); openModal(); }
  if (e.ctrlKey && e.key === "k") { e.preventDefault(); showToast("🔍 Search coming soon!"); }
  const keys = { "1": "dashboard", "2": "habits", "3": "analytics", "4": "insights", "5": "achievements", "6": "schedule", "7": "settings", "8": "features" };
  if (e.altKey && keys[e.key]) { e.preventDefault(); goTo(keys[e.key]); }
});

/* ══════════════════════════════════════
   APPLE GLASS RIPPLE — tracks exact touch/click
   position so ripple bursts from finger point
══════════════════════════════════════ */
document.addEventListener("pointerdown", e => {
  const btn = e.target.closest(".btn, .icon-btn, .nav-item, .chart-tab, .auth-btn, .auth-social-btn");
  if (!btn) return;
  const rect = btn.getBoundingClientRect();
  const rx = ((e.clientX - rect.left) / rect.width * 100).toFixed(1) + "%";
  const ry = ((e.clientY - rect.top) / rect.height * 100).toFixed(1) + "%";
  btn.style.setProperty("--rx", rx);
  btn.style.setProperty("--ry", ry);
}, { passive: true });

/* ══════════════════════════════════════
   DYNAMIC USER DATA — ensure all user-
   specific elements update on page load
   and whenever currentUser changes
══════════════════════════════════════ */
function syncUserUI() {
  const user = window.currentUser;
  if (!user) return;

  const firstName = (user.name || "User").split(" ")[0];

  /* Sidebar name */
  const sideNameEl = document.querySelector(".user-name");
  if (sideNameEl) sideNameEl.textContent = user.name || "User";

  /* Sidebar avatar initials */
  const avatarEl = document.querySelector(".user-avatar");
  if (avatarEl) {
    const parts = (user.name || "U").split(" ");
    avatarEl.textContent = parts.map(p => p[0]).join("").toUpperCase().slice(0, 2);
  }

  /* Update greeting with real name */
  updateGreeting(user.name || "User");
}