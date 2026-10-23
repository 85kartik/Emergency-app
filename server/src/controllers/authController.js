const { validationResult } = require('express-validator');
const User = require('../models/User');
const { generateToken } = require('../utils/generateToken');

// @desc    Register a new citizen
// @route   POST /api/auth/register
// @access  Public
const register = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: errors.array().map((e) => e.msg).join('. '),
        code: 'VALIDATION_ERROR',
        errors: errors.array(),
      });
    }

    const { name, email, password, phone } = req.body;

    // Explicit allowlist — never accept role from client
    const existing = await User.findOne({ email: email.toLowerCase() });
    if (existing) {
      // Generic message to avoid user enumeration
      return res.status(409).json({
        success: false,
        message: 'Unable to register with provided credentials',
        code: 'REGISTRATION_FAILED',
      });
    }

    const user = await User.create({
      name: name.trim(),
      email: email.toLowerCase().trim(),
      password,
      phone: phone ? phone.trim() : undefined,
      role: 'citizen', // Forced
    });

    const token = generateToken(user._id, user.role);

    res.status(201).json({
      success: true,
      message: 'Registration successful',
      data: {
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          role: user.role,
          phone: user.phone || '',
          emergencyContactName: user.emergencyContactName || '',
          emergencyContactPhone: user.emergencyContactPhone || '',
        },
        token,
      },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Login user
// @route   POST /api/auth/login
// @access  Public
const login = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: errors.array().map((e) => e.msg).join('. '),
        code: 'VALIDATION_ERROR',
      });
    }

    const { email, password } = req.body;

    // Select password explicitly
    const user = await User.findOne({ email: email.toLowerCase() }).select('+password');

    // Generic error for both missing user and bad password
    if (!user || !(await user.comparePassword(password))) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password',
        code: 'INVALID_CREDENTIALS',
      });
    }

    if (!user.isActive) {
      return res.status(401).json({
        success: false,
        message: 'Account is inactive',
        code: 'ACCOUNT_INACTIVE',
      });
    }

    const token = generateToken(user._id, user.role);

    res.json({
      success: true,
      message: 'Login successful',
      data: {
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          role: user.role,
          phone: user.phone || '',
          emergencyContactName: user.emergencyContactName || '',
          emergencyContactPhone: user.emergencyContactPhone || '',
        },
        token,
      },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get current user
// @route   GET /api/auth/me
// @access  Private
const getMe = async (req, res, next) => {
  try {
    res.json({
      success: true,
      data: {
        user: {
          id: req.user._id,
          name: req.user.name,
          email: req.user.email,
          role: req.user.role,
          phone: req.user.phone || '',
          emergencyContactName: req.user.emergencyContactName || '',
          emergencyContactPhone: req.user.emergencyContactPhone || '',
          createdAt: req.user.createdAt,
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

module.exports = { register, login, getMe };
