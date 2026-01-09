const { body, validationResult } = require('express-validator');

// Validation middleware executor
const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      error: 'Validation failed',
      details: errors.array()
    });
  }
  next();
};

// Registration validation
const registerValidation = [
  body('username')
    .trim()
    .isLength({ min: 3, max: 30 })
    .withMessage('Username must be 3-30 characters')
    .matches(/^[a-zA-Z0-9_-]+$/)
    .withMessage('Username must be alphanumeric with _ or -'),
  body('email')
    .trim()
    .isEmail()
    .withMessage('Must be a valid email')
    .normalizeEmail(),
  body('password')
    .isLength({ min: 9 })
    .withMessage('Password must be at least 9 characters')
];

// Login validation
const loginValidation = [
  body('username')
    .trim()
    .notEmpty()
    .withMessage('Username is required'),
  body('password')
    .notEmpty()
    .withMessage('Password is required')
];

// Sensor validation
const sensorValidation = [
  body('name')
    .trim()
    .isLength({ min: 1, max: 100 })
    .withMessage('Sensor name must be 1-100 characters'),
  body('type')
    .trim()
    .isIn(['temperature', 'humidity', 'pressure', 'motion', 'light'])
    .withMessage('Invalid sensor type'),
  body('location')
    .optional()
    .trim()
    .isLength({ max: 200 })
    .withMessage('Location must be under 200 characters'),
  body('is_public')
    .optional()
    .isBoolean()
    .withMessage('is_public must be boolean'),
  body('status')
    .optional()
    .isIn(['active', 'inactive', 'maintenance'])
    .withMessage('Invalid status')
];

// User update validation (admin)
const userUpdateValidation = [
  body('username')
    .optional()
    .trim()
    .isLength({ min: 3, max: 30 })
    .withMessage('Username must be 3-30 characters')
    .matches(/^[a-zA-Z0-9_-]+$/)
    .withMessage('Username must be alphanumeric with _ or -'),
  body('email')
    .optional()
    .trim()
    .isEmail()
    .withMessage('Must be a valid email')
    .normalizeEmail(),
  body('role')
    .optional()
    .isIn(['guest', 'user', 'admin'])
    .withMessage('Invalid role'),
  body('password')
    .optional()
    .isLength({ min: 9 })
    .withMessage('Password must be at least 9 characters')
];

module.exports = {
  validate,
  registerValidation,
  loginValidation,
  sensorValidation,
  userUpdateValidation
};
