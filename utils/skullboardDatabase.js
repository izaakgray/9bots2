const Database = require('better-sqlite3');
const path = require('path');

// Open the SQLite database for skullboard
const db = new Database(path.join(__dirname, '..', 'data', 'skullboard.db'));

// Create the tables if they don't exist
db.exec(`
  CREATE TABLE IF NOT EXISTS skullboard_entries (
    message_id TEXT PRIMARY KEY,
    channel_id TEXT NOT NULL,
    guild_id TEXT NOT NULL,
    author_id TEXT NOT NULL,
    content TEXT,
    attachment_url TEXT,
    skull_count INTEGER DEFAULT 0,
    skullboard_message_id TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )
`);

db.exec(`
  CREATE TABLE IF NOT EXISTS skullboard_config (
    guild_id TEXT PRIMARY KEY,
    skullboard_channel_id TEXT,
    skull_emoji TEXT DEFAULT '💀',
    skull_threshold INTEGER DEFAULT 5,
    enabled BOOLEAN DEFAULT 1
  )
`);

// Export prepared statements for use elsewhere
module.exports = {
  // Get skullboard configuration for a guild
  getConfig: db.prepare(`
    SELECT * FROM skullboard_config WHERE guild_id = ?
  `),

  // Set skullboard configuration for a guild
  setConfig: db.prepare(`
    INSERT INTO skullboard_config (guild_id, skullboard_channel_id, skull_emoji, skull_threshold, enabled)
    VALUES (?, ?, ?, ?, ?)
    ON CONFLICT(guild_id) DO UPDATE SET
      skullboard_channel_id = excluded.skullboard_channel_id,
      skull_emoji = excluded.skull_emoji,
      skull_threshold = excluded.skull_threshold,
      enabled = excluded.enabled
  `),

  // Check if a message is already in the skullboard
  getSkullboardEntry: db.prepare(`
    SELECT * FROM skullboard_entries WHERE message_id = ?
  `),

  // Add a new message to the skullboard
  addSkullboardEntry: db.prepare(`
    INSERT INTO skullboard_entries (message_id, channel_id, guild_id, author_id, content, attachment_url, skull_count, skullboard_message_id)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `),

  // Update skull count for an existing entry
  updateSkullCount: db.prepare(`
    UPDATE skullboard_entries SET skull_count = ? WHERE message_id = ?
  `),

  // Update the skullboard message ID
  updateSkullboardMessageId: db.prepare(`
    UPDATE skullboard_entries SET skullboard_message_id = ? WHERE message_id = ?
  `),

  // Remove a message from skullboard
  removeSkullboardEntry: db.prepare(`
    DELETE FROM skullboard_entries WHERE message_id = ?
  `),

  // Get recent skullboard entries for a guild
  getRecentEntries: db.prepare(`
    SELECT * FROM skullboard_entries 
    WHERE guild_id = ? 
    ORDER BY created_at DESC 
    LIMIT ? OFFSET ?
  `),

  // Get total skullboard entries for a guild
  getTotalEntries: db.prepare(`
    SELECT COUNT(*) AS total FROM skullboard_entries WHERE guild_id = ?
  `),

  // Get top skulled messages for a guild
  getTopSkulled: db.prepare(`
    SELECT * FROM skullboard_entries 
    WHERE guild_id = ? 
    ORDER BY skull_count DESC 
    LIMIT ?
  `),
};
