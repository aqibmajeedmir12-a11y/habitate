/* ══════════════════════════════════════
   AI.JS — Achievements, Schedule, Calendar logic
══════════════════════════════════════ */

/* ─── ACHIEVEMENTS ─── */
async function renderAchievements() {
  try {
    const resHabits = await fetchAuth(`${API_BASE}/api/habits`);
    const habitsData = await resHabits.json();
    const maxStreak = Math.max(0, ...habitsData.map(h => h.streak || 0));

    const grid = document.getElementById("ach-grid");
    if (!grid) return;

    let unlockedCount = 0;
    let totalXP = 0;

    grid.innerHTML = window.achievements.map(a => {
      const unlocked = maxStreak >= (a.requiredStreak || 9999);
      const progress = Math.min((maxStreak / (a.requiredStreak || 1)) * 100, 100);
      if (unlocked) { unlockedCount++; totalXP += a.xp || 0; }
      return `
        <div class="ach-card ${unlocked ? "unlocked" : "locked"}">
          <div class="ach-icon">${a.icon}</div>
          <div class="ach-name">${a.name}</div>
          <div class="ach-desc">${a.desc}</div>
          <div class="ach-badge ${(a.tier || "bronze").toLowerCase()}">${unlocked ? "Unlocked" : "Locked"} • ${a.tier}</div>
          <div style="font-size:12px;color:var(--muted)">+${a.xp || 0} XP</div>
          ${!unlocked ? `<div class="ach-progress-w"><div class="ach-progress" style="width:${progress}%"></div></div>` : ""}
        </div>`;
    }).join("");

    const lockedCount = window.achievements.length - unlockedCount;
    const completion = Math.round(unlockedCount / window.achievements.length * 100);

    const achUnlocked = document.getElementById("ach-unlocked");
    const achLocked = document.getElementById("ach-locked");
    const achCompletion = document.getElementById("ach-completion");
    const achXp = document.getElementById("ach-xp");
    if (achUnlocked) achUnlocked.textContent = unlockedCount;
    if (achLocked) achLocked.textContent = lockedCount;
    if (achCompletion) achCompletion.textContent = completion + "%";
    if (achXp) achXp.textContent = totalXP;
  } catch (err) {
    console.error("Achievements error:", err);
  }
}

/* ─── SCHEDULE ─── */
async function renderSchedule() {
  try {
    const res = await fetchAuth(`${API_BASE}/api/schedule`);
    const data = await res.json();

    const days = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
    const grid = document.getElementById("schedule-grid");
    if (!grid) return;

    const grouped = {};
    data.forEach(item => {
      const day = parseInt(item.weekday);
      if (!grouped[day]) grouped[day] = [];
      const exists = grouped[day].some(h =>
        (item.id && h.id === item.id) ||
        (h.name === item.name && h.weekday === item.weekday)
      );
      if (!exists) grouped[day].push(item);
    });

    grid.innerHTML = days.map((day, i) => {
      const dayHabits = grouped[i] || [];
      return `
        <div class="sched-day">
          <div class="sched-day-name">${day}</div>
          ${dayHabits.length
          ? dayHabits.map(h => `<div class="sched-habit" style="background:${h.color}22;color:${h.color};border:1px solid ${h.color}55">${h.emoji} ${h.name}</div>`).join("")
          : `<div style="font-size:11px;color:var(--muted)">No habits</div>`}
        </div>`;
    }).join("");
  } catch (err) {
    console.error("Schedule Load Error:", err);
  }
}

