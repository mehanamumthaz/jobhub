const express = require('express');
const router = express.Router();
const jobController = require('../controllers/jobController');
const { isAuthenticated } = require('../middleware/authMiddleware');

// POST route for applying
router.post('/apply/:jobId', isAuthenticated, jobController.applyJob);

// GET route for viewing history
router.get('/my-applications', isAuthenticated, jobController.getMyApplications);

module.exports = router;
