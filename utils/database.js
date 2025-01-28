const Database = require('better-sqlite3');
const path = require('path');

// Open the SQLite database
const db = new Database(path.join(__dirname, '..', 'data', 'stats.db'));

// Create the table if it doesn't exist
db.exec(`
  CREATE TABLE IF NOT EXISTS user_stats (
    user_id TEXT PRIMARY KEY,
    messages_sent INTEGER DEFAULT 0,
    triggers INTEGER DEFAULT 0
  )
`);

// Export prepared statements for use elsewhere
module.exports = {
  incrementMessage: db.prepare(`
    INSERT INTO user_stats (user_id, messages_sent, triggers)
    VALUES (?, 1, 0)
    ON CONFLICT(user_id) DO UPDATE SET messages_sent = messages_sent + 1
  `),
  incrementTrigger: db.prepare(`
    UPDATE user_stats SET triggers = triggers + 1 WHERE user_id = ?
  `),
  getUserStats: db.prepare(`
    SELECT messages_sent, triggers FROM user_stats WHERE user_id = ?
  `),
};
