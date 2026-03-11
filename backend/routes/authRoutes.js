const express = require("express");
const router = express.Router();
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const db = require("../db");

const JWT_SECRET = process.env.JWT_SECRET || "rehabit_super_secret_key_123!";

// Temporary memory store for unverified signups (email -> { otp, name, password, expires })
const otpStore = new Map();

const { Resend } = require("resend");
const resend = new Resend(process.env.RESEND_API_KEY);

/* ══════════════════════════════════════
   REGISTER (Now issues OTP instead of saving immediately)
══════════════════════════════════════ */
router.post("/register", async (req, res) => {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
        return res.status(400).json({ error: "Please fill all fields" });
    }

    try {
        // Check if user already exists
        db.get("SELECT id FROM users WHERE email = ?", [email], async (err, row) => {
            if (err) return res.status(500).json({ error: err.message });
            if (row) return res.status(400).json({ error: "Email already registered" });

            // Generate 6-digit OTP
            const otpCode = Math.floor(100000 + Math.random() * 900000).toString();

            // Hash password securely while in pending memory state
            const salt = await bcrypt.genSalt(10);
            const hashedPassword = await bcrypt.hash(password, salt);

            otpStore.set(email, {
                otp: otpCode,
                name: name,
                password: hashedPassword,
                expires: Date.now() + 5 * 60 * 1000 // 5 minutes
            });

            console.log(`\n[SECURITY] OPT GENERATED FOR ${email} -> ${otpCode}\n`);

            // Send Email OTP via Resend
            try {
                const data = await resend.emails.send({
                    from: "HabitAI <onboarding@resend.dev>", // Replace with your verified domain when ready
                    to: email,
                    subject: "Your HabitAI Verification Code",
                    html: `<div style="font-family:sans-serif;text-align:center;padding:20px;">
                            <h2>Verify your email address</h2>
                            <p>Your 6-digit HabitAI security code is:</p>
                            <h1 style="letter-spacing:10px;color:#7c3aed;background:#f3f4f6;padding:20px;border-radius:8px">${otpCode}</h1>
                           </div>`
                });
                console.log("Email sent successfully via Resend:", data);
            } catch (error) {
                console.error("RESEND API ERROR:", error);
                // We don't block the frontend here because the OTP is still generated in memory
            }

            return res.json({ requiresOtp: true, message: "OTP sent to email." });
        });
    } catch (error) {
        res.status(500).json({ error: "Server error" });
    }
});

/* ══════════════════════════════════════
   VERIFY OTP & FINALIZE REGISTRATION
══════════════════════════════════════ */
router.post("/verify-otp", async (req, res) => {
    const { email, otp } = req.body;
    if (!email || !otp) return res.status(400).json({ error: "Missing verification data" });

    const pendingUser = otpStore.get(email);
    if (!pendingUser) return res.status(400).json({ error: "OTP expired or invalid session. Please try registering again." });

    if (Date.now() > pendingUser.expires) {
        otpStore.delete(email);
        return res.status(400).json({ error: "OTP has expired." });
    }

    if (pendingUser.otp !== otp) {
        return res.status(400).json({ error: "Incorrect OTP code." });
    }

    // OTP Verified! Commit to Database
    db.run(
        "INSERT INTO users (name, email, password) VALUES (?, ?, ?)",
        [pendingUser.name, email, pendingUser.password],
        function (err) {
            if (err) return res.status(500).json({ error: "Database error during finalization." });

            const userId = this.lastID;
            otpStore.delete(email); // Clean up memory

            // Init Settings
            db.serialize(() => {
                db.run("INSERT INTO settings (user_id, name) VALUES (?, ?)", [userId, pendingUser.name]);
                db.run("INSERT INTO user_stats (user_id, xp, level) VALUES (?, 0, 1)", [userId]);
            });

            const token = jwt.sign({ id: userId, email, name: pendingUser.name }, JWT_SECRET, { expiresIn: "30d" });
            res.json({ token, user: { id: userId, name: pendingUser.name, email } });
        }
    );
});

/* ══════════════════════════════════════
   CLIENT CONFIG
══════════════════════════════════════ */
router.get("/client-id", (req, res) => {
    res.json({ clientId: process.env.GOOGLE_CLIENT_ID || "YOUR_GOOGLE_CLIENT_ID.apps.googleusercontent.com" });
});

/* ══════════════════════════════════════
   LOGIN
══════════════════════════════════════ */
router.post("/login", (req, res) => {
    const { email, password } = req.body;

    if (!email || !password) {
        return res.status(400).json({ error: "Please enter email and password" });
    }

    db.get("SELECT * FROM users WHERE email = ?", [email], async (err, user) => {
        if (err) return res.status(500).json({ error: err.message });
        if (!user) return res.status(400).json({ error: "Invalid email or password" });

        // Validate password
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) return res.status(400).json({ error: "Invalid email or password" });

        // Create JWT token
        const token = jwt.sign({ id: user.id, email: user.email, name: user.name }, JWT_SECRET, {
            expiresIn: "30d"
        });

        res.json({ token, user: { id: user.id, name: user.name, email: user.email } });
    });
});

/* ══════════════════════════════════════
   VERIFIED GOOGLE AUTHENTICATION
══════════════════════════════════════ */
router.post("/google", (req, res) => {
    const { credential } = req.body;
    if (!credential) return res.status(400).json({ error: "No Google token provided" });

    try {
        // Decode JWT payload (Base64)
        const payloadBase64 = credential.split('.')[1];
        const decodedJson = Buffer.from(payloadBase64, 'base64').toString('utf-8');
        const googleUser = JSON.parse(decodedJson);

        const email = googleUser.email;
        const name = googleUser.name || "Google User";

        if (!email) return res.status(400).json({ error: "Invalid Google JWT" });

        // 1. Check if user exists
        db.get("SELECT * FROM users WHERE email = ?", [email], async (err, user) => {
            if (err) return res.status(500).json({ error: err.message });

            if (user) {
                // User exists -> Login
                const token = jwt.sign({ id: user.id }, SECRET, { expiresIn: "24h" });
                return res.json({ token, user: { id: user.id, name: user.name, email: user.email } });
            } else {
                // New user -> Auto Register
                const securePlaceholder = await bcrypt.hash(Date.now().toString(), 10);
                db.run(
                    "INSERT INTO users (name, email, password) VALUES (?, ?, ?)",
                    [name, email, securePlaceholder],
                    function (err2) {
                        if (err2) return res.status(500).json({ error: err2.message });
                        const newId = this.lastID;

                        const token = jwt.sign({ id: newId }, SECRET, { expiresIn: "24h" });

                        // Setup Default Settings
                        db.run("INSERT INTO settings (user_id, name) VALUES (?, ?)", [newId, name]);

                        // Seed default habits
                        const starters = [
                            { n: "Read 10 pages", e: "📚", c: "#3b82f6", cat: "Learn", t: "09:00" },
                            { n: "Walk 15 mins", e: "🏃", c: "#22c55e", cat: "Fitness", t: "17:00" },
                            { n: "Hydrate", e: "💧", c: "#06b6d4", cat: "Health", t: "12:00" }
                        ];

                        starters.forEach(h => {
                            db.run("INSERT INTO habits (user_id, name, emoji, color, time, category) VALUES (?, ?, ?, ?, ?, ?)",
                                [newId, h.n, h.e, h.c, h.t, h.cat]);
                        });

                        return res.json({ token, user: { id: newId, name, email } });
                    }
                );
            }
        });

    } catch (e) {
        console.error("Google Auth Error:", e);
        return res.status(401).json({ error: "Failed to verify Google Token" });
    }
});

module.exports = router;
