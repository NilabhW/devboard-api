/**
 * Standardized API Response Helper
 * ─────────────────────────────────────────────────────
 * Every response from our API follows the same shape:
 *   {
 *     success: true/false,
 *     message: "...",
 *     data: { ... }
 *   }
 *
 * Why? Consistency. The frontend always knows where to find
 * the data, the error message, and whether it succeeded.
 */
const sendResponse = (res, statusCode, message, data = null) => {
  const response = {
    success: statusCode >= 200 && statusCode < 300,
    message,
  };

  if (data !== null) {
    response.data = data;
  }

  return res.status(statusCode).json(response);
};

module.exports = sendResponse;
