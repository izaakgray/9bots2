const Database = require('better-sqlite3');
const path = require('path');

// Open the SQLite database
const db = new Database(path.join(__dirname, '..', 'data', 'stats.db'));

// Users to reset
const usersToReset = [
    '190643626051764224',
    '270051447075241984'
];

try {
    // Begin a transaction
    const transaction = db.transaction(() => {
        const resetStmt = db.prepare(`
            UPDATE user_stats 
            SET messages_sent = 0, triggers = 0 
            WHERE user_id = ?
        `);

        for (const userId of usersToReset) {
            resetStmt.run(userId);
            console.log(`✅ Reset counters for user ${userId}`);
        }
    });

    // Execute the transaction
    transaction();
    
    console.log('✅ Successfully reset all counters');
} catch (err) {
    console.error('❌ Error resetting counters:', err);
} finally {
    // Close the database connection
    db.close();
} 