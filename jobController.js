const Application = require('../models/applicationModel');
const Job = require('../models/jobModel');

exports.applyJob = async (req, res) => {
    try {
        const studentId = req.session.user._id;
        const jobId = req.params.jobId;
        const { resumeId } = req.body;

        // 1. Validation
        if (!resumeId) {
            req.flash('error', 'Please select a resume version.');
            return res.redirect(`/jobs/${jobId}`);
        }

        // 2. Check duplicate (Mongoose will also catch this via Unique Index, but prepress check is cleaner)
        const alreadyApplied = await Application.findOne({ studentId, jobId });
        if (alreadyApplied) {
            req.flash('error', 'You have already applied for this position.');
            return res.redirect('/my-applications');
        }

        // 3. Create Application
        await Application.create({
            studentId,
            jobId,
            resumeId
        });

        // 4. Success Response
        req.flash('success', 'Application submitted successfully! Good luck.');
        res.redirect('/my-applications');

    } catch (error) {
        console.error("Apply Job Error:", error);
        req.flash('error', 'Something went wrong during the application process.');
        res.redirect('back');
    }
};

exports.getMyApplications = async (req, res) => {
    try {
        const studentId = req.session.user._id;
        const applications = await Application.find({ studentId })
            .populate('jobId')
            .sort({ appliedDate: -1 });

        res.render('student/my-applications', {
            title: 'My Applications',
            applications,
            messages: req.flash()
        });
    } catch (err) {
        res.status(500).send("Error fetching applications");
    }
};
