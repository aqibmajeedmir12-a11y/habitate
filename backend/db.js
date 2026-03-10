const sqlite3 = require("sqlite3").verbose();

const db = new sqlite3.Database(
  "./habits.db",
  (err) => {
    if (err) {
      console.error("❌ DB Connection Error:", err);
    } else {
      console.log("✅ Connected to SQLite Local Database");
      initTables();
    }
  }
);

/* ══════════════════════════════════════
   INIT ALL TABLES IN SERIES
   (run inside the connection callback so
    the DB handle is guaranteed to be open)
══════════════════════════════════════ */
function initTables() {

  db.serialize(() => {

    /* ── users ── */
    db.run(`
      CREATE TABLE IF NOT EXISTS users (
        id       INTEGER PRIMARY KEY AUTOINCREMENT,
        name     TEXT    NOT NULL,
        email    TEXT    NOT NULL UNIQUE,
        password TEXT    NOT NULL,
        profile_photo TEXT
      )
    `);
    db.run("ALTER TABLE users ADD COLUMN profile_photo TEXT", (err) => { /* Ignore if exists */ });

    /* ── habits ── */
    db.run(`
      CREATE TABLE IF NOT EXISTS habits (
        id       INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id  INTEGER NOT NULL,
        name     TEXT    NOT NULL,
        emoji    TEXT,
        color    TEXT,
        category TEXT    DEFAULT 'General',
        time     TEXT    DEFAULT 'Anytime',
        streak   INTEGER DEFAULT 0,
        done     INTEGER DEFAULT 0,
        FOREIGN KEY (user_id) REFERENCES users(id)
      )
    `);

    /* ── habit_logs ──
       UNIQUE on (habit_id, date) so INSERT OR IGNORE
       correctly skips duplicate same-day entries.        */
    db.run(`
      CREATE TABLE IF NOT EXISTS habit_logs (
        id         INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id    INTEGER NOT NULL,
        habit_id   INTEGER NOT NULL,
        date       TEXT    NOT NULL,
        completed  INTEGER DEFAULT 1,
        UNIQUE(habit_id, date),
        FOREIGN KEY (user_id) REFERENCES users(id),
        FOREIGN KEY (habit_id) REFERENCES habits(id)
      )
    `);

    /* ── habit_schedule ──
       UNIQUE prevents duplicate day-assignments when
       the auto-insert block below runs on every restart. */
    db.run(`
      CREATE TABLE IF NOT EXISTS habit_schedule (
        id        INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id   INTEGER NOT NULL,
        habit_id  INTEGER NOT NULL,
        weekday   INTEGER NOT NULL,   -- 0 = Monday … 6 = Sunday
        UNIQUE(habit_id, weekday),
        FOREIGN KEY (user_id) REFERENCES users(id),
        FOREIGN KEY (habit_id) REFERENCES habits(id)
      )
    `);

    /* ── settings ── */
    db.run(`
      CREATE TABLE IF NOT EXISTS settings (
        user_id   INTEGER PRIMARY KEY,
        name      TEXT,
        dailyGoal INTEGER DEFAULT 6,
        notif     INTEGER DEFAULT 1,
        streak    INTEGER DEFAULT 1,
        email     INTEGER DEFAULT 0,
        ach       INTEGER DEFAULT 1,
        quotes    INTEGER DEFAULT 1,
        FOREIGN KEY (user_id) REFERENCES users(id)
      )
    `);

    /* ── user_stats ── */
    db.run(`
      CREATE TABLE IF NOT EXISTS user_stats (
        user_id INTEGER PRIMARY KEY,
        xp      INTEGER DEFAULT 0,
        level   INTEGER DEFAULT 1,
        FOREIGN KEY (user_id) REFERENCES users(id)
      )
    `);

    /* ── ai_cache ── */
    db.run(`
      CREATE TABLE IF NOT EXISTS ai_cache (
        prompt    TEXT PRIMARY KEY,
        response  TEXT,
        timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    /* ── chat_history ── */
    db.run(`
      CREATE TABLE IF NOT EXISTS chat_history (
        id        INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id   INTEGER NOT NULL,
        role      TEXT NOT NULL,
        content   TEXT NOT NULL,
        timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id)
      )
    `);

  });
}

module.exports = db;