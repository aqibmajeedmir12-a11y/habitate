const express = require("express");
const router = express.Router();
const db = require("../db");

/* ══════════════════════════════════════
   GET XP + LEVEL
══════════════════════════════════════ */
router.get("/", (req, res) => {
  const userId = req.user_id;
  db.get("SELECT * FROM user_stats WHERE user_id = ?", [userId], (err, row) => {
    if (err) return res.status(500).json({ error: err.message });

    const xp = row?.xp || 0;
    const level = Math.floor(xp / 500) + 1;
    const nextLevelXP = level * 500;
    const remainingXP = nextLevelXP - xp;

    res.json({ xp, level, nextLevelXP, remainingXP });
  });
});

/* ══════════════════════════════════════
   ADD XP
══════════════════════════════════════ */
router.put("/add", (req, res) => {
  const { xp: amount = 0 } = req.body;
  const userId = req.user_id;

  db.get("SELECT xp FROM user_stats WHERE user_id = ?", [userId], (err, row) => {
    if (err) return res.status(500).json({ error: err.message });

    const newXP = (row?.xp || 0) + amount;
    const newLevel = Math.floor(newXP / 500) + 1;

    db.run(
      "INSERT OR REPLACE INTO user_stats (user_id, xp, level) VALUES (?, ?, ?)",
      [userId, newXP, newLevel],
      function (err2) {
        if (err2) return res.status(500).json({ error: err2.message });
        res.json({ xp: newXP, level: newLevel });
      }
    );
  });
});

/* ══════════════════════════════════════
   RESET XP
══════════════════════════════════════ */
router.put("/reset", (req, res) => {
  const userId = req.user_id;
  db.run(
    "INSERT OR REPLACE INTO user_stats (user_id, xp, level) VALUES (?, 0, 1)",
    [userId],
    function (err) {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ xp: 0, level: 1 });
    }
  );
});

module.exports = router;