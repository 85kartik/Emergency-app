require('dotenv').config();

const http = require('http');
const mongoose = require('mongoose');
const { Server } = require('socket.io');
const app = require('./app');
const connectDB = require('./config/database');
const setupSocket = require('./config/socket');

const PORT = parseInt(process.env.PORT, 10) || 5000;
const NODE_ENV = process.env.NODE_ENV || 'development';

// Validate critical security environment variables
if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32) {
  console.error('FATAL ERROR: JWT_SECRET must be set and at least 32 characters long in production');
  process.exit(1);
}

if (!process.env.MONGODB_URI) {
  console.error('FATAL ERROR: MONGODB_URI environment variable is required');
  process.exit(1);
}

let server;
let io;

const start = async () => {
  // Connect to database before starting HTTP listener
  await connectDB();

  server = http.createServer(app);

  const allowedOrigins = (process.env.CORS_ORIGINS || 'http://localhost:3000,http://localhost:8081')
    .split(',')
    .map((o) => o.trim())
    .filter(Boolean);

  io = new Server(server, {
    cors: {
      origin: (origin, callback) => {
        if (!origin) return callback(null, true);
        if (allowedOrigins.includes(origin) || NODE_ENV === 'development') {
          return callback(null, true);
        }
        return callback(null, false);
      },
      methods: ['GET', 'POST'],
      credentials: true,
    },
    maxHttpBufferSize: 1e5, // 100kb payload limit
    pingTimeout: 20000,
    pingInterval: 25000,
  });

  app.set('io', io);
  setupSocket(io);

  server.listen(PORT, () => {
    console.log(`[Production Server] Running in ${NODE_ENV} mode on port ${PORT}`);
    console.log(`[Health Endpoint] Available at http://localhost:${PORT}/health`);
  });
};

// Graceful shutdown logic
const gracefulShutdown = async (signal) => {
  console.log(`\n[Process] Received ${signal}. Starting graceful shutdown...`);

  const forceExitTimer = setTimeout(() => {
    console.error('[Process] Forcefully shutting down after timeout.');
    process.exit(1);
  }, 10000);
  forceExitTimer.unref();

  try {
    if (io) {
      console.log('[Socket.IO] Closing active socket connections...');
      await new Promise((resolve) => io.close(resolve));
    }

    if (server) {
      console.log('[HTTP] Closing server and waiting for ongoing requests...');
      await new Promise((resolve) => server.close(resolve));
    }

    if (mongoose.connection.readyState !== 0) {
      console.log('[MongoDB] Closing database connection...');
      await mongoose.connection.close(false);
      console.log('[MongoDB] Connection closed.');
    }

    console.log('[Process] Graceful shutdown completed cleanly.');
    process.exit(0);
  } catch (err) {
    console.error('[Process] Error during graceful shutdown:', err);
    process.exit(1);
  }
};

// Process event listeners
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

process.on('unhandledRejection', (reason, promise) => {
  console.error('[Process Alert] Unhandled Promise Rejection:', reason);
});

process.on('uncaughtException', (err) => {
  console.error('[Process FATAL] Uncaught Exception:', err);
  gracefulShutdown('uncaughtException');
});

start().catch((err) => {
  console.error('[Server Startup Failed]:', err);
  process.exit(1);
});
