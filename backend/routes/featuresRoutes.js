const express = require("express");
const router = express.Router();
const db = require("../db");



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
    return null; // Return null to fallback gracefully if AI is down
  }
}

/* ══════════════════════════════════════
   FEATURE 1 — RELAPSE RECOVERY ENGINE
   Detects users who missed 2+ completions
   in last 7 days and returns a recovery plan
══════════════════════════════════════ */
router.get("/recovery-check", (req, res) => {
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
  const fromDate = sevenDaysAgo.toISOString().split("T")[0];
  const userId = req.user_id;

  db.all("SELECT * FROM habits WHERE user_id = ?", [userId], (err, habits) => {
    if (err) return res.status(500).json({ error: err.message });

    db.all(
      "SELECT habit_id, COUNT(*) as count FROM habit_logs WHERE user_id = ? AND date >= ? AND completed = 1 GROUP BY habit_id",
      [userId, fromDate],
      (err2, logs) => {
        if (err2) return res.status(500).json({ error: err2.message });

        const logMap = {};
        logs.forEach(l => { logMap[l.habit_id] = l.count; });

        const atRisk = habits.filter(h => (logMap[h.id] || 0) < 2);

        const needsRecovery = atRisk.length >= 2;

        if (!needsRecovery) {
          return res.json({
            triggered: false,
            message: "You're on track! Keep the momentum going.",
            steps: [],
            atRiskHabits: []
          });
        }

        (async () => {
          const prompt = `A user is struggling with their habits: ${atRisk.map(h => h.name).join(", ")}. Give them a very brief (2 sentences max), highly supportive and non-judgmental motivational message to help them restart.`;
          const aiMessage = await callOllama(prompt);

          const plan = {
            triggered: true,
            message: aiMessage || "Hey, no judgment — life gets busy. Let's restart small and rebuild momentum.",
            steps: [
              { step: 1, title: "Acknowledge", desc: "You missed a few days. That's okay — every streak starts with day 1." },
              { step: 2, title: "Reduce Scope", desc: `Focus on just 1 habit today: "${atRisk[0]?.name || "your top habit"}". Drop everything else.` },
              { step: 3, title: "Micro-Win Now", desc: "Do just 2 minutes of your easiest habit right now to rebuild momentum." }
            ],
            atRiskHabits: atRisk.map(h => ({ id: h.id, name: h.name, emoji: h.emoji }))
          };

          res.json(plan);
        })();
      }
    );
  });
});

/* ══════════════════════════════════════
   FEATURE 2 — CONTEXT-AWARE CUE ENGINE
   Returns smart nudge windows based on
   time of day + completion history patterns
══════════════════════════════════════ */
router.get("/smart-schedule", (req, res) => {
  const userId = req.user_id;
  db.all(
    "SELECT strftime('%H', date) as hour, COUNT(*) as count FROM habit_logs WHERE user_id = ? AND completed = 1 GROUP BY hour ORDER BY count DESC",
    [userId],
    (err, rows) => {
      if (err) return res.status(500).json({ error: err.message });

      const now = new Date();
      const hour = now.getHours();

      if (!rows.length) return res.json({ windows: [], bestHour: 7 });

      /* Build windows from real history */
      const topHours = rows.slice(0, 3).map((r, i) => {
        const h = parseInt(r.hour);
        const pad = String(h).padStart(2, "0");
        const labels = ["Peak Performance Window", "Strong Completion Window", "Good Habit Window"];
        const reasons = [
          "Your historical best — highest completion rate",
          "Consistently strong in your past data",
          "Solid secondary window from your history"
        ];
        return {
          label: labels[i],
          time: `${pad}:00`,
          reason: reasons[i],
          score: Math.max(40, 95 - i * 15)
        };
      });

      const bestHour = parseInt(rows[0].hour);

      /* Smart snooze: next best window after current hour */
      const nextWindow = topHours.find(w => parseInt(w.time) > hour) || topHours[0];

      res.json({ windows: topHours, bestHour, nextWindow });
    }
  );
});

