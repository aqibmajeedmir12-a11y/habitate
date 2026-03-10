const express = require("express");
const router = express.Router();
require("dotenv").config();





// Re-use Gemini logic from the previous AI integration success
async function callOllama(prompt, retries = 2) {
  try {
    const OLLAMA_URL = process.env.OLLAMA_URL || "http://localhost:11434/api/generate";
    const OLLAMA_MODEL = process.env.OLLAMA_MODEL || "llama3";
    const OLLAMA_API_KEY = process.env.OLLAMA_API_KEY;

    const headers = { "Content-Type": "application/json" };
    if (OLLAMA_API_KEY) {
      headers["Authorization"] = `Bearer ${OLLAMA_API_KEY}`;
    }

    const response = await fetch(OLLAMA_URL, {
      method: "POST",
      headers: headers,
      body: JSON.stringify({
        model: OLLAMA_MODEL,
        prompt: prompt,
        stream: false
      })
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    return data.response;
  } catch (e) {
    if (retries > 0) {
      console.warn(`Ollama API Error. Retrying in 2.5s... (${retries} retries left)`);
      await new Promise(resolve => setTimeout(resolve, 2500));
      return await callOllama(prompt, retries - 1);
    }
    console.error("Ollama API Error:", e.message || e);
    return "AI not responding.";
  }
}





/* ═════════ DAILY INSIGHTS ═════════ */

router.post("/insights", async (req, res) => {

  try {

    const habits = req.body.habits || [];

    const text = habits.map(h =>
      `${h.name} - streak ${h.streak} - done ${h.done}`
    ).join("\n");


    const prompt = `
Analyze this habit data:

${text}

Give productivity insights and improvements.
`;

    const reply = await callOllama(prompt);

    res.json({ reply });

  } catch (err) {
    res.json({ reply: "AI error." });
  }

});



/* ═════════ DAILY MOTIVATION ═════════ */

router.post("/motivation", async (req, res) => {

  try {

    const habits = req.body.habits || [];

    const text = habits.map(h =>
      `${h.name} (${h.done ? "Done" : "Pending"})`
    ).join(", ");


    const prompt = `
Give a short motivational quote
based on these tasks:

${text}
`;

    const line = await callOllama(prompt);

    res.json({ line });

  } catch (err) {
    res.json({ line: "Stay consistent — success follows discipline." });
  }

});



/* ═════════ AI CHATBOT ═════════ */

router.post("/chat", async (req, res) => {

  try {

    const message = req.body.message || "Hello";

    const prompt = `
You are HabitAI — a friendly habit coach.

User says:
${message}

Reply shortly with motivation or guidance.
`;

    const reply = await callOllama(prompt);

    res.json({ reply });

  } catch (err) {
    res.json({ reply: "AI chatbot error." });
  }

});

router.post("/predict", async (req, res) => {

  const habits = req.body.habits;

  const text = habits.map(h =>
    `${h.name} streak ${h.streak}`
  ).join(", ");

  const prompt = `
Predict which habit streak may break soon:

${text}
`;

  const reply = await callOllama(prompt);

  res.json({ reply });

});

router.post("/planner", async (req, res) => {

  const goal = req.body.goal;

  const prompt = `
Create 5 daily habits to achieve: ${goal}. 
Return the response strictly as a bulleted markdown list using the * character. 
Keep each line under 20 words.
`;

  const reply = await callOllama(prompt);

  res.json({ reply });

});




// GET AI Insights
router.get("/insights", async (req, res) => {
  try {
    const data = req.query.data || "No habit data";

    const prompt = `
      Based on the following user habit statistics, generate three insightful bullet points combining analytical rigor with approachable advice. 
      Keep each bullet under 10 words. Ensure the tone is very brief.
      User Data: ${data}
    `;
    const aiResponse = await callOllama(prompt);

    const insights = aiResponse || `
      • Improve consistency routines
      • Avoid weekend streak breaks
      • Focus on early completions
    `;

    res.json({ insights });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to generate insights" });
  }
});

module.exports = router;
