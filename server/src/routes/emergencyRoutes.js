const express = require('express');
const { body, param } = require('express-validator');
const rateLimit = require('express-rate-limit');
const {
  createEmergency,
  getMyEmergencies,
  getEmergencyById,
  getAllEmergencies,
  updateStatus,
  assignResponder,
  cancelEmergency,
} = require('../controllers/emergencyController');
const { protect } = require('../middleware/authMiddleware');
const { authorize } = require('../middleware/roleMiddleware');
const Emergency = require('../models/Emergency');

const router = express.Router();

const sosLimiter = rateLimit({
  windowMs: 5 * 60 * 1000, // 5 minutes
  max: 10,
  message: {
    success: false,
    message: 'Too many emergency requests, please wait before submitting again',
    code: 'RATE_LIMIT',
  },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => (req.user ? req.user._id.toString() : req.ip),
});

const createValidation = [
  body('type')
    .isIn(Emergency.EMERGENCY_TYPES)
    .withMessage(`Type must be one of: ${Emergency.EMERGENCY_TYPES.join(', ')}`),
  body('description')
    .optional()
    .trim()
    .isLength({ max: 1000 })
    .withMessage('Description cannot exceed 1000 characters'),
  body('latitude')
    .optional({ nullable: true })
    .isFloat({ min: -90, max: 90 })
    .withMessage('Latitude must be between -90 and 90'),
  body('longitude')
    .optional({ nullable: true })
    .isFloat({ min: -180, max: 180 })
    .withMessage('Longitude must be between -180 and 180'),
  body('manualLocation')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Manual location cannot exceed 500 characters'),
  body('clientRequestId')
    .optional()
    .trim()
    .isLength({ max: 64 })
    .withMessage('clientRequestId too long'),
];

const statusValidation = [
  body('status')
    .isIn(Emergency.EMERGENCY_STATUSES)
    .withMessage(`Status must be one of: ${Emergency.EMERGENCY_STATUSES.join(', ')}`),
  body('note').optional().trim().isLength({ max: 500 }),
];

const assignValidation = [
  body('responderId').isMongoId().withMessage('Valid responder ID required'),
];

router.use(protect);

router.post('/', authorize('citizen'), sosLimiter, createValidation, createEmergency);
router.get('/my', authorize('citizen'), getMyEmergencies);
router.get('/', authorize('admin', 'responder'), getAllEmergencies);
router.get('/:id', getEmergencyById);
router.patch(
  '/:id/status',
  authorize('admin', 'responder'),
  statusValidation,
  updateStatus
);
router.patch(
  '/:id/assign',
  authorize('admin'),
  assignValidation,
  assignResponder
);
router.patch('/:id/cancel', cancelEmergency);

module.exports = router;
