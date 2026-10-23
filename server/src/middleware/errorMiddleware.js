const errorHandler = (err, req, res, next) => {
  let statusCode = res.statusCode === 200 ? 500 : res.statusCode;
  let message = err.message || 'Internal server error';
  let code = err.code || 'SERVER_ERROR';

  // Mongoose validation error
  if (err.name === 'ValidationError') {
    statusCode = 400;
    code = 'VALIDATION_ERROR';
    const errors = Object.values(err.errors).map((e) => e.message);
    message = errors.join('. ');
  }

  // Mongoose cast error (invalid ObjectId)
  if (err.name === 'CastError') {
    statusCode = 400;
    code = 'INVALID_ID';
    message = 'Invalid resource identifier';
  }

  // Duplicate key
  if (err.code === 11000) {
    statusCode = 409;
    code = 'DUPLICATE';
    const field = Object.keys(err.keyValue || {})[0] || 'field';
    message = `${field} already exists`;
  }

  // JWT errors already handled in auth middleware, but catch leftovers
  if (err.name === 'JsonWebTokenError' || err.name === 'TokenExpiredError') {
    statusCode = 401;
    code = 'TOKEN_ERROR';
  }

  // Do not leak stack or internal details in production
  const response = {
    success: false,
    message,
    code,
  };

  if (process.env.NODE_ENV === 'development') {
    response.stack = err.stack;
  }

  // Log full error server-side
  console.error(`[${req.id || 'no-id'}] ${statusCode} - ${message}`, {
    path: req.path,
    method: req.method,
    userId: req.user?.id,
  });

  res.status(statusCode).json(response);
};

const notFound = (req, res, next) => {
  const error = new Error(`Not found - ${req.originalUrl}`);
  res.status(404);
  error.code = 'NOT_FOUND';
  next(error);
};

module.exports = { errorHandler, notFound };
