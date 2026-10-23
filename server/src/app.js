const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const mongoose = require('mongoose');
const { v4: uuidv4 } = require('uuid');

const authRoutes = require('./routes/authRoutes');
const emergencyRoutes = require('./routes/emergencyRoutes');
const userRoutes = require('./routes/userRoutes');
const { errorHandler, notFound } = require('./middleware/errorMiddleware');

const app = express();

// Trust reverse proxy (Nginx, ALB, Cloudflare, Traefik, Docker)
// Required for accurate client IP resolution in rate limiting
app.set('trust proxy', process.env.TRUST_PROXY ? parseInt(process.env.TRUST_PROXY, 10) : 1);

// Disable X-Powered-By header
app.disable('x-powered-by');

// Request ID for distributed tracing & log correlation
app.use((req, res, next) => {
  req.id = req.headers['x-request-id'] || uuidv4();
  res.setHeader('X-Request-Id', req.id);
  next();
});

// Security headers with Helmet
app.use(
  helmet({
    contentSecurityPolicy: false, // REST API only
    crossOriginEmbedderPolicy: false,
    crossOriginResourcePolicy: { policy: 'cross-origin' },
  })
);

// CORS — explicit allowlist with safe fallback
const allowedOrigins = (process.env.CORS_ORIGINS || 'http://localhost:3000,http://localhost:8081')
  .split(',')
  .map((o) => o.trim())
  .filter(Boolean);

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (mobile native apps, curl, server-to-server)
      if (!origin) return callback(null, true);
      if (allowedOrigins.includes(origin) || process.env.NODE_ENV === 'development') {
        return callback(null, true);
      }
      // Return false for CORS rejection without throwing an unhandled 500 error
      return callback(null, false);
    },
    credentials: true,
    methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Request-Id'],
    maxAge: 86400, // 24 hours preflight cache
  })
);

// Body parsing with strict size limits
app.use(express.json({ limit: '100kb' }));
app.use(express.urlencoded({ extended: false, limit: '100kb' }));

// Global rate limit
const globalLimiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS, 10) || 15 * 60 * 1000,
  max: parseInt(process.env.RATE_LIMIT_MAX, 10) || 200,
  message: {
    success: false,
    message: 'Too many requests, please try again later',
    code: 'RATE_LIMIT',
  },
  standardHeaders: true,
  legacyHeaders: false,
  validate: { trustProxy: false },
});
app.use(globalLimiter);

// Comprehensive Health check for load balancers and container orchestrators
app.get('/health', (req, res) => {
  const dbConnected = mongoose.connection.readyState === 1;
  const status = dbConnected ? 'healthy' : 'degraded';
  const statusCode = dbConnected ? 200 : 503;

  res.status(statusCode).json({
    success: dbConnected,
    status,
    database: dbConnected ? 'connected' : 'disconnected',
    uptimeSeconds: Math.floor(process.uptime()),
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
  });
});

// Root API ping
app.get('/', (req, res) => {
  res.json({
    success: true,
    message: 'Emergency Response System API',
    version: '1.0.0',
    documentation: '/health',
  });
});

// API routes
app.use('/api/auth', authRoutes);
app.use('/api/emergencies', emergencyRoutes);
app.use('/api/users', userRoutes);

// 404 and error handlers
app.use(notFound);
app.use(errorHandler);

module.exports = app;
