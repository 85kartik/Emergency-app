const { validationResult } = require('express-validator');
const User = require('../models/User');

// @desc    Get current user profile
// @route   GET /api/users/me
// @access  Private
const getProfile = async (req, res, next) => {
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

// @desc    Update profile (name, phone, emergency contact)
// @route   PATCH /api/users/me
// @access  Private
const updateProfile = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: errors.array().map((e) => e.msg).join('. '),
        code: 'VALIDATION_ERROR',
      });
    }

    // Explicit allowlist — never accept role, email, password here
    const allowed = {};
    if (req.body.name !== undefined) {
      allowed.name = String(req.body.name).trim().slice(0, 100);
    }
    if (req.body.phone !== undefined) {
      const p = String(req.body.phone).trim();
      allowed.phone = p ? p.slice(0, 20) : '';
    }
    if (req.body.emergencyContactName !== undefined) {
      const ecn = String(req.body.emergencyContactName).trim();
      allowed.emergencyContactName = ecn ? ecn.slice(0, 100) : '';
    }
    if (req.body.emergencyContactPhone !== undefined) {
      const ecp = String(req.body.emergencyContactPhone).trim();
      allowed.emergencyContactPhone = ecp ? ecp.slice(0, 20) : '';
    }

    if (Object.keys(allowed).length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No valid fields to update',
        code: 'VALIDATION_ERROR',
      });
    }

    const user = await User.findByIdAndUpdate(req.user._id, allowed, {
      new: true,
      runValidators: true,
    });

    res.json({
      success: true,
      message: 'Profile updated',
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
      },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Change password
// @route   PATCH /api/users/me/password
// @access  Private
const changePassword = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: errors.array().map((e) => e.msg).join('. '),
        code: 'VALIDATION_ERROR',
      });
    }

    const { currentPassword, newPassword } = req.body;

    const user = await User.findById(req.user._id).select('+password');
    if (!user || !(await user.comparePassword(currentPassword))) {
      return res.status(401).json({
        success: false,
        message: 'Current password is incorrect',
        code: 'INVALID_PASSWORD',
      });
    }

    user.password = newPassword;
    await user.save();

    res.json({
      success: true,
      message: 'Password changed successfully',
    });
  } catch (error) {
    next(error);
  }
};

// @desc    List users (admin)
// @route   GET /api/users
// @access  Private (admin)
const listUsers = async (req, res, next) => {
  try {
    const page = Math.min(Math.max(parseInt(req.query.page, 10) || 1, 1), 100);
    const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 20, 1), 50);
    const skip = (page - 1) * limit;

    const filter = {};
    if (req.query.role && ['citizen', 'responder', 'admin'].includes(req.query.role)) {
      filter.role = req.query.role;
    }

    const [users, total] = await Promise.all([
      User.find(filter)
        .select('-password')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      User.countDocuments(filter),
    ]);

    res.json({
      success: true,
      data: {
        users: users.map((u) => ({
          id: u._id,
          name: u.name,
          email: u.email,
          role: u.role,
          phone: u.phone,
          isActive: u.isActive,
          createdAt: u.createdAt,
        })),
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit),
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getProfile,
  updateProfile,
  changePassword,
  listUsers,
};
