const express = require("express");
const router = express.Router();
const db = require("../db");

/* ══════════════════════════════════════
   LOCAL DATE HELPER
   Always use local server date, never UTC.
   Fixes "stuck on yesterday" timezone bug.
══════════════════════════════════════ */
function localDate(d = new Date()) {
  return d.getFullYear() + "-" +
    String(d.getMonth() + 1).padStart(2, "0") + "-" +
    String(d.getDate()).padStart(2, "0");
}

/* ══════════════════════════════════════
   GET ALL HABITS
   Automatically resets done=0 for any habit
   that was NOT completed today. This fixes
   the "stuck on yesterday" bug.
══════════════════════════════════════ */
router.get("/", (req, res) => {
  const today = localDate();
  const userId = req.user_id;

  db.all("SELECT * FROM habits WHERE user_id = ?", [userId], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });

    /* Get all habit_logs for today */
    db.all(
      "SELECT habit_id FROM habit_logs WHERE user_id = ? AND date = ? AND completed = 1",
      [userId, today],
      (err2, todayLogs) => {
        if (err2) return res.status(500).json({ error: err2.message });

        const doneToday = new Set(todayLogs.map(l => l.habit_id));

        /* For any habit marked done but with no log today, reset done=0 in DB */
        const toReset = rows.filter(h => h.done === 1 && !doneToday.has(h.id));

        if (toReset.length === 0) {
          /* Nothing to reset — return habits with done corrected from today's logs */
          return res.json(rows.map(h => ({
            ...h,
            done: doneToday.has(h.id) ? 1 : 0
          })));
        }

        /* Reset stale done flags in DB */
        const ids = toReset.map(h => h.id);
        const placeholders = ids.map(() => "?").join(",");
        db.run(
          `UPDATE habits SET done = 0 WHERE id IN (${placeholders}) AND user_id = ?`,
          [...ids, userId],
          (err3) => {
            if (err3) return res.status(500).json({ error: err3.message });
            /* Return corrected rows */
            res.json(rows.map(h => ({
              ...h,
              done: doneToday.has(h.id) ? 1 : 0
            })));
          }
        );
      }
    );
  });
});

/* ══════════════════════════════════════
   ADD HABIT
══════════════════════════════════════ */
router.post("/", (req, res) => {
  const { name, emoji, color, category, time } = req.body;
  const userId = req.user_id;

  if (!name) return res.status(400).json({ error: "name is required" });
  db.run(
    "INSERT INTO habits (user_id, name, emoji, color, category, time, done, streak) VALUES (?, ?, ?, ?, ?, ?, 0, 0)",
    [userId, name, emoji, color, category || "General", time || "Anytime"],
    function (err) {
      if (err) return res.status(500).json({ error: err.message });
      res.json({
        id: this.lastID, user_id: userId, name, emoji, color,
        category: category || "General",
        time: time || "Anytime",
        streak: 0, done: 0
      });
    }
  );
});

/* ══════════════════════════════════════
   ANALYTICS — SUMMARY
══════════════════════════════════════ */
router.get("/analytics/summary", (req, res) => {
  const userId = req.user_id;
  db.all("SELECT * FROM habits WHERE user_id = ?", [userId], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    const total = rows.length;
    const completed = rows.filter(h => h.done).length;
    const completionRate = total === 0 ? 0 : Math.round(completed / total * 100);
    const categories = {};
    rows.forEach(h => {
      const cat = h.category || "General";
      categories[cat] = (categories[cat] || 0) + 1;
    });
    const topStreaks = [...rows].sort((a, b) => b.streak - a.streak).slice(0, 5);
    db.all("SELECT * FROM habit_logs WHERE user_id = ? AND completed = 1", [userId], (err2, logs) => {
      if (err2) return res.status(500).json({ error: err2.message });
      const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
      const weekly = {};
      logs.forEach(log => {
        const day = dayNames[new Date(log.date).getDay()];
        weekly[day] = (weekly[day] || 0) + 1;
      });
      res.json({ total, completed, completionRate, categories, topStreaks, weekly });
    });
  });
});