/* ══════════════════════════════════════
   FEATURE 3 — PRIVACY AUDIT LOG
   Returns a log of what data is stored
   and provides clear transparency
══════════════════════════════════════ */
router.get("/privacy-audit", (req, res) => {
  const userId = req.user_id;
  db.all("SELECT COUNT(*) as habitCount FROM habits WHERE user_id = ?", [userId], (e1, r1) => {
    db.all("SELECT COUNT(*) as logCount FROM habit_logs WHERE user_id = ?", [userId], (e2, r2) => {
      db.all("SELECT COUNT(*) as schedCount FROM habit_schedule WHERE user_id = ?", [userId], (e3, r3) => {

        res.json({
          dataStored: [
            { type: "Habits", count: r1[0]?.habitCount || 0, description: "Your habit names, emojis, colors, categories" },
            { type: "Completion Logs", count: r2[0]?.logCount || 0, description: "Dates you completed each habit" },
            { type: "Schedule Entries", count: r3[0]?.schedCount || 0, description: "Which days each habit is scheduled" }
          ],
          dataNotStored: [
            "Your real name or identity",
            "Location or GPS data",
            "Device identifiers",
            "Health sensor data",
            "Any third-party analytics"
          ],
          cloudSync: false,
          localStorage: true,
          thirdParties: [],
          lastAudit: new Date().toISOString()
        });

      });
    });
  });
});

/* ══════════════════════════════════════
   FEATURE 4 — ADAPTIVE MOTIVATION SYSTEM
   Returns the right motivation style based
   on user's current streak & completion rate
══════════════════════════════════════ */
router.get("/motivation-style", (req, res) => {
  const userId = req.user_id;
  db.all("SELECT * FROM habits WHERE user_id = ?", [userId], (err, habits) => {
    if (err) return res.status(500).json({ error: err.message });

    const total = habits.length;
    const done = habits.filter(h => h.done === 1).length;
    const pct = total ? Math.round(done / total * 100) : 0;
    const maxStreak = Math.max(0, ...habits.map(h => h.streak || 0));
    const avgStreak = total ? habits.reduce((s, h) => s + (h.streak || 0), 0) / total : 0;

    let style, rewards, fallbackMsg;

    if (avgStreak < 5) {
      style = "gamified";
      rewards = ["🔥 Streak badges", "⭐ XP points", "🎯 Daily targets", "🏆 First milestones"];
      fallbackMsg = "You're just getting started! Every day you complete a habit earns XP and builds your streak. Hit 7 days for your first badge!";
    } else if (pct >= 80 && avgStreak >= 14) {
      style = "intrinsic";
      rewards = ["📈 Personal insights", "🧠 Progress narratives", "💡 Competence cues", "🌟 Mastery milestones"];
      fallbackMsg = `Incredible consistency — ${Math.round(avgStreak)}-day average streak! You've moved beyond streaks. Focus on the quality and depth of your habits now.`;
    } else {
      style = "mixed";
      rewards = ["🔥 Streaks", "📊 Progress charts", "💪 Consistency score", "🎖️ Habit mastery badges"];
      fallbackMsg = `You're building momentum with ${Math.round(avgStreak)}-day average streaks. Stay consistent for 14 days to unlock deeper insights.`;
    }

    (async () => {
      const prompt = `User has an average habit streak of ${avgStreak.toFixed(1)} days and a ${pct}% completion rate today. Their habits are: ${habits.map(h => h.name).join(", ")}. Given these stats, generate a single paragraph (max 3 sentences) of dynamic motivational feedback analyzing their performance.`;
      const aiMessage = await callOllama(prompt);

      res.json({ style, rewards, message: aiMessage || fallbackMsg, pct, avgStreak: Math.round(avgStreak), maxStreak });
    })();
  });
});

