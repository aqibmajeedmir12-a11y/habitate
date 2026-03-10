const express = require("express");
const router = express.Router();
const db = require("../db");

/* ══════════════════════════════════════
   GET WEEKLY SCHEDULE
══════════════════════════════════════ */
router.get("/", (req, res) => {
  const userId = req.user_id;
  const sql = `
    SELECT hs.weekday, h.*
    FROM habit_schedule hs
    JOIN habits h ON hs.habit_id = h.id
    WHERE hs.user_id = ?
    ORDER BY hs.weekday ASC
  `;
  db.all(sql, [userId], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

/* ══════════════════════════════════════
   ASSIGN HABIT TO DAY
══════════════════════════════════════ */
router.post("/", (req, res) => {
  const { habit_id, weekday } = req.body;
  const userId = req.user_id;

  if (habit_id === undefined || weekday === undefined)
    return res.status(400).json({ error: "habit_id and weekday are required" });

  db.get("SELECT id FROM habits WHERE id = ? AND user_id = ?", [habit_id, userId], (err, habit) => {
    if (err) return res.status(500).json({ error: err.message });
    if (!habit) return res.status(403).json({ error: "Not authorized to modify this habit" });

    db.run(
      "INSERT OR IGNORE INTO habit_schedule (habit_id, user_id, weekday) VALUES (?, ?, ?)",
      [habit_id, userId, weekday],
      function (err2) {
        if (err2) return res.status(500).json({ error: err2.message });
        res.json({ success: true });
      }
    );
  });
});

/* ══════════════════════════════════════
   REMOVE HABIT FROM DAY
══════════════════════════════════════ */
router.delete("/", (req, res) => {
  const { habit_id, weekday } = req.body;
  const userId = req.user_id;

  db.run(
    "DELETE FROM habit_schedule WHERE habit_id = ? AND weekday = ? AND user_id = ?",
    [habit_id, weekday, userId],
    function (err) {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ success: true });
    }
  );
});

module.exports = router;