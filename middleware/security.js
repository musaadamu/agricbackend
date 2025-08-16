const helmet = require('helmet');
// const rateLimit = require('express-rate-limit'); // REMOVED
const mongoSanitize = require('express-mongo-sanitize');
const xss = require('xss');
const hpp = require('hpp');

// Rate limiting configurations REMOVED
// All rate limiting has been disabled per user request

// Helmet configuration for security headers
const helmetConfig = helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: [
        "'self'", 
        "'unsafe-inline'", 
        "https://fonts.googleapis.com",
        "https://cdnjs.cloudflare.com"
      ],
      scriptSrc: [
        "'self'",
        "'unsafe-inline'",
        "https://cdnjs.cloudflare.com"
      ],
      fontSrc: [
        "'self'",
        "https://fonts.gstatic.com",
        "https://cdnjs.cloudflare.com"
      ],
      imgSrc: [
        "'self'",
        "data:",
        "https:",
        "blob:"
      ],
      connectSrc: [
        "'self'",
        "https://api.cloudinary.com",
        "https://res.cloudinary.com"
      ],
      frameSrc: ["'none'"],
      objectSrc: ["'none'"],
      upgradeInsecureRequests: []
    }
  },
  crossOriginEmbedderPolicy: false,
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true
  }
});

// Input sanitization middleware
const sanitizeInput = (req, res, next) => {
  // Sanitize request body
  if (req.body) {
    for (let key in req.body) {
      if (typeof req.body[key] === 'string') {
        req.body[key] = xss(req.body[key]);
      }
    }
  }

  // Sanitize query parameters
  if (req.query) {
    for (let key in req.query) {
      if (typeof req.query[key] === 'string') {
        req.query[key] = xss(req.query[key]);
      }
    }
  }

  // Sanitize URL parameters
  if (req.params) {
    for (let key in req.params) {
      if (typeof req.params[key] === 'string') {
        req.params[key] = xss(req.params[key]);
      }
    }
  }

  next();
};

// Security logging middleware
const securityLogger = (req, res, next) => {
  const startTime = Date.now();
  
  // Log suspicious patterns
  const suspiciousPatterns = [
    /(\<script\>|\<\/script\>)/i,
    /(union|select|insert|delete|update|drop|create|alter)/i,
    /(\.\.|\/etc\/|\/bin\/|\/usr\/)/i,
    /(eval\(|javascript:|vbscript:)/i
  ];

  const requestData = JSON.stringify({
    body: req.body,
    query: req.query,
    params: req.params
  });

  const isSuspicious = suspiciousPatterns.some(pattern => pattern.test(requestData));

  if (isSuspicious) {
    console.warn(`🚨 SUSPICIOUS REQUEST DETECTED:`, {
      ip: req.ip,
      method: req.method,
      path: req.path,
      userAgent: req.get('User-Agent'),
      body: req.body,
      query: req.query,
      timestamp: new Date().toISOString()
    });
  }

  // Log response time and status
  res.on('finish', () => {
    const duration = Date.now() - startTime;
    if (duration > 5000) { // Log slow requests
      console.warn(`⚠️ SLOW REQUEST:`, {
        ip: req.ip,
        method: req.method,
        path: req.path,
        duration: `${duration}ms`,
        status: res.statusCode
      });
    }
  });

  next();
};

// File upload security
const fileUploadSecurity = (req, res, next) => {
  if (req.files || req.file) {
    const files = req.files || [req.file];
    
    for (let file of files) {
      if (file) {
        // Check file size (50MB limit)
        if (file.size > 50 * 1024 * 1024) {
          return res.status(413).json({
            error: 'File too large. Maximum size is 50MB.'
          });
        }

        // Check file type
        const allowedTypes = [
          'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
          'application/pdf',
          'image/jpeg',
          'image/png',
          'image/jpg'
        ];

        if (!allowedTypes.includes(file.mimetype)) {
          return res.status(400).json({
            error: 'Invalid file type. Only DOCX, PDF, and image files are allowed.'
          });
        }

        // Check for malicious file names
        const maliciousPatterns = [
          /\.\./,
          /[<>:"|?*]/,
          /^(con|prn|aux|nul|com[1-9]|lpt[1-9])$/i
        ];

        if (maliciousPatterns.some(pattern => pattern.test(file.originalname))) {
          return res.status(400).json({
            error: 'Invalid file name.'
          });
        }
      }
    }
  }
  next();
};

// IP whitelist for admin operations (optional)
const adminIPWhitelist = (req, res, next) => {
  // Skip in development
  if (process.env.NODE_ENV !== 'production') {
    return next();
  }

  const allowedIPs = process.env.ADMIN_ALLOWED_IPS ? 
    process.env.ADMIN_ALLOWED_IPS.split(',') : [];

  if (allowedIPs.length > 0 && !allowedIPs.includes(req.ip)) {
    console.warn(`🚨 UNAUTHORIZED ADMIN ACCESS ATTEMPT:`, {
      ip: req.ip,
      path: req.path,
      userAgent: req.get('User-Agent'),
      timestamp: new Date().toISOString()
    });

    return res.status(403).json({
      error: 'Access denied from this IP address.'
    });
  }

  next();
};

module.exports = {
  helmetConfig,
  // Rate limiters removed
  mongoSanitize,
  hpp,
  sanitizeInput,
  securityLogger,
  fileUploadSecurity,
  adminIPWhitelist
};