/* ══════════════════════════════════════
   FEATURE 5 — AUTO-DETECT & CONFIRM
   Suggests habits the user likely completed
   based on time-of-day patterns + pending habits
══════════════════════════════════════ */
router.get("/auto-suggest", (req, res) => {
  const now = new Date();
  const hour = now.getHours();
  // const today      = now.toISOString().split("T")[0];
  const userId = req.user_id;

  db.all("SELECT * FROM habits WHERE done = 0 AND user_id = ?", [userId], (err, pending) => {
    if (err) return res.status(500).json({ error: err.message });

    if (!pending.length) return res.json({ suggestions: [] });

    /* Score each pending habit by how likely it was done based on time */
    const timeScores = {
      morning: [5, 6, 7, 8, 9, 10],
      afternoon: [11, 12, 13, 14, 15, 16],
      evening: [17, 18, 19, 20, 21],
      night: [22, 23, 0, 1, 2, 3, 4]
    };

    function getTimeOfDay(h) {
      if (timeScores.morning.includes(h)) return "morning";
      if (timeScores.afternoon.includes(h)) return "afternoon";
      if (timeScores.evening.includes(h)) return "evening";
      return "night";
    }

    const currentPeriod = getTimeOfDay(hour);

    /* Map common habit keywords to expected time periods */
    const habitTimings = {
      morning: ["morning", "wake", "breakfast", "meditat", "journal", "yoga", "run", "exercise", "stretch", "shower", "gym"],
      afternoon: ["lunch", "walk", "read", "study", "learn", "focus", "work"],
      evening: ["evening", "dinner", "reflect", "gratitude", "plan", "review", "relax"],
      night: ["sleep", "night", "bed", "wind", "screen"]
    };

    const suggestions = pending
      .map(h => {
        const nameLower = h.name.toLowerCase();
        let matchScore = 0;

        /* Check if habit name matches current time period keywords */
        (habitTimings[currentPeriod] || []).forEach(kw => {
          if (nameLower.includes(kw)) matchScore += 40;
        });

        /* Bonus if scheduled time roughly matches */
        if (h.time) {
          const habitHour = parseInt(h.time.split(":")[0]);
          if (!isNaN(habitHour) && Math.abs(habitHour - hour) <= 2) matchScore += 30;
        }

        /* Base probability by time of day */
        matchScore += 20;

        return { ...h, confidence: Math.min(matchScore, 95) };
      })
      .filter(h => h.confidence >= 40)
      .sort((a, b) => b.confidence - a.confidence)
      .slice(0, 3);

    (async () => {
      let aiMessage = null;
      if (suggestions.length > 0) {
        const prompt = `It is ${hour}:00. Based on this time of day, casually ask the user if they've completed the following tasks: ${suggestions.map(s => s.name).join(", ")}. Keep the tone helpful, 1 sentence max.`;
        aiMessage = await callOllama(prompt);
      }

      res.json({
        suggestions,
        currentPeriod,
        message: aiMessage || (suggestions.length
          ? `Based on the time (${hour}:00), did you complete these?`
          : "No suggestions right now — check back later.")
      });
    })();
  });
});

/* ══════════════════════════════════════
   FEATURE 6 — AI NOTIFICATIONS
   Generates personalized context-aware alerts
══════════════════════════════════════ */
router.get("/ai-notifications", (req, res) => {
  const userId = req.user_id;
  db.all("SELECT * FROM habits WHERE user_id = ?", [userId], (err, habits) => {
    if (err) return res.status(500).json({ error: err.message });

    const pending = habits.filter(h => !h.done);
    const completed = habits.filter(h => h.done);

    (async () => {
      const prompt = `A user has completed: ${completed.map(h => h.name).join(", ") || 'none'} and has pending: ${pending.map(h => h.name).join(", ") || 'none'}. Write 3 short, distinct, motivating notification updates for them. Separate each notification exactly with the | character and provide no other text. Keep them very short (1 sentence each).`;
      const aiMessage = await callOllama(prompt);

      let items = [];
      if (aiMessage && aiMessage.includes("|")) {
        items = aiMessage.split("|").map(s => s.trim()).filter(s => s);
      } else if (aiMessage) {
        // Fallback split by newlines if LLM ignored | character
        items = aiMessage.split("\n").map(s => s.replace(/^- /, '').replace(/^\d+\.\s/, '').trim()).filter(s => s.length > 0).slice(0, 3);
      }

      if (!items || items.length === 0) {
        items = [
          "Stay on track! Check your smart schedule.",
          pending.length ? `Don't forget to complete ${pending[0].name}!` : "Great job completing your habits today!",
          "Take a deep breath and keep building momentum."
        ];
      }

      res.json({ notifications: items });
    })();
  });
});

