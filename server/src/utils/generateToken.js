const jwt = require('jsonwebtoken');

const generateToken = (userId, role) => {
  const secret = process.env.JWT_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error('JWT_SECRET must be set and at least 32 characters');
  }

  return jwt.sign(
    { id: userId, role },
    secret,
    {
      expiresIn: process.env.JWT_EXPIRES_IN || '7d',
      algorithm: 'HS256',
      issuer: 'emergency-response-app',
      audience: 'emergency-clients',
    }
  );
};

const verifyToken = (token) => {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error('JWT_SECRET is not configured');
  }

  return jwt.verify(token, secret, {
    algorithms: ['HS256'],
    issuer: 'emergency-response-app',
    audience: 'emergency-clients',
  });
};

module.exports = { generateToken, verifyToken };
