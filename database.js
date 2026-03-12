const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.resolve(__dirname, 'jobs.db');
const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
        console.error('Error connecting to database:', err.message);
    } else {
        console.log('Connected to the SQLite database.');
        createTables();
    }
});

function createTables() {
    db.serialize(() => {
        // 1. Users table (Central Auth)
        db.run(`CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            email TEXT UNIQUE NOT NULL,
            password TEXT NOT NULL,
            role TEXT NOT NULL CHECK(role IN ('student', 'company')),
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )`);

        // 2. Student Profiles
        db.run(`CREATE TABLE IF NOT EXISTS student_profiles (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER UNIQUE,
            name TEXT,
            university TEXT,
            skills TEXT,
            resume_url TEXT,
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        )`);

        // 3. Company Profiles
        db.run(`CREATE TABLE IF NOT EXISTS company_profiles (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER UNIQUE,
            company_name TEXT,
            location TEXT,
            industry TEXT,
            contact_number TEXT,
            company_size TEXT,
            logo_url TEXT,
            website TEXT,
            social_links TEXT,
            description TEXT,
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        )`);

        // 4. Job Vacancies (Posted by Companies)
        db.run(`CREATE TABLE IF NOT EXISTS vacancies (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            company_id INTEGER,
            title TEXT NOT NULL,
            job_type TEXT, -- Internship / Full-time / Part-time
            location_type TEXT, -- Onsite / Remote / Hybrid
            location TEXT,
            salary TEXT,
            deadline TEXT,
            skills_required TEXT,
            experience_required TEXT,
            education_qualification TEXT,
            min_cgpa TEXT,
            description TEXT,
            status TEXT DEFAULT 'Open',
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (company_id) REFERENCES company_profiles(id) ON DELETE CASCADE
        )`);

        // 5. Applications (Student applying to Vacancy)
        db.run(`CREATE TABLE IF NOT EXISTS portal_applications (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            vacancy_id INTEGER,
            student_id INTEGER,
            resume_version TEXT,
            status TEXT DEFAULT 'Applied' CHECK(status IN ('Applied', 'Shortlisted', 'Rejected', 'Selected')),
            applied_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (vacancy_id) REFERENCES vacancies(id) ON DELETE CASCADE,
            FOREIGN KEY (student_id) REFERENCES student_profiles(id) ON DELETE CASCADE
        )`);

        // 6. Legacy Personal Tracker Table
        db.run(`CREATE TABLE IF NOT EXISTS applications (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            company TEXT NOT NULL,
            role TEXT NOT NULL,
            status TEXT DEFAULT 'Pending',
            date_applied TEXT,
            link TEXT,
            notes TEXT,
            priority_score INTEGER DEFAULT 0,
            success_probability INTEGER DEFAULT 0,
            resume_version TEXT,
            jd_keywords TEXT,
            jd_text TEXT,
            skill_match INTEGER DEFAULT 0,
            interest_level INTEGER DEFAULT 0,
            location_fit INTEGER DEFAULT 0,
            follow_up_date TEXT,
            follow_up_days INTEGER DEFAULT 7,
            follow_up_status TEXT DEFAULT 'Pending',
            company_name TEXT,
            job_role TEXT,
            application_status TEXT CHECK(application_status IN ('Applied', 'Interview', 'Offer', 'Rejected')),
            student_id INTEGER,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (student_id) REFERENCES student_profiles(id) ON DELETE CASCADE
        )`);

        // 7. Role-based Checklist Table
        db.run(`CREATE TABLE IF NOT EXISTS checklists(
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            role TEXT NOT NULL,
            task TEXT NOT NULL
        )`);

        // 8. User Checklist Progress
        db.run(`CREATE TABLE IF NOT EXISTS user_checklist_progress(
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            student_id INTEGER,
            task_id INTEGER,
            completed BOOLEAN DEFAULT 0,
            FOREIGN KEY (student_id) REFERENCES users(id) ON DELETE CASCADE,
            FOREIGN KEY (task_id) REFERENCES checklists(id) ON DELETE CASCADE,
            UNIQUE(student_id, task_id)
        )`);

        // Seed some default checklist items
        db.get("SELECT COUNT(*) as count FROM checklists", (err, row) => {
            if (row && row.count === 0) {
                const stmt = db.prepare("INSERT INTO checklists (role, task) VALUES (?, ?)");
                const tasks = [
                    ['frontend', 'Revise DOM Manipulation'],
                    ['frontend', 'Practice CSS Grid/Flexbox'],
                    ['frontend', 'Modern JS (ES6+) Features'],
                    ['backend', 'Revise SQL Queries & Joins'],
                    ['backend', 'Deep dive into Node.js Event Loop'],
                    ['backend', 'Practice API Design Patterns'],
                    ['hr', 'Prepare behavioral interview answers'],
                    ['hr', 'Refine elevator pitch'],
                    ['hr', 'Research company culture patterns']
                ];
                tasks.forEach(t => stmt.run(t));
                stmt.finalize();
            }
        });

        // 9. Student Skills
        db.run(`CREATE TABLE IF NOT EXISTS student_skills (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            student_id INTEGER NOT NULL,
            skill_name TEXT NOT NULL,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (student_id) REFERENCES student_profiles(id) ON DELETE CASCADE,
            UNIQUE(student_id, skill_name)
        )`);

        // 10. Skill Match Results
        db.run(`CREATE TABLE IF NOT EXISTS skill_match_results (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            application_id INTEGER NOT NULL,
            matched_skills TEXT,
            missing_skills TEXT,
            match_percentage INTEGER,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (application_id) REFERENCES applications(id) ON DELETE CASCADE
        )`);

        console.log('Dual-Portal Tables Ready.');
    });
}

module.exports = db;