/* ══════════════════════════════════════
   FEATURE 7 — AI PERFORMANCE REPORT
   Aggregates stats and generates a summary
══════════════════════════════════════ */
router.get("/report", (req, res) => {
  const userId = req.user_id;

  db.all("SELECT * FROM habits WHERE user_id = ?", [userId], (err, habits) => {
    if (err) return res.status(500).json({ error: err.message });

    const totalHabits = habits.length;
    const completedHabits = habits.filter(h => h.done).length;
    const completionRate = totalHabits > 0 ? Math.round((completedHabits / totalHabits) * 100) : 0;

    let sumStreak = 0;
    habits.forEach(h => {
      sumStreak += h.streak || 0;
    });
    const avgStreak = totalHabits > 0 ? Math.round(sumStreak / totalHabits) : 0;

    (async () => {
      let aiSummary = "Your habit data reveals strong structural consistency. Keep going.";
      if (totalHabits > 0) {
        const prompt = `A user has ${totalHabits} habits. Their daily success rate today is ${completionRate}% and their average habit streak is ${avgStreak} days. Write a very brief, professional, and encouraging 2-sentence "Executive Summary" analyzing their performance. Use a professional tone.`;
        const aiResponse = await callOllama(prompt);
        if (aiResponse) aiSummary = aiResponse;
      } else {
        aiSummary = "You haven't added any habits yet. Start tracking today to begin your personal growth journey.";
      }

      res.json({
        totalHabits,
        completedHabits,
        completionRate,
        avgStreak,
        aiSummary,
        habits: habits.map(h => ({
          name: h.name,
          category: h.category,
          emoji: h.emoji,
          streak: h.streak || 0,
          done: h.done
        }))
      });
    })();
  });
});

/* ══════════════════════════════════════
   FEATURE 8 — WEEKLY AI INSIGHTS EMAIL (SIMULATION)
══════════════════════════════════════ */
router.post("/trigger-email", (req, res) => {
  const userId = req.user_id;

  db.get("SELECT email FROM settings WHERE user_id = ?", [userId], (err, row) => {
    if (err || !row || row.email !== 1) {
      return res.json({ status: "skipped", message: "User disabled weekly emails." });
    }

    db.all("SELECT * FROM habits WHERE user_id = ?", [userId], (err, habits) => {
      if (err || habits.length === 0) {
        return res.json({ status: "skipped", message: "No habits to analyze." });
      }

      const total = habits.length;
      const completed = habits.filter(h => h.done).length;
      const rate = Math.round((completed / total) * 100);

      (async () => {
        const prompt = `Write a highly encouraging "Weekly Habit Report" email for a user who completed ${rate}% of their ${total} habits today. Format it using basic HTML (like <h3>, <p>, <ul>). Make it sound like an expert AI coach sending a newsletter.`;
        const emailHtml = await callOllama(prompt) || "<p>Keep up the great work!</p>";

        // In a real app, nodemailer would trigger here:
        // await transporter.sendMail({ to: user.email, subject: "Your Weekly Habit Insights", html: emailHtml });

        console.log(`[SIMULATED EMAIL DISPATCH] Sent Weekly AI Insights to User #${userId}`);
        res.json({ status: "sent", preview: emailHtml });
      })();
    });
  });
});

module.exports = router;