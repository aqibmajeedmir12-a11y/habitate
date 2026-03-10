/* ══════════════════════════════════════
   DASHBOARD.JS — Dashboard page logic
══════════════════════════════════════ */

/* Stores chart data for tab switching */
window._progressData = null;

async function renderDashboard() {
  if (!window.habits.length) await loadHabitsFromDB();

  document.getElementById("pageDate").textContent =
    new Date().toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" });

  const dh = document.getElementById("dash-habits");
  if (!dh) return;
  dh.innerHTML = "";

  window.habits.slice(0, 5).forEach(h => {
    const el = document.createElement("div");
    el.className = "habit-item" + (h.done ? " done" : "");
    el.innerHTML = `
      <div class="habit-check">${h.done ? '<i class="fa fa-check"></i>' : ""}</div>
      <div class="h-dot" style="background:${h.color}"></div>
      <div class="habit-info">
        <div class="habit-name">${h.emoji} ${h.name}</div>
        <div class="habit-meta">${h.cat} · ${h.time}</div>
      </div>
      <div class="habit-streak">🔥 ${h.streak}</div>
    `;
    el.addEventListener("click", async () => {
      await toggleHabit(h.id);
      await loadHabitsFromDB();
      await renderDashboard();
    });
    dh.appendChild(el);
  });

  const done = window.habits.filter(h => h.done).length;
  const total = window.habits.length;
  const pct = total ? Math.round(done / total * 100) : 0;

  const sDone = document.getElementById("s-done");
  const sRate = document.getElementById("s-rate");
  const sideCount = document.getElementById("sideHabitCount");
  if (sDone) sDone.textContent = done;
  if (sRate) sRate.textContent = pct + "%";
  if (sideCount) sideCount.textContent = total;

  animateRing();
  renderRingStats();
  await renderWeekDots("dash-wdots");
  await loadDashboardXP();
  await loadDashboardStreak();
  await renderProgressChart();
  renderFreezeStatus();

  // Load AI motivation quote concurrently with background stats
  try {
    const resAI = await fetchAuth(`${API_BASE}/api/ai/motivation`, {
      method: "POST",
      body: JSON.stringify({ habits: window.habits })
    });
    const ai = await resAI.json();
    const quoteEl = document.getElementById("dash-quote");
    if (quoteEl) quoteEl.textContent = ai.line || "Stay consistent 🚀";
  } catch {
    const quoteEl = document.getElementById("dash-quote");
    if (quoteEl) quoteEl.textContent = "Stay consistent 🚀";
  }
}

/* ══════════════════════════════════════
   PROGRESS CHART — 7-day dynamic chart
   with 3 switchable tabs
══════════════════════════════════════ */
async function renderProgressChart() {
  try {
    const res = await fetchAuth(`${API_BASE}/api/habits/analytics/logs`);
    const data = await res.json();
    const heatmap = data.heatmap || {};

    /* Build last 7 days of data */
    const days = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const key = d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
      const label = d.toLocaleDateString("en-US", { weekday: "short" });
      days.push({
        label,
        key,
        completions: heatmap[key] || 0,
        rate: heatmap[key] ? Math.min(100, Math.round((heatmap[key] / Math.max(window.habits.length, 1)) * 100)) : 0,
        xp: (heatmap[key] || 0) * 10
      });
    }

    window._progressData = days;
    drawProgressChart(days, "completions");
  } catch (err) {
    console.error("Progress chart error:", err);
  }
}

function switchProgressChart(mode, btn) {
  document.querySelectorAll(".chart-tab").forEach(b => b.classList.remove("active"));
  btn.classList.add("active");
  if (window._progressData) drawProgressChart(window._progressData, mode);
}

