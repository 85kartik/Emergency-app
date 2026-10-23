const { verifyToken } = require('../utils/generateToken');
const User = require('../models/User');

const setupSocket = (io) => {
  // Authenticate every connection
  io.use(async (socket, next) => {
    try {
      const token =
        socket.handshake.auth?.token ||
        socket.handshake.headers?.authorization?.replace('Bearer ', '');

      if (!token) {
        return next(new Error('Authentication required'));
      }

      const decoded = verifyToken(token);
      const user = await User.findById(decoded.id).select('-password');

      if (!user || !user.isActive) {
        return next(new Error('User not found or inactive'));
      }

      if (user.role !== decoded.role) {
        return next(new Error('Role mismatch'));
      }

      socket.user = user;
      next();
    } catch (err) {
      next(new Error('Invalid or expired token'));
    }
  });

  io.on('connection', (socket) => {
    const user = socket.user;
    console.log(`Socket connected: ${user.email} (${user.role})`);

    // Join personal room
    socket.join(`user:${user._id.toString()}`);

    // Dashboard room for admin & responder
    if (user.role === 'admin' || user.role === 'responder') {
      socket.join('dashboard');
    }

    // Optional: client can request to join a specific emergency room (with auth check)
    socket.on('subscribe:emergency', async (emergencyId) => {
      try {
        if (!emergencyId || typeof emergencyId !== 'string') return;
        const Emergency = require('../models/Emergency');
        const mongoose = require('mongoose');
        if (!mongoose.Types.ObjectId.isValid(emergencyId)) return;

        const emergency = await Emergency.findById(emergencyId);
        if (!emergency) return;

        const uid = user._id.toString();
        const isOwner = emergency.citizen.toString() === uid;
        const isAssigned =
          emergency.assignedResponder &&
          emergency.assignedResponder.toString() === uid;
        const isStaff = user.role === 'admin' || user.role === 'responder';

        if (isOwner || isAssigned || (isStaff && user.role === 'admin')) {
          socket.join(`emergency:${emergencyId}`);
        }
      } catch (e) {
        // Silently ignore
      }
    });

    socket.on('unsubscribe:emergency', (emergencyId) => {
      if (emergencyId) {
        socket.leave(`emergency:${emergencyId}`);
      }
    });

    socket.on('disconnect', () => {
      console.log(`Socket disconnected: ${user.email}`);
    });
  });
};

module.exports = setupSocket;
