# JobHub - Modern Job Application Tracker

A sleek, web-based system to store, organize, and monitor your job or internship applications. Designed with a premium UI and powered by a lightweight SQL backend.

## Features
- **Application Tracking**: Add your job applications with company, role, status, and dates.
- **Status Management**: Update the lifecycle of your application (Pending -> Applied -> Interviewing -> etc.).
- **Live Search**: Quickly find applications by company or role.
- **Progress Insights**: See your application stats at a glance.
- **Resource Linking**: Keep direct links to job postings and internal notes.

## Tech Stack
- **Frontend**: HTML5, CSS3 (Glassmorphism & CSS Animations), JavaScript (Vanilla).
- **Backend**: Node.js, Express.
- **Database**: SQL (SQLite used for easy setup, compatible with MySQL).

## How to Run
1. **Initialize Project**:
   ```bash
   npm install
   ```
2. **Start the Server**:
   ```bash
   npm start
   ```
3. **Access the Portal**:
   Open your browser and navigate to `http://localhost:3000`.

## Database Structure
The system uses a table named `applications` with the following schema:
- `id`: Unique identifier (Primary Key)
- `company`: Name of the employer
- `role`: Target job title
- `status`: Lifecycle state
- `date_applied`: Date of submission
- `link`: URL to job post
- `notes`: Personal notes or follow-up details
