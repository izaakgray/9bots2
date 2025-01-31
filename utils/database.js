const Database = require('better-sqlite3');
const path = require('path');
const userReactionsMap = require('../data/userReactionsMap'); // Import 1/100 user list

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
  // Increment message count for a user
  incrementMessage: db.prepare(`
    INSERT INTO user_stats (user_id, messages_sent, triggers)
    VALUES (?, 1, 0)
    ON CONFLICT(user_id) DO UPDATE SET messages_sent = messages_sent + 1
  `),

  // Increment 1/100 trigger count for a user
  incrementTrigger: db.prepare(`
    UPDATE user_stats SET triggers = triggers + 1 WHERE user_id = ?
  `),

  // Get individual user stats
  getUserStats: db.prepare(`
    SELECT messages_sent, triggers FROM user_stats WHERE user_id = ?
  `),

  // Get total messages & triggers across ALL users with a 1/100
  getTotalStats: () => {
    const userIds = Object.keys(userReactionsMap);
    if (userIds.length === 0) return { totalMessages: 0, totalTriggers: 0 };

    const placeholders = userIds.map(() => '?').join(', ');
    const query = `
      SELECT SUM(messages_sent) AS totalMessages, SUM(triggers) AS totalTriggers
      FROM user_stats
      WHERE user_id IN (${placeholders})
    `;

    return db.prepare(query).get(...userIds) || { totalMessages: 0, totalTriggers: 0 };
  },

  // Get leaderboard data (paginated)
  getLeaderboard: (limit, offset) => {
    return db.prepare(`
      SELECT user_id, messages_sent, triggers 
      FROM user_stats 
      ORDER BY triggers DESC, messages_sent DESC
      LIMIT ? OFFSET ?
    `).all(limit, offset);
  },

  // Get total number of users with a 1/100
  getTotalUsers: () => {
    const row = db.prepare(`SELECT COUNT(*) AS total FROM user_stats`).get();
    return row?.total || 0;
  },
};