function drawProgressChart(days, mode) {
  const container = document.getElementById("dash-progress-chart");
  const legend = document.getElementById("dash-progress-legend");
  if (!container) return;

  const values = days.map(d => d[mode]);
  const max = Math.max(...values, 1);
  const labels = { completions: "Habits Completed", rate: "Completion Rate (%)", xp: "XP Earned" };
  const colors = {
    completions: ["#7c3aed", "#3b82f6"],
    rate: ["#22c55e", "#06b6d4"],
    xp: ["#f59e0b", "#ec4899"]
  };
  const [c1, c2] = colors[mode];

  /* SVG line chart */
  const W = container.clientWidth || 600;
  const H = 160;
  const PAD_L = 36, PAD_R = 16, PAD_T = 16, PAD_B = 32;
  const chartW = W - PAD_L - PAD_R;
  const chartH = H - PAD_T - PAD_B;

  const pts = days.map((d, i) => ({
    x: PAD_L + (i / (days.length - 1)) * chartW,
    y: PAD_T + chartH - (values[i] / max) * chartH,
    val: values[i],
    label: d.label
  }));

  /* Build smooth curve path */
  function smooth(pts) {
    if (pts.length < 2) return `M${pts[0].x},${pts[0].y}`;
    let d = `M${pts[0].x},${pts[0].y}`;
    for (let i = 0; i < pts.length - 1; i++) {
      const cx = (pts[i].x + pts[i + 1].x) / 2;
      d += ` C${cx},${pts[i].y} ${cx},${pts[i + 1].y} ${pts[i + 1].x},${pts[i + 1].y}`;
    }
    return d;
  }

  const linePath = smooth(pts);

  /* Area fill path */
  const areaPath = linePath
    + ` L${pts[pts.length - 1].x},${PAD_T + chartH} L${pts[0].x},${PAD_T + chartH} Z`;

  /* Y-axis labels */
  const yLabels = [0, Math.round(max / 2), max].map(v => ({
    v,
    y: PAD_T + chartH - (v / max) * chartH
  }));

  container.innerHTML = `
    <svg width="100%" height="${H}" viewBox="0 0 ${W} ${H}" preserveAspectRatio="none" style="overflow:visible">
      <defs>
        <linearGradient id="lineGrad" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stop-color="${c1}"/>
          <stop offset="100%" stop-color="${c2}"/>
        </linearGradient>
        <linearGradient id="areaGrad" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stop-color="${c1}" stop-opacity="0.25"/>
          <stop offset="100%" stop-color="${c1}" stop-opacity="0.01"/>
        </linearGradient>
      </defs>

      <!-- Grid lines -->
      ${yLabels.map(l => `
        <line x1="${PAD_L}" y1="${l.y}" x2="${W - PAD_R}" y2="${l.y}"
          stroke="rgba(255,255,255,.06)" stroke-width="1" stroke-dasharray="4 4"/>
        <text x="${PAD_L - 6}" y="${l.y + 4}" fill="rgba(255,255,255,.3)"
          font-size="9" text-anchor="end">${l.v}</text>
      `).join("")}

      <!-- Area fill -->
      <path d="${areaPath}" fill="url(#areaGrad)"/>

      <!-- Line with Progressive Animation -->
      <path id="dash-line-anim" d="${linePath}" fill="none" stroke="url(#lineGrad)" stroke-width="2.5" stroke-linecap="round" />
      <style>
        #dash-line-anim {
          stroke-dasharray: 2000;
          stroke-dashoffset: 2000;
          animation: drawDash 1.2s cubic-bezier(0.25, 1, 0.5, 1) forwards;
        }
        @keyframes drawDash {
          to { stroke-dashoffset: 0; }
        }
      </style>

      <!-- Dots + labels -->
      ${pts.map((p, i) => `
        <circle cx="${p.x}" cy="${p.y}" r="4" fill="${c1}" stroke="rgba(15,15,30,1)" stroke-width="2"/>
        <text x="${p.x}" y="${PAD_T + chartH + 20}" fill="rgba(255,255,255,.45)"
          font-size="10" text-anchor="middle">${p.label}</text>
        ${values[i] > 0 ? `
          <text x="${p.x}" y="${p.y - 9}" fill="rgba(255,255,255,.75)"
            font-size="9" text-anchor="middle" font-weight="700">${values[i]}${mode === "rate" ? "%" : mode === "xp" ? " XP" : ""}</text>
        ` : ""}
      `).join("")}
    </svg>`;

  if (legend) legend.innerHTML = `
    <div style="display:flex;align-items:center;gap:6px;font-size:12px;color:var(--muted)">
      <div style="width:24px;height:3px;border-radius:2px;background:linear-gradient(90deg,${c1},${c2})"></div>
      ${labels[mode]} — Last 7 days
    </div>
    <div style="margin-left:auto;font-size:12px;color:var(--muted)">
      Total: <strong style="color:var(--text)">${values.reduce((a, b) => a + b, 0)}${mode === "rate" ? "% avg" : mode === "xp" ? " XP" : ""}</strong>
    </div>`;
}