/* ══════════════════════════════════════
   ANALYTICS — INSIGHTS
══════════════════════════════════════ */
router.get("/analytics/insights", (req, res) => {
  const userId = req.user_id;
  db.all("SELECT * FROM habits WHERE user_id = ?", [userId], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    const total = rows.length;
    const done = rows.filter(h => h.done === 1).length;
    const pct = total ? Math.round((done / total) * 100) : 0;
    const insights = [];
    if (pct >= 80) {
      insights.push({
        emoji: "🚀", type: "Performance", typeColor: "#22c55e",
        title: "High Completion Rate",
        body: `You completed ${pct}% of your habits today. Excellent consistency.`,
        chips: ["Consistency", "Momentum", "Focus"]
      });
    }
    if (pct < 50 && total > 0) {
      insights.push({
        emoji: "⚠️", type: "Warning", typeColor: "#f59e0b",
        title: "Low Completion Trend",
        body: `Only ${pct}% habits completed. Consider reducing load or rescheduling.`,
        chips: ["Balance", "Energy", "Adjustment"]
      });
    }
    const top = [...rows].sort((a, b) => b.streak - a.streak)[0];
    if (top && top.streak > 0) {
      insights.push({
        emoji: "🔥", type: "Streak", typeColor: "#7c3aed",
        title: `${top.name} is your strongest habit`,
        body: `You have a ${top.streak}-day streak on this habit.`,
        chips: ["Discipline", "Growth", "Habit strength"]
      });
    }
    res.json({ total, done, pct, insights });
  });
});

/* ══════════════════════════════════════
   ANALYTICS — LOGS
══════════════════════════════════════ */
router.get("/analytics/logs", (req, res) => {
  const userId = req.user_id;
  db.all("SELECT * FROM habit_logs WHERE user_id = ? AND completed = 1", [userId], (err, logs) => {
    if (err) return res.status(500).json({ error: err.message });
    const heatmap = {};
    const monthly = {};
    logs.forEach(l => {
      heatmap[l.date] = (heatmap[l.date] || 0) + 1;
      const m = l.date.slice(0, 7);
      monthly[m] = (monthly[m] || 0) + 1;
    });
    const sorted = logs.map(l => l.date).sort();
    let breaks = 0;
    for (let i = 1; i < sorted.length; i++) {
      const diff = (new Date(sorted[i]) - new Date(sorted[i - 1])) / 86400000;
      if (diff > 1) breaks++;
    }
    res.json({ logs, heatmap, monthly, breaks });
  });
});

/* ══════════════════════════════════════
   ANALYTICS — GLOBAL STREAK
══════════════════════════════════════ */
router.get("/analytics/streak", (req, res) => {
  const userId = req.user_id;
  db.all(
    "SELECT DISTINCT date FROM habit_logs WHERE user_id = ? AND completed = 1 ORDER BY date DESC",
    [userId],
    (err, rows) => {
      if (err) return res.status(500).json({ error: err.message });
      if (!rows.length) return res.json({ current: 0, best: 0 });
      const dates = rows.map(r => r.date);
      const today = localDate();
      let current = 0, best = 0, prevDate = today;
      for (const d of dates) {
        const diff = (new Date(prevDate) - new Date(d)) / 86400000;
        if (diff === 0 || diff === 1) {
          current++;
          best = Math.max(best, current);
          prevDate = d;
        } else { break; }
      }
      res.json({ current, best });
    }
  );
});

/* ══════════════════════════════════════
   ACHIEVEMENTS SUMMARY
══════════════════════════════════════ */
router.get("/achievements/summary", (req, res) => {
  const userId = req.user_id;
  db.all("SELECT * FROM habits WHERE user_id = ?", [userId], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    const total = rows.length;
    const unlocked = rows.filter(h => h.streak >= 7).length;
    const locked = total - unlocked;
    const completion = total === 0 ? 0 : Math.round((unlocked / total) * 100);
    res.json({ unlocked, locked, completion, habits: rows });
  });
});

/* ══════════════════════════════════════
   GET SETTINGS
══════════════════════════════════════ */
router.get("/settings", (req, res) => {
  const userId = req.user_id;
  db.get("SELECT * FROM settings WHERE user_id = ?", [userId], (err, row) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(row || { name: "User", dailyGoal: 6, notif: 1, streak: 1, email: 0, ach: 1, quotes: 1 });
  });
});

