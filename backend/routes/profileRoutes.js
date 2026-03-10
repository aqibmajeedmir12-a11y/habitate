const express = require("express");
const router = express.Router();
const db = require("../db");

// GET profile info
router.get("/", (req, res) => {
    const userId = req.user_id;

    db.get("SELECT id, name, email, profile_photo FROM users WHERE id = ?", [userId], (err, user) => {
        if (err) return res.status(500).json({ error: "DB Error" });
        if (!user) return res.status(404).json({ error: "User not found" });

        db.get("SELECT xp, level FROM user_stats WHERE user_id = ?", [userId], (err, stats) => {
            if (err) return res.status(500).json({ error: "DB Error" });

            res.json({
                id: user.id,
                name: user.name,
                email: user.email,
                profile_photo: user.profile_photo || "",
                xp: stats ? stats.xp : 0,
                level: stats ? stats.level : 1
            });
        });
    });
});

// Update Profile Name
router.put("/", (req, res) => {
    const userId = req.user_id;
    const { name } = req.body;

    if (!name) return res.status(400).json({ error: "Name is required" });

    db.run("UPDATE users SET name = ? WHERE id = ?", [name, userId], function (err) {
        if (err) return res.status(500).json({ error: "DB Update error" });
        // Also update settings name
        db.run("UPDATE settings SET name = ? WHERE user_id = ?", [name, userId]);
        res.json({ success: true, name });
    });
});

// Update Profile Photo
router.post("/photo", (req, res) => {
    const userId = req.user_id;
    const { photo_base64 } = req.body;

    if (!photo_base64) return res.status(400).json({ error: "Photo data required" });

    db.run("UPDATE users SET profile_photo = ? WHERE id = ?", [photo_base64, userId], function (err) {
        if (err) return res.status(500).json({ error: "DB error" });
        res.json({ success: true, message: "Photo updated" });
    });
});

module.exports = router;
