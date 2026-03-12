const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('./jobs.db');

db.serialize(() => {
    // 1. Ensure Student
    db.run("INSERT OR IGNORE INTO users (email, password, role) VALUES (?, ?, ?)",
        ['student@jobhub.com', 'student123', 'student'], function (err) {

            // Find the actual ID (whether just inserted or existing)
            db.get("SELECT id FROM users WHERE email = ?", ['student@jobhub.com'], (err, user) => {
                if (user) {
                    db.run("INSERT OR IGNORE INTO student_profiles (user_id, name, university) VALUES (?, ?, ?)",
                        [user.id, 'Demo Student', 'Tech University']);
                }
            });
        });

    // 2. Ensure Company
    db.run("INSERT OR IGNORE INTO users (email, password, role) VALUES (?, ?, ?)",
        ['company@jobhub.com', 'company123', 'company'], function (err) {

            db.get("SELECT id FROM users WHERE email = ?", ['company@jobhub.com'], (err, user) => {
                if (user) {
                    db.run("INSERT OR IGNORE INTO company_profiles (user_id, company_name, industry) VALUES (?, ?, ?)",
                        [user.id, 'Global Tech Inc', 'Software']);
                }
            });
        });

    console.log('--- Pro Demo Accounts Synchronized ---');
});
