const express = require('express');
const { body } = require('express-validator');
const rateLimit = require('express-rate-limit');
const {
  getProfile,
  updateProfile,
  changePassword,
  listUsers,
} = require('../controllers/userController');
const { protect } = require('../middleware/authMiddleware');
const { authorize } = require('../middleware/roleMiddleware');

const router = express.Router();

const passwordLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: {
    success: false,
    message: 'Too many password change attempts',
    code: 'RATE_LIMIT',
  },
  standardHeaders: true,
  legacyHeaders: false,
});

const profileValidation = [
  body('name')
    .optional()
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('Name must be between 2 and 100 characters'),
  body('phone')
    .optional({ checkFalsy: true })
    .trim()
    .isLength({ max: 20 })
    .matches(/^[+]?[\d\s\-()]{7,20}$/)
    .withMessage('Invalid phone number'),
  body('emergencyContactName')
    .optional({ checkFalsy: true })
    .trim()
    .isLength({ max: 100 })
    .withMessage('Emergency contact name cannot exceed 100 characters'),
  body('emergencyContactPhone')
    .optional({ checkFalsy: true })
    .trim()
    .isLength({ max: 20 })
    .matches(/^[+]?[\d\s\-()]{7,20}$/)
    .withMessage('Invalid emergency contact phone number'),
];

const passwordValidation = [
  body('currentPassword').notEmpty().withMessage('Current password is required'),
  body('newPassword')
    .isLength({ min: 8, max: 128 })
    .withMessage('New password must be between 8 and 128 characters')
    .matches(/[A-Za-z]/)
    .withMessage('Password must contain at least one letter')
    .matches(/[0-9]/)
    .withMessage('Password must contain at least one number'),
];

router.use(protect);

router.get('/me', getProfile);
router.patch('/me', profileValidation, updateProfile);
router.patch('/me/password', passwordLimiter, passwordValidation, changePassword);
router.get('/', authorize('admin'), listUsers);

module.exports = router;
