const { verifyToken } = require('../utils/generateToken');
const User = require('../models/User');

const protect = async (req, res, next) => {
  let token;

  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith('Bearer ')
  ) {
    token = req.headers.authorization.split(' ')[1];
  }

  if (!token) {
    return res.status(401).json({
      success: false,
      message: 'Not authorized, no token provided',
      code: 'NO_TOKEN',
    });
  }

  try {
    const decoded = verifyToken(token);

    const user = await User.findById(decoded.id).select('-password');
    if (!user || !user.isActive) {
      return res.status(401).json({
        success: false,
        message: 'Not authorized, user not found or inactive',
        code: 'USER_INVALID',
      });
    }

    // Ensure role in token matches DB (prevents stale tokens after role change)
    if (user.role !== decoded.role) {
      return res.status(401).json({
        success: false,
        message: 'Not authorized, token role mismatch',
        code: 'ROLE_MISMATCH',
      });
    }

    req.user = user;
    next();
  } catch (error) {
    let message = 'Not authorized, token failed';
    let code = 'TOKEN_INVALID';

    if (error.name === 'TokenExpiredError') {
      message = 'Not authorized, token expired';
      code = 'TOKEN_EXPIRED';
    } else if (error.name === 'JsonWebTokenError') {
      message = 'Not authorized, invalid token';
      code = 'TOKEN_MALFORMED';
    }

    return res.status(401).json({
      success: false,
      message,
      code,
    });
  }
};

module.exports = { protect };
