const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// Define database path
const dbPath = path.join(__dirname, '..', 'data', 'hating.db');

// Create and open the database
const db = new sqlite3.Database(dbPath, (err) => {
  if (err) console.error('Database Error:', err);
  else console.log('Hating database initialized.');
});

// Create table if it doesn't exist
db.run(`
  CREATE TABLE IF NOT EXISTS hating_points (
    user_id TEXT PRIMARY KEY,
    points INTEGER DEFAULT 0
  )
`);

module.exports = {
  addPoint: (userId) => {
    db.run(
      `INSERT INTO hating_points (user_id, points) VALUES (?, 1) ON CONFLICT(user_id) DO UPDATE SET points = points + 1`,
      [userId]
    );
  },

  getLeaderboard: (limit, offset, callback) => {
    db.all(
      `SELECT user_id, points FROM hating_points ORDER BY points DESC LIMIT ? OFFSET ?`,
      [limit, offset],
      (err, rows) => {
        if (err) {
          console.error('Leaderboard Fetch Error:', err);
          return callback([]);
        }
        callback(rows);
      }
    );
  },

  removePoint: (userId) => {
    db.run(
      `UPDATE hating_points SET points = MAX(points - 1, 0) WHERE user_id = ?`,
      [userId]
    );
  },
  

  getTotalUsers: (callback) => {
    db.get(`SELECT COUNT(*) AS total FROM hating_points`, (err, row) => {
      if (err) {
        console.error('Error fetching total users:', err);
        return callback(0);
      }
      callback(row.total);
    });
  },
};
