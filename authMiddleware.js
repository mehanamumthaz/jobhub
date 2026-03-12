function isAuthenticated(req, res, next) {
    if (req.session && req.session.user) {
        return next();
    }

    // Save intended destination for post-login redirect if needed
    req.session.returnTo = req.originalUrl;

    // Using flash for user feedback
    // req.flash('error', 'Authentication required. Please log in.'); // If using connect-flash
    res.redirect('/login');
}

module.exports = { isAuthenticated };
