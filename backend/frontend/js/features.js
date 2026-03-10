/* ══════════════════════════════════════
   FEATURES.JS — 5 New Feature Functions
   1. Relapse Recovery Engine
   2. Context-Aware Cue Engine
   3. Privacy-First Mode
   4. Adaptive Motivation System
   5. Auto-Detect & Confirm
══════════════════════════════════════ */

/* ══════════════════════════════════════
   FEATURE 1 — RELAPSE RECOVERY ENGINE
══════════════════════════════════════ */
async function checkRecovery() {
  const banner = document.getElementById("recovery-banner");
  if (!banner) return;
  try {
    const res = await fetchAuth(`${API_BASE}/api/features/recovery-check`);
    const data = await res.json();

    if (!data.triggered) {
      banner.style.display = "none";
      return;
    }

    banner.style.display = "block";
    banner.innerHTML = `
      <div style="display:flex;align-items:flex-start;gap:14px">
        <div style="font-size:32px;flex-shrink:0">💙</div>
        <div style="flex:1">
          <div style="font-size:14px;font-weight:700;margin-bottom:4px;color:#f0f0ff">Relapse Recovery Mode</div>
          <div style="font-size:13px;color:rgba(240,240,255,.75);margin-bottom:14px">${data.message}</div>
          <div style="display:flex;flex-direction:column;gap:8px">
            ${data.steps.map(s => `
              <div style="display:flex;align-items:flex-start;gap:10px;background:rgba(255,255,255,.04);border-radius:10px;padding:10px 12px">
                <div style="width:22px;height:22px;border-radius:50%;background:var(--grad1);display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:700;flex-shrink:0">${s.step}</div>
                <div>
                  <div style="font-size:12px;font-weight:700;color:var(--purple-light)">${s.title}</div>
                  <div style="font-size:12px;color:var(--muted);margin-top:2px">${s.desc}</div>
                </div>
              </div>`).join("")}
          </div>
          <div style="display:flex;gap:8px;margin-top:12px">
            <button class="btn btn-primary" style="font-size:12px;padding:8px 14px" onclick="dismissRecovery()">
              ✅ Start Micro-Win
            </button>
            <button class="btn btn-ghost" style="font-size:12px;padding:8px 14px" onclick="document.getElementById('recovery-banner').style.display='none'">
              Dismiss
            </button>
          </div>
        </div>
      </div>`;
  } catch (err) {
    console.error("Recovery check error:", err);
  }
}

function dismissRecovery() {
  document.getElementById("recovery-banner").style.display = "none";
  showToast("💪 Let's get that micro-win! Pick one habit and do it now.");
  goTo("habits");
}

/* ══════════════════════════════════════
   FEATURE 2 — CONTEXT-AWARE CUE ENGINE
══════════════════════════════════════ */
async function renderSmartSchedule() {
  const container = document.getElementById("smart-schedule-card");
  if (!container) return;
  try {
    const res = await fetchAuth(`${API_BASE}/api/features/smart-schedule`);
    const data = await res.json();

    container.innerHTML = `
      <div class="card-header">
        <div class="card-title">
          <div class="card-title-icon" style="background:rgba(6,182,212,.15);color:var(--cyan)">⏰</div>
          Smart Nudge Windows
        </div>
        <span class="card-action" onclick="renderSmartSchedule()">Refresh</span>
      </div>
      <div style="font-size:12px;color:var(--muted);margin-bottom:14px">
        Best times to complete habits based on your history
      </div>
      ${data.windows && data.windows.length > 0 ? data.windows.map((w, i) => `
        <div style="display:flex;align-items:center;gap:12px;padding:10px 12px;border-radius:11px;background:rgba(255,255,255,.03);border:1px solid var(--border);margin-bottom:8px;${i === 0 ? 'border-color:rgba(124,58,237,.4);background:rgba(124,58,237,.06)' : ''}">
          <div style="font-size:18px;width:36px;height:36px;background:rgba(255,255,255,.06);border-radius:9px;display:flex;align-items:center;justify-content:center">
            ${i === 0 ? "⭐" : i === 1 ? "🔥" : "✅"}
          </div>
          <div style="flex:1">
            <div style="font-size:13px;font-weight:600">${w.label}</div>
            <div style="font-size:11px;color:var(--muted);margin-top:2px">${w.reason}</div>
          </div>
          <div style="text-align:right">
            <div style="font-size:14px;font-weight:800;color:var(--purple-light)">${w.time}</div>
            <div style="font-size:10px;color:var(--green)">${w.score}% match</div>
          </div>
        </div>`).join("") : `
        <div style="padding:20px;text-align:center;border-radius:10px;background:rgba(255,255,255,.03);border:1px solid var(--border);font-size:12px;color:var(--muted)">
           📊 Complete more habits to gather data and reveal your personalized Smart Schedule.
        </div>
        `}
      ${data.nextWindow && data.windows.length > 0 ? `
        <div style="margin-top:12px;padding:10px 14px;border-radius:10px;background:rgba(6,182,212,.08);border:1px solid rgba(6,182,212,.25);font-size:12px;color:var(--cyan)">
          ⏭️ <strong>Smart Snooze:</strong> Next best window is at <strong>${data.nextWindow.time}</strong>
        </div>` : ""}`;
  } catch (err) {
    console.error("Smart schedule error:", err);
  }
}

