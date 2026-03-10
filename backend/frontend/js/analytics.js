/* ══════════════════════════════════════
   ANALYTICS.JS — Analytics page logic
══════════════════════════════════════ */

async function renderAnalytics() {
  try {
    const [resSummary, resLogs] = await Promise.all([
      fetchAuth(`${API_BASE}/api/habits/analytics/summary`),
      fetchAuth(`${API_BASE}/api/habits/analytics/logs`)
    ]);
    const data = await resSummary.json();
    const logsData = await resLogs.json();

    const weeklyEl = document.getElementById("an-weekly");
    const completedEl = document.getElementById("an-completed");
    const startEl = document.getElementById("an-start");
    const gradeEl = document.getElementById("an-grade");

    if (weeklyEl) weeklyEl.textContent = data.completionRate + "%";
    if (completedEl) completedEl.textContent = data.completed;
    if (startEl) startEl.textContent = "7:00";
    if (gradeEl) gradeEl.textContent =
      data.completionRate >= 80 ? "A+" :
        data.completionRate >= 60 ? "A" :
          data.completionRate >= 40 ? "B" : "C";

    renderBarChartFromDB(data);
    renderDonutFromDB(data.categories);
    renderTopStreaksFromDB(data.topStreaks);
    renderTimeChartFromDB(data);

    renderAnalyticsProgressChart(logsData.heatmap || {});
  } catch (err) {
    console.error("Analytics error:", err);
  }
}

function renderBarChartFromDB(data) {
  const c = document.getElementById("bar-chart");
  if (!c) return;
  const days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
  const weekly = data.weekly || {};
  const max = Math.max(...Object.values(weekly), 1);
  c.innerHTML = `<div style="display:flex;align-items:flex-end;gap:8px;height:140px;padding-bottom:24px;position:relative">` +
    days.map(d => {
      const value = weekly[d] || 0;
      const pct = Math.round(value / max * 100);
      return `
        <div style="flex:1;display:flex;flex-direction:column;align-items:center;gap:4px;height:100%;justify-content:flex-end">
          <div style="font-size:10px;font-weight:700;color:var(--text)">${value}</div>
          <div style="width:100%;height:${Math.max(pct, 4)}%;background:var(--grad1);border-radius:6px 6px 0 0;min-height:4px"></div>
          <div style="font-size:10px;color:var(--muted);font-weight:600">${d}</div>
        </div>`;
    }).join("") + `</div>`;
}

function renderDonutFromDB(categories) {
  if (!categories) return;
  const total = Object.values(categories).reduce((a, b) => a + b, 0);
  const circ = 314;
  let offset = 0;
  const donutColors = ["#7c3aed", "#22c55e", "#3b82f6", "#f59e0b", "#ec4899"];
  const keys = Object.keys(categories);
  keys.slice(0, 3).forEach((cat, i) => {
    const el = document.getElementById("donut" + (i + 1));
    if (!el) return;
    const pct = (categories[cat] / total) * 100;
    const dash = circ * pct / 100;
    el.style.stroke = donutColors[i];
    el.style.strokeDasharray = `${dash} ${circ}`;
    el.style.strokeDashoffset = -offset;
    offset += dash;
  });
  const leg = document.getElementById("donut-legend");
  if (!leg) return;
  leg.innerHTML = keys.map((cat, i) => {
    const pct = Math.round((categories[cat] / total) * 100);
    return `<div class="donut-leg-item">
      <div class="dl-dot" style="background:${donutColors[i]}"></div>
      <div class="dl-name">${cat}</div>
      <div class="dl-pct">${pct}%</div>
    </div>`;
  }).join("");
}

function renderTopStreaksFromDB(streaks) {
  const c = document.getElementById("top-streaks");
  if (!c || !streaks) return;
  c.innerHTML = streaks.map((h, i) => `
    <div style="display:flex;align-items:center;gap:10px;margin-bottom:12px">
      <div style="font-weight:700;width:20px">${i + 1}</div>
      <div style="font-size:20px">${h.emoji}</div>
      <div style="flex:1">
        <div style="font-size:13px;font-weight:600">${h.name}</div>
        <div style="height:5px;background:rgba(255,255,255,.08);border-radius:10px;margin-top:5px">
          <div style="height:100%;border-radius:10px;background:${h.color};width:${Math.min(h.streak / 30 * 100, 100)}%"></div>
        </div>
      </div>
      <div style="font-weight:700;color:#f59e0b">🔥${h.streak}</div>
    </div>`).join("");
}

function renderTimeChartFromDB(data) {
  const pct = data.completionRate || 0;
  const slots = [
    { label: "6–9 AM", pct: pct + 10, color: "#7c3aed" },
    { label: "9–12 PM", pct: pct - 5, color: "#3b82f6" },
    { label: "12–3 PM", pct: pct - 15, color: "#06b6d4" },
    { label: "3–6 PM", pct: pct - 8, color: "#22c55e" },
    { label: "6–9 PM", pct: pct + 4, color: "#f59e0b" },
    { label: "9–12 AM", pct: pct - 20, color: "#ec4899" },
  ].map(s => ({ ...s, pct: Math.max(0, Math.min(100, s.pct)) }));
  const c = document.getElementById("time-chart");
  if (!c) return;
  c.innerHTML = slots.map(s => `
    <div style="display:flex;align-items:center;gap:10px;margin-bottom:10px">
      <div style="font-size:11px;color:var(--muted);font-weight:600;width:60px">${s.label}</div>
      <div style="flex:1;height:8px;background:rgba(255,255,255,.07);border-radius:10px;overflow:hidden">
        <div style="height:100%;border-radius:10px;background:${s.color};width:${s.pct}%"></div>
      </div>
      <div style="font-size:12px;font-weight:700;color:${s.color};width:30px">${s.pct}%</div>
    </div>`).join("");
}

