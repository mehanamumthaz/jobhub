-- Recommended MySQL Table Schema (if switching from SQLite)

CREATE DATABASE IF NOT EXISTS job_portal;
USE job_portal;

CREATE TABLE applications (
    id INT AUTO_INCREMENT PRIMARY KEY,
    company VARCHAR(255) NOT NULL,
    role VARCHAR(255) NOT NULL,
    status ENUM('Pending', 'Applied', 'Interviewing', 'Offered', 'Rejected', 'Withdrawn') DEFAULT 'Pending',
    date_applied DATE,
    link TEXT,
    notes TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
