// // routes/authRoutes.js
// const express = require('express');
// const { register, login, logout, forgotPassword } = require('../controllers/authController');
// const { isAuthenticated } = require('../middlewares/authMiddleware');
// const router = express.Router();

// router.post('/register', register);
// router.post('/login', login);
// router.post('/logout', isAuthenticated, logout);
// router.post('/forgot-password', forgotPassword);

// module.exports = router;

const express = require('express');
const { register, login, logout, forgotPassword, resetPassword, updateUser, getProfile, createAdmin } = require('../controllers/authController');
const { protect, adminOnly, trackFailedAttempts, isLockedOut, clearFailedAttempts } = require('../middleware/authMiddleware');
const { validateUserRegistration, validateUserLogin, validatePasswordReset, validateNewPassword, validateProfileUpdate } = require('../middleware/validation');
const { securityMonitor, SECURITY_EVENTS } = require('../middleware/securityMonitoring');
const router = express.Router();

// Enhanced routes with security middleware (temporarily simplified for debugging)
router.post('/register', register);
router.post('/login', login);
router.post('/logout', protect, logout);
router.post('/forgot-password', validatePasswordReset, forgotPassword);
router.post('/reset-password/:token', validateNewPassword, resetPassword);
router.post('/reset-password', validateNewPassword, resetPassword);
router.put('/profile', protect, validateProfileUpdate, updateUser);
router.get('/profile', protect, getProfile);
router.get('/me', protect, getProfile);
router.post('/create-admin', validateUserRegistration, createAdmin);

// Security monitoring endpoint (admin only)
router.get('/security-report', protect, adminOnly, (req, res) => {
  const timeRange = req.query.hours ? parseInt(req.query.hours) * 60 * 60 * 1000 : undefined;
  const report = securityMonitor.getSecurityReport(timeRange);
  res.json(report);
});

module.exports = router;