/* ══════════════════════════════════════
   ANALYTICS PROGRESS CHART — 30 days
══════════════════════════════════════ */
window._analyticsProgressData = null;

function renderAnalyticsProgressChart(heatmap) {
  const days = [];
  for (let i = 29; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const key = d.toISOString().split("T")[0];
    const label = i % 5 === 0
      ? d.toLocaleDateString("en-US", { month: "short", day: "numeric" })
      : "";
    days.push({
      label,
      key,
      completions: heatmap[key] || 0,
      rate: heatmap[key]
        ? Math.min(100, Math.round((heatmap[key] / Math.max(window.habits?.length || 1, 1)) * 100))
        : 0
    });
  }
  window._analyticsProgressData = days;
  drawAnalyticsChart(days, "completions");
}

function switchAnalyticsChart(mode, btn) {
  document.querySelectorAll("#page-analytics .chart-tab").forEach(b => b.classList.remove("active"));
  btn.classList.add("active");
  if (window._analyticsProgressData) drawAnalyticsChart(window._analyticsProgressData, mode);
}

function drawAnalyticsChart(days, mode) {
  const container = document.getElementById("analytics-progress-chart");
  const legend = document.getElementById("analytics-progress-legend");
  if (!container) return;

  const values = days.map(d => d[mode]);
  const max = Math.max(...values, 1);
  const colors = {
    completions: ["#7c3aed", "#3b82f6"],
    rate: ["#22c55e", "#06b6d4"]
  };
  const labels = { completions: "Habits Completed", rate: "Completion Rate (%)" };
  const [c1, c2] = colors[mode] || colors.completions;

  const W = container.clientWidth || 700;
  const H = 190;
  const PAD_L = 36, PAD_R = 12, PAD_T = 16, PAD_B = 28;
  const chartW = W - PAD_L - PAD_R;
  const chartH = H - PAD_T - PAD_B;

  const pts = days.map((d, i) => ({
    x: PAD_L + (i / (days.length - 1)) * chartW,
    y: PAD_T + chartH - (values[i] / max) * chartH,
    val: values[i],
    label: d.label
  }));

  function smooth(pts) {
    if (pts.length < 2) return `M${pts[0].x},${pts[0].y}`;
    let path = `M${pts[0].x},${pts[0].y}`;
    for (let i = 0; i < pts.length - 1; i++) {
      const cx = (pts[i].x + pts[i + 1].x) / 2;
      path += ` C${cx},${pts[i].y} ${cx},${pts[i + 1].y} ${pts[i + 1].x},${pts[i + 1].y}`;
    }
    return path;
  }

  const linePath = smooth(pts);
  const areaPath = linePath
    + ` L${pts[pts.length - 1].x},${PAD_T + chartH} L${pts[0].x},${PAD_T + chartH} Z`;

  const yLabels = [0, Math.round(max / 2), max].map(v => ({
    v, y: PAD_T + chartH - (v / max) * chartH
  }));

  container.innerHTML = `
    <svg width="100%" height="${H}" viewBox="0 0 ${W} ${H}" preserveAspectRatio="none" style="overflow:visible">
      <defs>
        <linearGradient id="aLineGrad" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stop-color="${c1}"/>
          <stop offset="100%" stop-color="${c2}"/>
        </linearGradient>
        <linearGradient id="aAreaGrad" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stop-color="${c1}" stop-opacity="0.2"/>
          <stop offset="100%" stop-color="${c1}" stop-opacity="0"/>
        </linearGradient>
      </defs>
      ${yLabels.map(l => `
        <line x1="${PAD_L}" y1="${l.y}" x2="${W - PAD_R}" y2="${l.y}"
          stroke="rgba(255,255,255,.06)" stroke-width="1" stroke-dasharray="4 4"/>
        <text x="${PAD_L - 5}" y="${l.y + 4}" fill="rgba(255,255,255,.3)"
          font-size="9" text-anchor="end">${l.v}</text>
      `).join("")}
      <path d="${areaPath}" fill="url(#aAreaGrad)"/>
      <path d="${linePath}" fill="none" stroke="url(#aLineGrad)" stroke-width="2" stroke-linecap="round"/>
      ${pts.map(p => `
        ${p.val > 0 ? `<circle cx="${p.x}" cy="${p.y}" r="3" fill="${c1}" stroke="rgba(15,15,30,1)" stroke-width="1.5"/>` : ""}
        ${p.label ? `<text x="${p.x}" y="${PAD_T + chartH + 18}" fill="rgba(255,255,255,.4)" font-size="9" text-anchor="middle">${p.label}</text>` : ""}
      `).join("")}
    </svg>`;

  if (legend) legend.innerHTML = `
    <div style="display:flex;align-items:center;gap:6px;font-size:12px;color:var(--muted)">
      <div style="width:24px;height:3px;border-radius:2px;background:linear-gradient(90deg,${c1},${c2})"></div>
      ${labels[mode]} — Last 30 days
    </div>
    <div style="margin-left:auto;font-size:12px;color:var(--muted)">
      Total: <strong style="color:var(--text)">${values.reduce((a, b) => a + b, 0)}${mode === "rate" ? "% avg" : ""}</strong>
    </div>`;
}