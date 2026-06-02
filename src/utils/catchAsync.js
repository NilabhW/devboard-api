/**
 * Async Handler (catch wrapper)
 * ─────────────────────────────────────────────────────
 * Without this, every async controller would need its own
 * try/catch block. This wrapper catches any rejected promise
 * and forwards it to Express's error-handling middleware.
 *
 * Usage:
 *   router.get('/me', catchAsync(authController.getMe));
 *
 * Instead of:
 *   router.get('/me', async (req, res, next) => {
 *     try { ... } catch (err) { next(err); }
 *   });
 */
const catchAsync = (fn) => {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

module.exports = catchAsync;