/* ══════════════════════════════════════
   FREEZE REWARD SYSTEM
   Earn 1 freeze after 7-day streak.
   Using 1 freeze protects streak for 1 missed day.
══════════════════════════════════════ */
function getFreezeData() {
  const raw = localStorage.getItem("hab_freeze");
  return raw ? JSON.parse(raw) : { count: 0, lastEarned: null, activeUntil: null };
}

function saveFreezeData(data) {
  localStorage.setItem("hab_freeze", JSON.stringify(data));
}

function renderFreezeStatus() {
  const container = document.getElementById("freeze-status");
  const banner = document.getElementById("freeze-banner");
  if (!container) return;

  const freeze = getFreezeData();
  const streak = parseInt(document.getElementById("dash-streak")?.textContent || "0");

  /* Award freeze if streak hit 7 (or multiples of 7) and not already awarded today */
  if (streak > 0 && streak % 7 === 0) {
    const now2 = new Date();
    const today = now2.getFullYear() + "-" +
      String(now2.getMonth() + 1).padStart(2, "0") + "-" +
      String(now2.getDate()).padStart(2, "0");
    if (freeze.lastEarned !== today) {
      freeze.count++;
      freeze.lastEarned = today;
      saveFreezeData(freeze);

      /* Show banner */
      if (banner) {
        banner.style.display = "block";
        banner.innerHTML = `
          <div style="display:flex;align-items:center;gap:14px">
            <div style="font-size:36px">🧊</div>
            <div style="flex:1">
              <div style="font-size:14px;font-weight:700;color:#7dd3fc">🎉 Streak Freeze Earned!</div>
              <div style="font-size:12px;color:rgba(255,255,255,.65);margin-top:3px">
                You hit a ${streak}-day streak! You earned a Streak Freeze. It will protect your streak if you miss a day.
              </div>
              <div style="font-size:12px;color:#7dd3fc;font-weight:700;margin-top:6px">
                ❄️ You now have ${freeze.count} freeze${freeze.count > 1 ? "s" : ""}
              </div>
            </div>
            <button onclick="document.getElementById('freeze-banner').style.display='none'"
              style="background:none;border:none;color:rgba(255,255,255,.4);cursor:pointer;font-size:18px;padding:4px">✕</button>
          </div>`;
      }
    }
  }

  /* Check if freeze should auto-activate (missed yesterday, has freeze) */
  checkFreezeActivation(freeze, streak);

  /* Render status in streak card */
  if (freeze.count === 0) {
    container.innerHTML = `
      <div style="text-align:center;padding:8px;border-radius:10px;background:rgba(255,255,255,.03);border:1px solid var(--border)">
        <div style="font-size:11px;color:var(--muted)">❄️ Streak Freeze</div>
        <div style="font-size:12px;color:var(--muted);margin-top:3px">
          ${streak >= 7
        ? "You just earned one!"
        : `Earn at <strong style="color:var(--cyan)">7-day streak</strong> (${7 - (streak % 7)} days to go)`}
        </div>
      </div>`;
  } else {
    container.innerHTML = `
      <div style="text-align:center;padding:10px;border-radius:10px;background:rgba(6,182,212,.08);border:1px solid rgba(6,182,212,.3)">
        <div style="font-size:13px;font-weight:700;color:var(--cyan)">❄️ ${freeze.count} Streak Freeze${freeze.count > 1 ? "s" : ""}</div>
        <div style="font-size:11px;color:rgba(6,182,212,.7);margin-top:3px">Protects your streak if you miss a day</div>
        <button onclick="useFreeze()"
          style="margin-top:8px;padding:5px 14px;border-radius:20px;background:rgba(6,182,212,.2);border:1px solid rgba(6,182,212,.4);color:var(--cyan);font-size:11px;font-weight:700;cursor:pointer">
          Use Freeze Now
        </button>
      </div>`;
  }
}

function checkFreezeActivation(freeze, streak) {
  /* If streak is 0 but user had a streak yesterday, auto-use a freeze */
  if (streak === 0 && freeze.count > 0 && !freeze.activeUntil) {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yStr = yesterday.toISOString().split("T")[0];

    /* Check if any habit was done yesterday */
    fetchAuth(`${API_BASE}/api/habits/analytics/logs`)
      .then(r => r.json())
      .then(data => {
        if (data.heatmap && data.heatmap[yStr]) {
          /* Had activity yesterday, streak drop must be today — auto activate */
          autoActivateFreeze(freeze);
        }
      }).catch(() => { });
  }
}