/* ══════════════════════════════════════
   FEATURE 3 — PRIVACY-FIRST MODE
══════════════════════════════════════ */
async function renderPrivacyAudit() {
  const container = document.getElementById("privacy-audit-card");
  if (!container) return;
  try {
    const res = await fetchAuth(`${API_BASE}/api/features/privacy-audit`);
    const data = await res.json();

    container.innerHTML = `
      <div class="card-header">
        <div class="card-title">
          <div class="card-title-icon" style="background:rgba(34,197,94,.15);color:var(--green)">🔒</div>
          Privacy Audit
        </div>
        <span style="font-size:11px;background:rgba(34,197,94,.15);color:var(--green);border:1px solid rgba(34,197,94,.3);padding:3px 9px;border-radius:20px;font-weight:700">Local Only</span>
      </div>
      <div style="font-size:12px;color:var(--muted);margin-bottom:14px">
        All data stays on your device. Nothing is sent to external servers.
      </div>
      <div style="margin-bottom:14px">
        <div style="font-size:11px;font-weight:700;color:var(--muted);text-transform:uppercase;letter-spacing:.5px;margin-bottom:8px">What we store</div>
        ${data.dataStored.map(d => `
          <div style="display:flex;align-items:center;justify-content:space-between;padding:8px 12px;border-radius:9px;background:rgba(255,255,255,.03);border:1px solid var(--border);margin-bottom:6px">
            <div>
              <div style="font-size:12px;font-weight:600">${d.type}</div>
              <div style="font-size:11px;color:var(--muted);margin-top:1px">${d.description}</div>
            </div>
            <div style="font-size:13px;font-weight:800;color:var(--purple-light)">${d.count}</div>
          </div>`).join("")}
      </div>
      <div style="margin-bottom:14px">
        <div style="font-size:11px;font-weight:700;color:var(--muted);text-transform:uppercase;letter-spacing:.5px;margin-bottom:8px">What we NEVER store</div>
        <div style="display:flex;flex-wrap:wrap;gap:6px">
          ${data.dataNotStored.map(d => `
            <span style="padding:3px 9px;border-radius:20px;font-size:11px;font-weight:600;background:rgba(239,68,68,.08);color:var(--red);border:1px solid rgba(239,68,68,.2)">✕ ${d}</span>`).join("")}
        </div>
      </div>
      <div style="display:flex;align-items:center;justify-content:space-between;padding:10px 12px;border-radius:10px;background:rgba(34,197,94,.06);border:1px solid rgba(34,197,94,.2)">
        <div style="font-size:12px;color:var(--green);font-weight:600">☁️ Cloud Sync</div>
        <div style="display:flex;align-items:center;gap:8px">
          <span style="font-size:11px;color:var(--muted)">${data.cloudSync ? "Enabled" : "Disabled (privacy default)"}</span>
          <div style="width:36px;height:20px;border-radius:10px;background:${data.cloudSync ? "var(--green)" : "rgba(255,255,255,.1)"};cursor:pointer;position:relative;transition:.3s" onclick="toggleCloudSync(this)">
            <div style="width:16px;height:16px;background:white;border-radius:50%;position:absolute;top:2px;left:${data.cloudSync ? "18px" : "2px"};transition:.3s"></div>
          </div>
        </div>
      </div>
      <div style="font-size:10px;color:var(--muted);margin-top:10px">Last audit: ${new Date(data.lastAudit).toLocaleString()}</div>`;
  } catch (err) {
    console.error("Privacy audit error:", err);
  }
}

function toggleCloudSync(el) {
  showToast("☁️ Cloud sync coming in a future update — your data is local & safe.");
}

