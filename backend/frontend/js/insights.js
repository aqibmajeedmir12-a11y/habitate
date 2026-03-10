/* ══════════════════════════════════════
   INSIGHTS.JS — AI Insights page logic
══════════════════════════════════════ */

async function renderInsightsPage() {
  try {
    const res = await fetchAuth(`${API_BASE}/api/habits/analytics/insights`);
    if (!res.ok) throw new Error("Insights API failed");
    const data = await res.json();

    const summaryEl = document.getElementById("ins-summary");
    if (summaryEl) summaryEl.textContent =
      `You completed ${data.done} of ${data.total} habits today (${data.pct}%).`;

    const container = document.getElementById("insights-list");
    if (!container) return;

    if (!data.insights || !data.insights.length) {
      container.innerHTML = `<div class="insight-card-big"><div class="insight-body">No insights yet. Complete more habits.</div></div>`;
      return;
    }
    container.innerHTML = data.insights.map(i => `
      <div class="insight-card-big">
        <div class="insight-header">
          <div class="insight-emoji">${i.emoji}</div>
          <div>
            <div class="insight-type" style="color:${i.typeColor}">${i.type}</div>
            <div class="insight-title">${i.title}</div>
          </div>
        </div>
        <div class="insight-body">${i.body}</div>
      </div>`).join("");
  } catch (err) {
    console.error("Insights Error:", err);
    const container = document.getElementById("insights-list");
    if (container) container.innerHTML =
      `<div class="insight-card-big"><div class="insight-body">⚠️ Unable to load insights.</div></div>`;
  }
}

async function loadPrediction() {
  try {
    const resHabits = await fetchAuth(`${API_BASE}/api/habits`);
    if (!resHabits.ok) throw new Error("Failed to load habits");
    const habitsData = await resHabits.json();

    const predictEl = document.getElementById("streak-predict");
    if (!predictEl) return;

    if (!habitsData.length) {
      predictEl.textContent = "No habits found. Add habits to see prediction.";
      return;
    }

    const res = await fetchAuth(`${API_BASE}/api/ai/predict`, {
      method: "POST",
      body: JSON.stringify({ habits: habitsData })
    });
    if (!res.ok) throw new Error("Prediction API failed");
    const data = await res.json();
    predictEl.textContent = data.reply || "No prediction available.";
  } catch (err) {
    console.error("Prediction Error:", err);
    const predictEl = document.getElementById("streak-predict");
    if (predictEl) predictEl.textContent = "⚠️ Unable to analyze streak risk.";
  }
}

async function generatePlan() {
  const goalInput = document.getElementById("goal-input");
  const planEl = document.getElementById("ai-plan");
  if (!goalInput || !planEl) return;
  const goal = goalInput.value;
  try {
    const res = await fetchAuth(`${API_BASE}/api/ai/planner`, {
      method: "POST",
      body: JSON.stringify({ goal })
    });
    const data = await res.json();

    // Convert Markdown bullet points to HTML list
    const rawText = data.reply || "";
    const lines = rawText.split('\n').filter(l => l.trim().length > 0);

    let html = "<ul style='padding-left: 20px; list-style-type: disc; line-height: 1.6;'>";
    lines.forEach(line => {
      // Remove leading asterisks, dashes, or numbers
      let cleanLine = line.replace(/^[\*\-\d\.]+\s*/, '').trim();
      if (cleanLine) {
        // Bold formatting **text**
        cleanLine = cleanLine.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
        html += `<li style="margin-bottom: 8px;">${cleanLine}</li>`;
      }
    });
    html += "</ul>";

    planEl.innerHTML = html;
  } catch (err) {
    planEl.innerHTML = "<span style='color:#ef4444'>⚠️ Unable to generate plan.</span>";
  }
}

async function sendChat() {
  const input = document.getElementById("chat-input");
  const box = document.getElementById("chat-box");
  if (!input || !box) return;
  const msg = input.value;
  if (!msg) return;
  box.innerHTML += `<div style="margin-bottom:8px;padding:8px;background:rgba(124,58,237,.1);border-radius:8px">🧑 ${msg}</div>`;
  input.value = "";
  try {
    const res = await fetchAuth(`${API_BASE}/api/ai/chat`, {
      method: "POST",
      body: JSON.stringify({ message: msg })
    });
    const data = await res.json();
    const replyText = data.reply || "Error connecting to AI.";

    // Append AI reply to DOM
    box.innerHTML += `<div style="margin-bottom:8px;padding:8px;background:rgba(59,130,246,.1);border-radius:8px">🤖 ${replyText}</div>`;

    // Voice AI TTS (Text-to-Speech)
    if ("speechSynthesis" in window) {
      window.speechSynthesis.cancel(); // stop any ongoing speech
      const utterance = new SpeechSynthesisUtterance(replyText);
      utterance.lang = "en-US";
      utterance.pitch = 1.05;
      utterance.rate = 1.05;
      window.speechSynthesis.speak(utterance);
    }

  } catch (err) {
    box.innerHTML += `<div style="margin-bottom:8px;color:var(--red)">🤖 Error connecting to AI.</div>`;
  }
  box.scrollTop = box.scrollHeight;
}

function clearAIChats() {
  const box = document.getElementById("chat-box");
  if (box) box.innerHTML = "";
  // In a robust implementation, this would also ping an API to clear the DB,
  // but for now we just clear the view. 
  showToast("Chat history cleared from view.");
}

async function loadChatHistory() {
  const box = document.getElementById("chat-box");
  if (!box) return;
  try {
    const res = await fetchAuth(`${API_BASE}/api/ai/chat/history`);
    if (!res.ok) throw new Error("Load failed");
    const history = await res.json();
    if (history && history.length > 0) {
      box.innerHTML = history.map(msg => {
        if (msg.role === "user") {
          return `<div style="margin-bottom:8px;padding:8px;background:rgba(124,58,237,.1);border-radius:8px">🧑 ${msg.content}</div>`;
        } else {
          return `<div style="margin-bottom:8px;padding:8px;background:rgba(59,130,246,.1);border-radius:8px">🤖 ${msg.content}</div>`;
        }
      }).join("");
      box.scrollTop = box.scrollHeight;
    } else {
      box.innerHTML = "";
    }
  } catch (err) {
    console.error("Failed to load AI chat history", err);
  }
}

function startVoiceAI() {
  if (!("webkitSpeechRecognition" in window)) {
    showToast("⚠️ Voice not supported in this browser");
    return;
  }
  const recog = new webkitSpeechRecognition();
  recog.lang = "en-US";
  recog.onresult = async e => {
    const text = e.results[0][0].transcript;
    const input = document.getElementById("chat-input");
    if (input) input.value = text;
    sendChat();
  };
  recog.onerror = () => showToast("⚠️ Voice recognition error");
  recog.start();
}