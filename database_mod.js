const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.resolve(__dirname, '../jobs.db');
const db = new sqlite3.Database(dbPath, (err) => {
    if (err) console.error("DB Connection Error:", err.message);
    else console.log("Module-level DB Connected.");
});

module.exports = db;