/* ─── CALENDAR — LeetCode Heatmap Style ─── */
async function renderCalendar() {
  const container = document.getElementById("calendar-grid");
  if (!container) return;
  try {
    const res = await fetchAuth(`${API_BASE}/api/habits/analytics/logs`);
    const data = await res.json();
    const heatmap = data.heatmap || {};

    /* Build a full 52-week grid (364 days back from today) */
    const today = new Date();
    const DAY_MS = 86400000;
    const WEEKS = 52;
    const COLS = WEEKS;

    /* Go back to the nearest Sunday */
    const startDate = new Date(today);
    startDate.setDate(startDate.getDate() - (WEEKS * 7 - 1));

    /* Day labels */
    const dayLabels = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

    /* Month labels — collect which col each month starts */
    const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const monthCols = {};

    /* Build all cells grouped by week column */
    const weeks = [];
    for (let w = 0; w < COLS; w++) {
      const week = [];
      for (let d = 0; d < 7; d++) {
        const date = new Date(startDate.getTime() + (w * 7 + d) * DAY_MS);
        const dateStr = date.toISOString().split("T")[0];
        const count = heatmap[dateStr] || 0;
        const isFuture = date > today;

        /* Track month label position */
        if (date.getDate() === 1) {
          monthCols[w] = monthNames[date.getMonth()];
        }

        week.push({ dateStr, count, isFuture, date });
      }
      weeks.push(week);
    }

    /* Intensity levels (0-4) like LeetCode */
    function getLevel(count) {
      if (count === 0) return 0;
      if (count === 1) return 1;
      if (count <= 3) return 2;
      if (count <= 6) return 3;
      return 4;
    }

    const levelColors = [
      "rgba(255,255,255,.06)",   /* 0 - empty */
      "rgba(124,58,237,.35)",    /* 1 - light */
      "rgba(124,58,237,.55)",    /* 2 - medium */
      "rgba(124,58,237,.78)",    /* 3 - strong */
      "rgba(124,58,237,1)"       /* 4 - full */
    ];

    /* Render */
    container.innerHTML = `
      <div class="heatmap-wrap">

        <!-- Month labels row -->
        <div class="heatmap-month-row">
          <div class="heatmap-day-spacer"></div>
          <div class="heatmap-months">
            ${weeks.map((_, w) => `
              <div class="heatmap-month-label">${monthCols[w] || ""}</div>
            `).join("")}
          </div>
        </div>

        <!-- Day labels + grid -->
        <div class="heatmap-body">
          <div class="heatmap-day-labels">
            ${dayLabels.map((d, i) => `
              <div class="heatmap-day-label">${i % 2 === 1 ? d : ""}</div>
            `).join("")}
          </div>
          <div class="heatmap-grid">
            ${weeks.map(week => `
              <div class="heatmap-col">
                ${week.map(cell => {
      const level = cell.isFuture ? 0 : getLevel(cell.count);
      const label = cell.date.toLocaleDateString("en-US", { weekday: "short", year: "numeric", month: "short", day: "numeric" });
      const tip = cell.count > 0
        ? `${label} · ${cell.count} habit${cell.count > 1 ? "s" : ""} completed`
        : cell.isFuture
          ? label
          : `${label} · No habits completed`;
      return `<div
                    class="heatmap-cell"
                    style="background:${levelColors[level]};${cell.isFuture ? "opacity:.25" : ""}"
                    data-tip="${tip}"
                  ></div>`;
    }).join("")}
              </div>
            `).join("")}
          </div>
        </div>

        <!-- Legend -->
        <div class="heatmap-legend">
          <span style="font-size:11px;color:var(--muted)">Less</span>
          ${levelColors.map(c => `<div class="heatmap-legend-cell" style="background:${c}"></div>`).join("")}
          <span style="font-size:11px;color:var(--muted)">More</span>

          <!-- Tooltip (shared, positioned by JS) -->
          <div class="heatmap-tooltip" id="heatmap-tooltip"></div>
        </div>

        <!-- Stats row -->
        <div class="heatmap-stats">
          <div class="heatmap-stat">
            <span class="heatmap-stat-val" id="hm-total">${Object.values(heatmap).reduce((a, b) => a + b, 0)}</span>
            <span class="heatmap-stat-label">Total completions</span>
          </div>
          <div class="heatmap-stat">
            <span class="heatmap-stat-val" id="hm-days">${Object.keys(heatmap).length}</span>
            <span class="heatmap-stat-label">Active days</span>
          </div>
          <div class="heatmap-stat">
            <span class="heatmap-stat-val" id="hm-streak">${(() => {
        const sortedDates = Object.keys(heatmap).sort();
        if (sortedDates.length === 0) return 0;
        let maxStreak = 1;
        let currentStreak = 1;

        for (let i = 1; i < sortedDates.length; i++) {
          const date1 = new Date(sortedDates[i - 1]);
          const date2 = new Date(sortedDates[i]);

          // Calculate difference in whole days
          const diffTime = Math.abs(date2 - date1);
          const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

          if (diffDays === 1) {
            currentStreak++;
            maxStreak = Math.max(maxStreak, currentStreak);
          } else {
            currentStreak = 1;
          }
        }
        return maxStreak;
      })()}</span>
            <span class="heatmap-stat-label">Best streak</span>
          </div>
        </div>
      </div>`;

    /* Tooltip logic */
    const tooltip = document.getElementById("heatmap-tooltip");
    document.querySelectorAll(".heatmap-cell").forEach(cell => {
      cell.addEventListener("mouseenter", e => {
        tooltip.textContent = cell.dataset.tip;
        tooltip.style.opacity = "1";
        tooltip.style.visibility = "visible";
      });
      cell.addEventListener("mousemove", e => {
        const wrap = container.querySelector(".heatmap-wrap").getBoundingClientRect();
        tooltip.style.left = (e.clientX - wrap.left + 12) + "px";
        tooltip.style.top = (e.clientY - wrap.top - 36) + "px";
      });
      cell.addEventListener("mouseleave", () => {
        tooltip.style.opacity = "0";
        tooltip.style.visibility = "hidden";
      });
    });

  } catch (err) {
    console.error("Calendar error:", err);
    container.innerHTML = '<div style="color:var(--muted);font-size:13px;padding:20px">Unable to load heatmap.</div>';
  }
}