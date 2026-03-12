const express = require('express');
const dotenv = require('dotenv');
const cors = require('cors');
const path = require('path');

// Load environment variables (mostly for PORT)
dotenv.config({ path: path.join(__dirname, '.env') });

const app = express();

// Middleware
app.use(express.json());
app.use(cors());
app.use((req, res, next) => {
    console.log(`${req.method} ${req.url}`);
    next();
});

// Serve Static Frontend files
const frontendPath = path.resolve(__dirname, '../frontend');
app.use(express.static(frontendPath));

// SQLite DB Instance
const db = require('./database_mod');

// Route definitions
const authRoutes = require('./routes/auth');
const vacancyRoutes = require('./routes/vacancies');
const applicationRoutes = require('./routes/applications');
const dashboardRoutes = require('./routes/dashboard');
const toolsRoutes = require('./routes/tools');

// Mount API routes
app.use('/api', authRoutes); // Supports /api/register and /api/login
app.use('/api/auth', authRoutes); // Supports /api/auth/login for frontend compat
app.use('/api/vacancies', vacancyRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api', applicationRoutes);
app.use('/api/tools', toolsRoutes);


// Catch-all to serve index.html (SPA)
app.use((req, res, next) => {
    if (req.originalUrl.startsWith('/api')) return next();
    res.sendFile(path.join(frontendPath, 'index.html'));
});

// Error Handling
app.use((err, req, res, next) => {
    console.error("Backend Error:", err.stack);
    res.status(500).json({ error: "Major disruption. Please restart server." });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`JobHub [SQLite Backend] active on port ${PORT}`);
    console.log(`Access at http://localhost:${PORT}`);
});
