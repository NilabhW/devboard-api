const ApiError = require('../utils/ApiError');

/**
 * Global Error Handler Middleware
 * ─────────────────────────────────────────────────────
 * Express calls this when any middleware/controller calls next(error)
 * or throws an error (caught by our catchAsync wrapper).
 *
 * It normalizes all errors into our standard response format:
 *   { success: false, message: "...", stack: "..." (dev only) }
 *
 * Why a centralized handler?
 *   - ONE place to format all error responses
 *   - ONE place to log all errors
 *   - Controllers stay clean — just `throw new ApiError(400, 'Bad input')`
 */

// eslint-disable-next-line no-unused-vars
const errorHandler = (err, req, res, next) => {
  let error = { ...err };
  error.message = err.message;
  error.stack = err.stack;

  // Log for debugging (in production, this would go to a log service)
  console.error('❌ Error:', err.message);

  // ── Mongoose: Bad ObjectId ───────────────────────────
  // e.g. GET /api/users/not-a-valid-id
  if (err.name === 'CastError') {
    error = new ApiError(400, `Invalid ${err.path}: ${err.value}`);
  }

  // ── Mongoose: Duplicate key (unique constraint) ──────
  // e.g. Registering with an email that already exists
  if (err.code === 11000) {
    const field = Object.keys(err.keyValue)[0];
    error = new ApiError(409, `Duplicate value for '${field}'. This ${field} is already taken.`);
  }

  // ── Mongoose: Validation error ───────────────────────
  // e.g. Missing required field, value too short, etc.
  if (err.name === 'ValidationError') {
    const messages = Object.values(err.errors).map((e) => e.message);
    error = new ApiError(400, messages.join('. '));
  }

  // ── JWT errors ───────────────────────────────────────
  if (err.name === 'JsonWebTokenError') {
    error = new ApiError(401, 'Invalid token');
  }
  if (err.name === 'TokenExpiredError') {
    error = new ApiError(401, 'Token expired');
  }

  const statusCode = error.statusCode || 500;

  res.status(statusCode).json({
    success: false,
    message: error.message || 'Internal Server Error',
    // Only show stack trace in development
    ...(process.env.NODE_ENV === 'development' && { stack: error.stack }),
  });
};

module.exports = errorHandler;
