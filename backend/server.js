const dns = require("dns");
dns.setDefaultResultOrder("ipv4first");   // Force IPv4 globally (fixes Gmail SMTP on Railway)

const express = require("express");
const cors = require("cors");
const bodyParser = require("body-parser");
const path = require("path");
const jwt = require("jsonwebtoken");
const db = require("./db");

const habitRoutes = require("./routes/habitRoutes");
const scheduleRoutes = require("./routes/scheduleRoutes");
const aiRoutes = require("./routes/aiRoutes");
const xpRoutes = require("./routes/xpRoutes");
const featuresRoutes = require("./routes/featuresRoutes");
const authRoutes = require("./routes/authRoutes"); // New auth routes
const profileRoutes = require("./routes/profileRoutes"); // Profile routes

const JWT_SECRET = process.env.JWT_SECRET || "rehabit_super_secret_key_123!";

const app = express();

/* ── MIDDLEWARE ── */
app.use(cors());
app.use(bodyParser.json());
app.use(express.json());

/* ══════════════════════════════════════
   AUTHENTICATION MIDDLEWARE
   Verifies JWT token and attaches user_id
══════════════════════════════════════ */
const authMiddleware = (req, res, next) => {
  const token = req.header("Authorization")?.replace("Bearer ", "");

  if (!token) {
    return res.status(401).json({ error: "Access denied. No token provided." });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user_id = decoded.id; // Attach user_id to request
    next();
  } catch (ex) {
    res.status(400).json({ error: "Invalid token." });
  }
};

/* ══════════════════════════════════════
   DAILY RESET — runs on startup + every
   minute. Resets done=0 for habits that
   have no log entry for today. This fixes
   the "stuck on previous day" bug.
══════════════════════════════════════ */
function dailyReset() {
  const today = new Date().toISOString().split("T")[0];
  db.run(
    `UPDATE habits SET done = 0
     WHERE done = 1
     AND id NOT IN (
       SELECT habit_id FROM habit_logs
       WHERE date = ? AND completed = 1
     )`,
    [today],
    (err) => {
      if (err) console.error("Daily reset error:", err.message);
    }
  );
}

setTimeout(dailyReset, 2000);         /* Wait to ensure DB tables are created before running reset */
setInterval(dailyReset, 60 * 1000);   /* re-check every 60 seconds for midnight */

/* ── STATIC FILES ── */
app.use(express.static(path.join(__dirname, "frontend")));

/* ── API ROUTES ── */
app.use("/api/auth", authRoutes); // Public Auth routes
// Apply authMiddleware to all other API routes
app.use("/api/habits", authMiddleware, habitRoutes);
app.use("/api/schedule", authMiddleware, scheduleRoutes);
app.use("/api/ai", authMiddleware, aiRoutes);
app.use("/api/xp", authMiddleware, xpRoutes);
app.use("/api/features", authMiddleware, featuresRoutes);
app.use("/api/profile", authMiddleware, profileRoutes);

/* ── FALLBACK ── */
app.use((req, res) => {
  if (req.path.match(/\.(js|css|html|png|ico|svg)$/)) {
    return res.status(404).send("File not found: " + req.path);
  }
  res.sendFile(path.join(__dirname, "frontend", "index.html"));
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`✅ Server running on port ${PORT}`);
});