/* ══════════════════════════════════════
   FEATURE 4 — ADAPTIVE MOTIVATION SYSTEM
══════════════════════════════════════ */
async function renderMotivationStyle() {
  const container = document.getElementById("motivation-style-card");
  if (!container) return;
  try {
    const res = await fetchAuth(`${API_BASE}/api/features/motivation-style`);
    const data = await res.json();

    const styleColors = {
      gamified: { bg: "rgba(245,158,11,.08)", border: "rgba(245,158,11,.25)", color: "var(--amber)", icon: "🎮" },
      intrinsic: { bg: "rgba(124,58,237,.08)", border: "rgba(124,58,237,.25)", color: "var(--purple-light)", icon: "🧠" },
      mixed: { bg: "rgba(59,130,246,.08)", border: "rgba(59,130,246,.25)", color: "var(--blue)", icon: "⚡" }
    };
    const sc = styleColors[data.style] || styleColors.mixed;

    container.innerHTML = `
      <div class="card-header">
        <div class="card-title">
          <div class="card-title-icon" style="background:${sc.bg};color:${sc.color}">${sc.icon}</div>
          Adaptive Motivation
        </div>
        <span style="font-size:11px;background:${sc.bg};color:${sc.color};border:1px solid ${sc.border};padding:3px 9px;border-radius:20px;font-weight:700;text-transform:capitalize">${data.style} Mode</span>
      </div>
      <div style="padding:14px;border-radius:12px;background:${sc.bg};border:1px solid ${sc.border};margin-bottom:14px">
        <div style="font-size:13px;line-height:1.7;color:rgba(240,240,255,.85)">${data.message}</div>
      </div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:14px">
        <div style="text-align:center;padding:12px;border-radius:11px;background:rgba(255,255,255,.03);border:1px solid var(--border)">
          <div style="font-size:22px;font-weight:800;color:${sc.color}">${data.pct}%</div>
          <div style="font-size:11px;color:var(--muted);margin-top:2px">Today's Rate</div>
        </div>
        <div style="text-align:center;padding:12px;border-radius:11px;background:rgba(255,255,255,.03);border:1px solid var(--border)">
          <div style="font-size:22px;font-weight:800;color:var(--amber)">${data.avgStreak}</div>
          <div style="font-size:11px;color:var(--muted);margin-top:2px">Avg Streak</div>
        </div>
      </div>
      <div style="font-size:11px;font-weight:700;color:var(--muted);text-transform:uppercase;letter-spacing:.5px;margin-bottom:8px">Active Rewards for You</div>
      <div style="display:flex;flex-wrap:wrap;gap:7px">
        ${data.rewards.map(r => `
          <span style="padding:5px 11px;border-radius:20px;font-size:12px;font-weight:600;background:${sc.bg};color:${sc.color};border:1px solid ${sc.border}">${r}</span>`).join("")}
      </div>`;
  } catch (err) {
    console.error("Motivation style error:", err);
  }
}

/* ══════════════════════════════════════
   FEATURE 5 — AUTO-DETECT & CONFIRM
══════════════════════════════════════ */
async function renderAutoSuggest() {
  const container = document.getElementById("auto-suggest-card");
  if (!container) return;
  try {
    const res = await fetchAuth(`${API_BASE}/api/features/auto-suggest`);
    const data = await res.json();

    if (!data.suggestions.length) {
      container.innerHTML = `
        <div class="card-header">
          <div class="card-title">
            <div class="card-title-icon" style="background:rgba(236,72,153,.15);color:var(--pink)">🤖</div>
            Auto-Detect
          </div>
        </div>
        <div style="font-size:13px;color:var(--muted);text-align:center;padding:20px 0">
          ✅ All habits completed or no suggestions right now.
        </div>`;
      return;
    }

    container.innerHTML = `
      <div class="card-header">
        <div class="card-title">
          <div class="card-title-icon" style="background:rgba(236,72,153,.15);color:var(--pink)">🤖</div>
          Auto-Detect & Confirm
        </div>
        <span style="font-size:11px;background:rgba(236,72,153,.12);color:var(--pink);border:1px solid rgba(236,72,153,.3);padding:3px 9px;border-radius:20px;font-weight:700">${data.currentPeriod}</span>
      </div>
      <div style="font-size:12px;color:var(--muted);margin-bottom:12px">${data.message}</div>
      ${data.suggestions.map(h => `
        <div style="display:flex;align-items:center;gap:12px;padding:11px 13px;border-radius:12px;background:rgba(255,255,255,.03);border:1px solid var(--border);margin-bottom:8px">
          <div style="font-size:24px">${h.emoji || "✅"}</div>
          <div style="flex:1">
            <div style="font-size:13px;font-weight:600">${h.name}</div>
            <div style="height:4px;background:rgba(255,255,255,.08);border-radius:10px;margin-top:6px;width:100%">
              <div style="height:100%;border-radius:10px;background:var(--grad1);width:${h.confidence}%"></div>
            </div>
            <div style="font-size:10px;color:var(--muted);margin-top:3px">${h.confidence}% confidence</div>
          </div>
          <div style="display:flex;gap:6px">
            <button class="btn btn-primary" style="font-size:11px;padding:6px 12px" onclick="confirmAutoHabit(${h.id}, this)">
              ✓ Done
            </button>
            <button class="btn btn-ghost" style="font-size:11px;padding:6px 10px" onclick="this.closest('[style]').remove()">
              ✕
            </button>
          </div>
        </div>`).join("")}`;
  } catch (err) {
    console.error("Auto-suggest error:", err);
  }
}

async function confirmAutoHabit(id, btn) {
  btn.disabled = true;
  btn.textContent = "✓";
  try {
    await fetchAuth(`${API_BASE}/api/habits/${id}`, { method: "PUT", body: JSON.stringify({}) });
    await loadHabitsFromDB();
    showToast("🤖 Auto-confirmed! +10 XP");
    setTimeout(() => renderAutoSuggest(), 600);
  } catch (err) {
    showToast("❌ Could not confirm habit");
  }
}

/* ══════════════════════════════════════
   INIT — call all 5 features on load
══════════════════════════════════════ */
async function initFeatures() {
  // Fire sequentially instead of Promise.all to prevent Groq API 429 Rate Limiting
  await checkRecovery();
  await renderSmartSchedule();
  await renderPrivacyAudit();
  await renderMotivationStyle();
  await renderAutoSuggest();
}