const jwt = require('jsonwebtoken');
const User = require('../models/User');

// Track failed login attempts
const failedAttempts = new Map();
const LOCKOUT_TIME = 15 * 60 * 1000; // 15 minutes
const MAX_ATTEMPTS = 5;

exports.protect = async (req, res, next) => {
    try {
        let token;

        // Get token from header or cookies
        if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
            token = req.headers.authorization.split(' ')[1];
        } else if (req.cookies.token) {
            token = req.cookies.token;
        }

        if (!token) {
            console.warn(`🚨 UNAUTHORIZED ACCESS ATTEMPT:`, {
                ip: req.ip,
                path: req.path,
                userAgent: req.get('User-Agent'),
                timestamp: new Date().toISOString()
            });
            return res.status(401).json({
                success: false,
                message: 'Not authorized to access this route'
            });
        }

        try {
            // Verify token
            const decoded = jwt.verify(token, process.env.JWT_SECRET);

            // Check if user still exists
            const user = await User.findById(decoded.id).select('-password');
            if (!user) {
                return res.status(401).json({
                    success: false,
                    message: 'User no longer exists'
                });
            }

            // Check if user is active (if you have an active field)
            if (user.active === false) {
                return res.status(401).json({
                    success: false,
                    message: 'User account is deactivated'
                });
            }

            req.user = user;
            next();
        } catch (error) {
            console.warn(`🚨 INVALID TOKEN ATTEMPT:`, {
                ip: req.ip,
                path: req.path,
                error: error.message,
                timestamp: new Date().toISOString()
            });
            return res.status(401).json({
                success: false,
                message: 'Invalid token'
            });
        }
    } catch (error) {
        console.error('Auth middleware error:', error);
        return res.status(500).json({
            success: false,
            message: 'Server error'
        });
    }
};

// Admin only middleware
exports.adminOnly = async (req, res, next) => {
    try {
        // First check if the user is authenticated
        if (!req.user || !req.user.id) {
            console.log('Admin check failed: No authenticated user');
            return res.status(401).json({ message: 'Not authorized to access this route' });
        }

        // Find the user in the database to check their role
        const user = await User.findById(req.user.id);

        if (!user) {
            console.log('Admin check failed: User not found');
            return res.status(401).json({ message: 'User not found' });
        }

        // Check if the user has admin role
        if (user.role !== 'admin') {
            console.log('Admin check failed: User is not an admin, role:', user.role);
            return res.status(403).json({ message: 'Admin access required' });
        }

        console.log('Admin access granted for user:', user.email);
        next();
    } catch (err) {
        console.error('Admin check error:', err);
        return res.status(500).json({ message: 'Server error during authorization check' });
    }
};

// Role-based access control
exports.authorize = (...roles) => {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({
                success: false,
                message: 'Not authorized to access this route'
            });
        }

        if (!roles.includes(req.user.role)) {
            console.warn(`🚨 INSUFFICIENT PRIVILEGES:`, {
                ip: req.ip,
                path: req.path,
                userId: req.user.id,
                userRole: req.user.role,
                requiredRoles: roles,
                timestamp: new Date().toISOString()
            });
            return res.status(403).json({
                success: false,
                message: `User role ${req.user.role} is not authorized to access this route`
            });
        }

        next();
    };
};

// Track and prevent brute force attacks
exports.trackFailedAttempts = (identifier) => {
    const now = Date.now();
    const attempts = failedAttempts.get(identifier) || { count: 0, lastAttempt: now };

    // Reset if lockout time has passed
    if (now - attempts.lastAttempt > LOCKOUT_TIME) {
        attempts.count = 0;
    }

    attempts.count++;
    attempts.lastAttempt = now;
    failedAttempts.set(identifier, attempts);

    return attempts.count;
};

// Check if IP/user is locked out
exports.isLockedOut = (identifier) => {
    const attempts = failedAttempts.get(identifier);
    if (!attempts) return false;

    const now = Date.now();
    if (attempts.count >= MAX_ATTEMPTS && now - attempts.lastAttempt < LOCKOUT_TIME) {
        return true;
    }

    return false;
};

// Clear failed attempts on successful login
exports.clearFailedAttempts = (identifier) => {
    failedAttempts.delete(identifier);
};
