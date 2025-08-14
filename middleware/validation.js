const { body, param, query, validationResult } = require('express-validator');
const mongoose = require('mongoose');

// Handle validation errors
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    console.warn(`🚨 VALIDATION ERRORS:`, {
      ip: req.ip,
      path: req.path,
      errors: errors.array(),
      timestamp: new Date().toISOString()
    });

    return res.status(400).json({
      error: 'Validation failed',
      details: errors.array().map(error => ({
        field: error.path,
        message: error.msg,
        value: error.value
      }))
    });
  }
  next();
};

// User registration validation
const validateUserRegistration = [
  body('name')
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage('Name must be between 2 and 50 characters')
    .matches(/^[a-zA-Z\s]+$/)
    .withMessage('Name can only contain letters and spaces'),
  
  body('email')
    .isEmail()
    .withMessage('Please provide a valid email address')
    .normalizeEmail()
    .isLength({ max: 100 })
    .withMessage('Email must not exceed 100 characters'),
  
  body('password')
    .isLength({ min: 8, max: 128 })
    .withMessage('Password must be between 8 and 128 characters')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
    .withMessage('Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character'),
  
  body('role')
    .optional()
    .isIn(['user', 'admin', 'editor'])
    .withMessage('Invalid role specified'),
  
  handleValidationErrors
];

// User login validation
const validateUserLogin = [
  body('email')
    .isEmail()
    .withMessage('Please provide a valid email address')
    .normalizeEmail(),
  
  body('password')
    .notEmpty()
    .withMessage('Password is required')
    .isLength({ max: 128 })
    .withMessage('Password too long'),
  
  handleValidationErrors
];

// Password reset validation
const validatePasswordReset = [
  body('email')
    .isEmail()
    .withMessage('Please provide a valid email address')
    .normalizeEmail(),
  
  handleValidationErrors
];

// New password validation
const validateNewPassword = [
  body('password')
    .isLength({ min: 8, max: 128 })
    .withMessage('Password must be between 8 and 128 characters')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
    .withMessage('Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character'),
  
  body('token')
    .notEmpty()
    .withMessage('Reset token is required')
    .isLength({ min: 10, max: 500 })
    .withMessage('Invalid token format'),
  
  handleValidationErrors
];

// Journal submission validation
const validateJournalSubmission = [
  body('title')
    .trim()
    .isLength({ min: 5, max: 200 })
    .withMessage('Title must be between 5 and 200 characters')
    .matches(/^[a-zA-Z0-9\s\-\:\.\,\(\)]+$/)
    .withMessage('Title contains invalid characters'),
  
  body('abstract')
    .trim()
    .isLength({ min: 50, max: 2000 })
    .withMessage('Abstract must be between 50 and 2000 characters'),
  
  body('authors')
    .isArray({ min: 1, max: 10 })
    .withMessage('At least one author is required, maximum 10 authors allowed'),
  
  body('authors.*')
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('Each author name must be between 2 and 100 characters')
    .matches(/^[a-zA-Z\s\.\-]+$/)
    .withMessage('Author names can only contain letters, spaces, dots, and hyphens'),
  
  body('keywords')
    .optional()
    .isArray({ max: 20 })
    .withMessage('Maximum 20 keywords allowed'),
  
  body('keywords.*')
    .optional()
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage('Each keyword must be between 2 and 50 characters')
    .matches(/^[a-zA-Z0-9\s\-]+$/)
    .withMessage('Keywords can only contain letters, numbers, spaces, and hyphens'),
  
  handleValidationErrors
];

// MongoDB ObjectId validation
const validateObjectId = (paramName) => [
  param(paramName)
    .custom((value) => {
      if (!mongoose.Types.ObjectId.isValid(value)) {
        throw new Error('Invalid ID format');
      }
      return true;
    }),
  
  handleValidationErrors
];

// Search query validation
const validateSearchQuery = [
  query('search')
    .optional()
    .trim()
    .isLength({ min: 1, max: 100 })
    .withMessage('Search query must be between 1 and 100 characters')
    .matches(/^[a-zA-Z0-9\s\-\.\,]+$/)
    .withMessage('Search query contains invalid characters'),
  
  query('page')
    .optional()
    .isInt({ min: 1, max: 1000 })
    .withMessage('Page must be a number between 1 and 1000'),
  
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limit must be a number between 1 and 100'),
  
  handleValidationErrors
];

// Profile update validation
const validateProfileUpdate = [
  body('name')
    .optional()
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage('Name must be between 2 and 50 characters')
    .matches(/^[a-zA-Z\s]+$/)
    .withMessage('Name can only contain letters and spaces'),
  
  body('email')
    .optional()
    .isEmail()
    .withMessage('Please provide a valid email address')
    .normalizeEmail()
    .isLength({ max: 100 })
    .withMessage('Email must not exceed 100 characters'),
  
  body('currentPassword')
    .optional()
    .notEmpty()
    .withMessage('Current password is required when updating profile'),
  
  body('newPassword')
    .optional()
    .isLength({ min: 8, max: 128 })
    .withMessage('New password must be between 8 and 128 characters')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
    .withMessage('New password must contain at least one uppercase letter, one lowercase letter, one number, and one special character'),
  
  handleValidationErrors
];

// Contact form validation
const validateContactForm = [
  body('name')
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage('Name must be between 2 and 50 characters')
    .matches(/^[a-zA-Z\s]+$/)
    .withMessage('Name can only contain letters and spaces'),
  
  body('email')
    .isEmail()
    .withMessage('Please provide a valid email address')
    .normalizeEmail(),
  
  body('subject')
    .trim()
    .isLength({ min: 5, max: 100 })
    .withMessage('Subject must be between 5 and 100 characters'),
  
  body('message')
    .trim()
    .isLength({ min: 10, max: 1000 })
    .withMessage('Message must be between 10 and 1000 characters'),
  
  handleValidationErrors
];

// File upload validation
const validateFileUpload = (req, res, next) => {
  if (!req.files && !req.file) {
    return res.status(400).json({
      error: 'No files uploaded'
    });
  }

  const files = req.files || [req.file];
  
  for (let file of files) {
    if (file) {
      // Validate file name
      if (!/^[a-zA-Z0-9\s\-\._]+$/.test(file.originalname)) {
        return res.status(400).json({
          error: 'Invalid file name. Only letters, numbers, spaces, hyphens, dots, and underscores are allowed.'
        });
      }

      // Validate file extension
      const allowedExtensions = ['.docx', '.pdf', '.jpg', '.jpeg', '.png'];
      const fileExtension = file.originalname.toLowerCase().substring(file.originalname.lastIndexOf('.'));
      
      if (!allowedExtensions.includes(fileExtension)) {
        return res.status(400).json({
          error: 'Invalid file type. Only DOCX, PDF, and image files are allowed.'
        });
      }
    }
  }

  next();
};

module.exports = {
  validateUserRegistration,
  validateUserLogin,
  validatePasswordReset,
  validateNewPassword,
  validateJournalSubmission,
  validateObjectId,
  validateSearchQuery,
  validateProfileUpdate,
  validateContactForm,
  validateFileUpload,
  handleValidationErrors
};
