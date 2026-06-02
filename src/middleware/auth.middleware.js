const jwt = require('jsonwebtoken');
const ApiError = require('../utils/ApiError');
const User = require('../models/User');
const { getRedis } = require('../config/redis');

/**
 * Auth Middleware — Protect Routes
 * ─────────────────────────────────────────────────────
 * This runs BEFORE any protected controller.
 *
 * Flow:
 *   1. Extract the access token from the Authorization header
 *   2. Verify it's a valid JWT (not expired, not tampered with)
 *   3. Check if the token is blacklisted in Redis
 *   4. Find the user in MongoDB
 *   5. Attach user to req.user → controller can now use it
 *
 * If any step fails → 401 Unauthorized
 */
const protect = async (req, res, next) => {
  try {
    // ── Step 1: Get token from header ──────────────────
    // Format: "Bearer eyJhbGciOiJIUzI1NiIs..."
    let token;
    const authHeader = req.headers.authorization;

    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.split(' ')[1];
    }

    if (!token) {
      throw new ApiError(401, 'Not authorized — no token provided');
    }

    // ── Step 2: Verify JWT ─────────────────────────────
    // jwt.verify throws if token is expired or signature is invalid
    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET);
    } catch (err) {
      if (err.name === 'TokenExpiredError') {
        throw new ApiError(401, 'Token expired — please refresh');
      }
      throw new ApiError(401, 'Invalid token');
    }

    // ── Step 3: Check Redis blacklist ──────────────────
    // When a user logs out, we blacklist their access token
    const redis = getRedis();
    if (redis) {
      const isBlacklisted = await redis.get(`bl_${token}`);
      if (isBlacklisted) {
        throw new ApiError(401, 'Token has been revoked');
      }
    }

    // ── Step 4: Find user ──────────────────────────────
    const user = await User.findById(decoded.id);
    if (!user) {
      throw new ApiError(401, 'User belonging to this token no longer exists');
    }

    // ── Step 5: Attach user to request ─────────────────
    req.user = user;
    next();
  } catch (error) {
    next(error);
  }
};

/**
 * Role-Based Access Control (RBAC) Middleware
 * ─────────────────────────────────────────────────────
 * Usage:
 *   router.delete('/users/:id', protect, authorize('admin'), deleteUser);
 *
 * This checks if req.user.role is in the allowed roles array.
 * Must be used AFTER the `protect` middleware (which sets req.user).
 */
const authorize = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return next(
        new ApiError(403, `Role '${req.user.role}' is not authorized to access this route`)
      );
    }
    next();
  };
};

module.exports = { protect, authorize };
