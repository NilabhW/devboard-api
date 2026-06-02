/**
 * Custom API Error Class
 * ─────────────────────────────────────────────────────
 * Extends the built-in Error so we can attach HTTP status codes.
 *
 * Usage in controllers:
 *   throw new ApiError(404, 'User not found');
 *
 * The global error handler middleware catches these and sends
 * a properly formatted JSON response.
 */
class ApiError extends Error {
  constructor(statusCode, message) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = true; // Distinguishes expected errors from bugs

    // Captures the stack trace, excluding the constructor call
    Error.captureStackTrace(this, this.constructor);
  }
}

module.exports = ApiError;
