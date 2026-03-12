const mongoose = require('mongoose');

const applicationSchema = new mongoose.Schema({
    studentId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    jobId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Job',
        required: true
    },
    resumeId: {
        type: String, // Or ObjectId if you have a Resume model
        required: true
    },
    status: {
        type: String,
        enum: ['Applied', 'Shortlisted', 'Rejected', 'Selected'],
        default: 'Applied'
    },
    appliedDate: {
        type: Date,
        default: Date.now
    }
});

// Compound index to prevent duplicate applications from same student to same job
applicationSchema.index({ studentId: 1, jobId: 1 }, { unique: true });

module.exports = mongoose.model('Application', applicationSchema);