/* ══════════════════════════════════════
   PUT SETTINGS
══════════════════════════════════════ */
router.put("/settings", (req, res) => {
  const { name, dailyGoal, notif, streak, email, ach, quotes } = req.body;
  const userId = req.user_id;

  db.run(
    "UPDATE settings SET name=?, dailyGoal=?, notif=?, streak=?, email=?, ach=?, quotes=? WHERE user_id=?",
    [name, dailyGoal, notif, streak, email, ach, quotes, userId],
    err => {
      if (err) return res.status(500).json({ error: err.message });

      // Update users table name to match settings name to keep in sync
      db.run("UPDATE users SET name=? WHERE id=?", [name, userId]);

      res.json({ success: true });
    }
  );
});

/* ══════════════════════════════════════
   TOGGLE HABIT DONE + STREAK + LOG + XP
   - Clicking done: calculates streak from
     last log date, awards 10 XP
   - Clicking undo: resets done & streak,
     removes today's log, deducts 10 XP
══════════════════════════════════════ */
router.put("/:id", (req, res) => {
  const id = parseInt(req.params.id, 10);
  const userId = req.user_id;
  const today = localDate();

  db.get("SELECT * FROM habits WHERE id = ? AND user_id = ?", [id, userId], (err, habit) => {
    if (err) return res.status(500).json({ error: err.message });
    if (!habit) return res.status(404).json({ error: "Habit not found" });

    /* ── Already DONE today → undo ── */
    if (habit.done === 1) {
      db.serialize(() => {
        db.run("UPDATE habits SET done = 0, streak = 0 WHERE id = ? AND user_id = ?", [id, userId]);
        db.run("DELETE FROM habit_logs WHERE habit_id = ? AND user_id = ? AND date = ?", [id, userId, today]);
        db.run("UPDATE user_stats SET xp = MAX(0, xp - 10), level = (MAX(0, xp - 10) / 500) + 1 WHERE user_id = ?", [userId]);
      });
      return res.json({ success: true, done: 0, streak: 0 });
    }

    /* ── NOT done yet → mark done, calculate streak ── */
    db.get(
      "SELECT date FROM habit_logs WHERE habit_id = ? AND user_id = ? ORDER BY date DESC LIMIT 1",
      [id, userId],
      (err2, lastLog) => {
        if (err2) return res.status(500).json({ error: err2.message });

        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        const yStr = localDate(yesterday);

        let newStreak;
        if (!lastLog) {
          newStreak = 1;                     // first ever completion
        } else if (lastLog.date === today) {
          newStreak = habit.streak;          // already logged today — no change
        } else if (lastLog.date === yStr) {
          newStreak = habit.streak + 1;      // yesterday → extend streak
        } else {
          newStreak = 1;                     // gap — reset to 1
        }

        db.serialize(() => {
          db.run(
            "UPDATE habits SET done = 1, streak = ? WHERE id = ? AND user_id = ?",
            [newStreak, id, userId]
          );
          db.run(
            "INSERT OR IGNORE INTO habit_logs (habit_id, user_id, date, completed) VALUES (?, ?, ?, 1)",
            [id, userId, today]
          );
          db.run("UPDATE user_stats SET xp = xp + 10, level = ((xp + 10) / 500) + 1 WHERE user_id = ?", [userId]);
        });

        res.json({ success: true, done: 1, streak: newStreak });
      }
    );
  });
});

/* ══════════════════════════════════════
   EDIT HABIT
══════════════════════════════════════ */
router.put("/edit/:id", (req, res) => {
  const { name, emoji, color, category, time } = req.body;
  const userId = req.user_id;
  db.run(
    "UPDATE habits SET name=?, emoji=?, color=?, category=?, time=? WHERE id=? AND user_id=?",
    [name, emoji, color, category, time, req.params.id, userId],
    err => {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ message: "Habit updated" });
    }
  );
});

/* ══════════════════════════════════════
   DELETE HABIT
══════════════════════════════════════ */
router.delete("/:id", (req, res) => {
  const userId = req.user_id;
  db.run("DELETE FROM habits WHERE id = ? AND user_id = ?", [req.params.id, userId], err => {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ message: "Habit deleted" });
  });
});

module.exports = router;