function autoActivateFreeze(freeze) {
  const now2 = new Date();
  const today = now2.getFullYear() + "-" +
    String(now2.getMonth() + 1).padStart(2, "0") + "-" +
    String(now2.getDate()).padStart(2, "0");
  freeze.count--;
  freeze.activeUntil = today;
  saveFreezeData(freeze);

  const banner = document.getElementById("freeze-banner");
  if (banner) {
    banner.style.display = "block";
    banner.innerHTML = `
      <div style="display:flex;align-items:center;gap:14px">
        <div style="font-size:32px">🧊</div>
        <div>
          <div style="font-size:14px;font-weight:700;color:#7dd3fc">❄️ Streak Freeze Auto-Activated!</div>
          <div style="font-size:12px;color:rgba(255,255,255,.65);margin-top:3px">
            Your streak is protected for today. Complete a habit to restore it tomorrow.
          </div>
          <div style="font-size:12px;color:var(--muted);margin-top:4px">Freezes remaining: ${freeze.count}</div>
        </div>
      </div>`;
  }
  showToast("🧊 Streak Freeze auto-activated! Your streak is safe.");
}

function useFreeze() {
  const freeze = getFreezeData();
  if (freeze.count <= 0) { showToast("❌ No freezes available"); return; }
  const now2 = new Date();
  const today = now2.getFullYear() + "-" +
    String(now2.getMonth() + 1).padStart(2, "0") + "-" +
    String(now2.getDate()).padStart(2, "0");
  freeze.count--;
  freeze.activeUntil = today;
  saveFreezeData(freeze);
  showToast("🧊 Streak Freeze activated! Your streak is protected today.");
  renderFreezeStatus();
}

function animateRing() {
  const done = window.habits.filter(h => h.done).length;
  const pct = window.habits.length ? done / window.habits.length : 0;
  const circ = 377;
  const el = document.getElementById("dash-ring");
  if (!el) return;
  el.style.transition = "stroke-dashoffset 1.2s cubic-bezier(.22,1,.36,1)";
  el.style.strokeDashoffset = circ - pct * circ;
  const sc = document.getElementById("dash-score");
  if (!sc) return;
  let cur = parseInt(sc.textContent) || 0;
  const tgt = Math.round(pct * 100);
  const t0 = performance.now();
  const step = now => {
    const p = Math.min((now - t0) / 800, 1);
    sc.textContent = Math.round(cur + (tgt - cur) * easeOut(p)) + "%";
    if (p < 1) requestAnimationFrame(step);
  };
  requestAnimationFrame(step);
}

function renderRingStats() {
  /* Dynamically calculate per-category completion from real habits */
  const catColors = {
    "Mind": "#7c3aed",
    "Health": "#22c55e",
    "Fitness": "#22c55e",
    "Learn": "#3b82f6",
    "Productivity": "#f59e0b",
    "Custom": "#ec4899",
    "General": "#06b6d4"
  };

  const habits = window.habits || [];
  const catMap = {};
  habits.forEach(h => {
    const cat = h.category || "General";
    if (!catMap[cat]) catMap[cat] = { total: 0, done: 0 };
    catMap[cat].total++;
    if (h.done) catMap[cat].done++;
  });

  const cats = Object.keys(catMap).map(cat => ({
    name: cat,
    color: catColors[cat] || "#7c3aed",
    val: catMap[cat].total ? Math.round((catMap[cat].done / catMap[cat].total) * 100) : 0
  }));

  /* Fallback if no habits */
  if (!cats.length) {
    ["Mind & Focus", "Health & Body", "Learning", "Productivity"].forEach((name, i) => {
      cats.push({ name, color: ["#7c3aed", "#22c55e", "#3b82f6", "#f59e0b"][i], val: 0 });
    });
  }

  const container = document.getElementById("dash-ring-stats");
  if (!container) return;
  container.innerHTML = cats.slice(0, 4).map(x => `
    <div class="ring-stat">
      <div class="rs-dot" style="background:${x.color}"></div>
      <div class="rs-info">
        <div class="rs-name">${x.name}</div>
        <div class="rs-bar-w"><div class="rs-bar" style="background:${x.color};width:0%" data-t="${x.val}"></div></div>
      </div>
      <div class="rs-val" style="color:${x.color}">${x.val}%</div>
    </div>`).join("");
  setTimeout(() => container.querySelectorAll(".rs-bar").forEach(b => b.style.width = b.dataset.t + "%"), 300);
}