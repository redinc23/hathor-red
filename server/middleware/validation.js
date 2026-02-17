const { body, param, query, validationResult } = require('express-validator');

const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      error: 'Validation failed',
      details: errors.array().map(e => ({ field: e.path, message: e.msg }))
    });
  }
  next();
};

// Auth validations
const registerValidation = [
  body('username')
    .trim()
    .isLength({ min: 3, max: 50 })
    .withMessage('Username must be 3-50 characters')
    .matches(/^[a-zA-Z0-9_]+$/)
    .withMessage('Username can only contain letters, numbers, and underscores'),
  body('email')
    .isEmail()
    .withMessage('Invalid email address')
    .normalizeEmail(),
  body('password')
    .isLength({ min: 8 })
    .withMessage('Password must be at least 8 characters')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage('Password must contain at least one uppercase letter, one lowercase letter, and one number'),
  body('displayName')
    .optional()
    .trim()
    .isLength({ max: 100 })
];

const loginValidation = [
  body('username').trim().notEmpty(),
  body('password').notEmpty()
];

// Song validations
const songUploadValidation = [
  body('title').trim().notEmpty().isLength({ max: 255 }),
  body('artist').trim().notEmpty().isLength({ max: 255 }),
  body('album').optional().trim().isLength({ max: 255 }),
  body('duration').isInt({ min: 1 }),
  body('genre').optional().trim().isLength({ max: 50 }),
  body('year').optional().isInt({ min: 1900, max: new Date().getFullYear() })
];

// Playlist validations
const playlistValidation = [
  body('name').trim().notEmpty().isLength({ max: 100 }),
  body('description').optional().trim().isLength({ max: 500 }),
  body('isPublic').optional().isBoolean()
];

const aiPlaylistValidation = [
  body('prompt').trim().notEmpty().isLength({ max: 500 }),
  body('name').optional().trim().isLength({ max: 100 })
];

// Room validations
const roomValidation = [
  body('name').trim().notEmpty().isLength({ max: 100 }),
  body('isPublic').optional().isBoolean(),
  body('maxListeners').optional().isInt({ min: 2, max: 100 })
];

// ID parameter validation
const idParamValidation = [
  param('id').isInt({ min: 1 }).withMessage('Invalid ID')
];

module.exports = {
  validate,
  registerValidation,
  loginValidation,
  songUploadValidation,
  playlistValidation,
  aiPlaylistValidation,
  roomValidation,
  idParamValidation
};
