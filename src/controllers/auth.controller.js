const jwt = require('jsonwebtoken');
const User = require('../models/User');
const ApiError = require('../utils/ApiError');
const catchAsync = require('../utils/catchAsync');
const sendResponse = require('../utils/sendResponse');
const { getRedis } = require('../config/redis');

// ─── Helper: Generate Tokens ──────────────────────────
/**
 * Creates a signed JWT.
 * @param {string} id        - User's MongoDB _id
 * @param {string} secret    - JWT_SECRET or JWT_REFRESH_SECRET
 * @param {string} expiresIn - e.g. '15m', '7d'
 */
const generateToken = (id, secret, expiresIn) => {
  return jwt.sign({ id }, secret, { expiresIn });
};

/**
 * Generates BOTH tokens and saves the refresh token to the user document.
 * Returns { accessToken, refreshToken } for the response.
 */
const generateTokenPair = async (user) => {
  const accessToken = generateToken(
    user._id,
    process.env.JWT_SECRET,
    process.env.JWT_ACCESS_EXPIRY || '15m'
  );

  const refreshToken = generateToken(
    user._id,
    process.env.JWT_REFRESH_SECRET,
    process.env.JWT_REFRESH_EXPIRY || '7d'
  );

  // Save refresh token to DB (for validation on /refresh and invalidation on /logout)
  user.refreshToken = refreshToken;
  await user.save({ validateBeforeSave: false });

  return { accessToken, refreshToken };
};

// ═══════════════════════════════════════════════════════
// CONTROLLERS
// ═══════════════════════════════════════════════════════

/**
 * POST /api/auth/register
 * ─────────────────────────────────────────────────────
 * Creates a new user account and returns tokens.
 *
 * Body: { name, email, password }
 *
 * Flow:
 *   1. Check if email already exists
 *   2. Create user (password is hashed by pre-save hook)
 *   3. Generate token pair
 *   4. Return user + tokens
 */
const register = catchAsync(async (req, res) => {
  const { name, email, password } = req.body;

  // Check for existing user (friendly error instead of MongoDB duplicate key error)
  const existingUser = await User.findOne({ email });
  if (existingUser) {
    throw new ApiError(409, 'Email already registered');
  }

  // Create user — password hashing happens in the pre-save hook
  const user = await User.create({ name, email, password });

  // Generate tokens
  const { accessToken, refreshToken } = await generateTokenPair(user);

  sendResponse(res, 201, 'User registered successfully', {
    user,
    accessToken,
    refreshToken,
  });
});

/**
 * POST /api/auth/login
 * ─────────────────────────────────────────────────────
 * Authenticates user with email + password, returns tokens.
 *
 * Body: { email, password }
 *
 * Flow:
 *   1. Find user by email (explicitly select password field)
 *   2. Compare passwords with bcrypt
 *   3. Generate new token pair (rotation — old refresh token is overwritten)
 *   4. Return user + tokens
 *
 * Security note:
 *   We return the same error for "wrong email" and "wrong password"
 *   to prevent email enumeration attacks.
 */
const login = catchAsync(async (req, res) => {
  const { email, password } = req.body;

  // Validate input
  if (!email || !password) {
    throw new ApiError(400, 'Please provide email and password');
  }

  // Find user and explicitly include password (it has select: false in schema)
  const user = await User.findOne({ email }).select('+password');

  if (!user) {
    throw new ApiError(401, 'Invalid email or password');
  }

  // Compare passwords
  const isMatch = await user.comparePassword(password);
  if (!isMatch) {
    throw new ApiError(401, 'Invalid email or password');
  }

  // Generate tokens (this also saves the refresh token to DB)
  const { accessToken, refreshToken } = await generateTokenPair(user);

  sendResponse(res, 200, 'Login successful', {
    user,
    accessToken,
    refreshToken,
  });
});

/**
 * POST /api/auth/refresh
 * ─────────────────────────────────────────────────────
 * Uses a valid refresh token to get a NEW access token.
 *
 * Body: { refreshToken }
 *
 * Flow:
 *   1. Verify the refresh token JWT signature
 *   2. Check if it's blacklisted in Redis
 *   3. Find the user and confirm the token matches what's in DB
 *   4. Generate a brand new token pair (rotation!)
 *   5. Blacklist the OLD refresh token in Redis
 *   6. Return new tokens
 *
 * Why token rotation?
 *   If an attacker steals a refresh token and uses it,
 *   the real user's next refresh will fail (token mismatch).
 *   They'll have to re-login, which alerts them something is wrong.
 */
const refresh = catchAsync(async (req, res) => {
  const { refreshToken } = req.body;

  if (!refreshToken) {
    throw new ApiError(400, 'Refresh token is required');
  }

  // Verify JWT
  let decoded;
  try {
    decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);
  } catch (err) {
    throw new ApiError(401, 'Invalid or expired refresh token');
  }

  // Check Redis blacklist
  const redis = getRedis();
  if (redis) {
    const isBlacklisted = await redis.get(`bl_${refreshToken}`);
    if (isBlacklisted) {
      throw new ApiError(401, 'Refresh token has been revoked');
    }
  }

  // Find user and verify the token matches what's stored
  const user = await User.findById(decoded.id).select('+refreshToken');
  if (!user || user.refreshToken !== refreshToken) {
    throw new ApiError(401, 'Invalid refresh token — please login again');
  }

  // Blacklist the old refresh token
  if (redis) {
    // TTL = remaining time until the old token would have expired
    const ttl = decoded.exp - Math.floor(Date.now() / 1000);
    if (ttl > 0) {
      await redis.set(`bl_${refreshToken}`, 'revoked', 'EX', ttl);
    }
  }

  // Generate new pair (rotation)
  const tokens = await generateTokenPair(user);

  sendResponse(res, 200, 'Tokens refreshed successfully', {
    accessToken: tokens.accessToken,
    refreshToken: tokens.refreshToken,
  });
});

/**
 * POST /api/auth/logout
 * ─────────────────────────────────────────────────────
 * Invalidates the user's tokens.
 *
 * Headers: Authorization: Bearer <accessToken>
 * Body:    { refreshToken } (optional but recommended)
 *
 * Flow:
 *   1. Blacklist the current access token in Redis
 *   2. If refresh token provided, blacklist it too
 *   3. Clear the refresh token from the user's DB record
 *
 * Note: This is a protected route (requires valid access token).
 */
const logout = catchAsync(async (req, res) => {
  const redis = getRedis();

  // Blacklist the access token
  const accessToken = req.headers.authorization?.split(' ')[1];
  if (redis && accessToken) {
    try {
      const decoded = jwt.decode(accessToken);
      const ttl = decoded.exp - Math.floor(Date.now() / 1000);
      if (ttl > 0) {
        await redis.set(`bl_${accessToken}`, 'revoked', 'EX', ttl);
      }
    } catch {
      // Token might be malformed, that's fine — we're logging out anyway
    }
  }

  // Blacklist the refresh token if provided
  const { refreshToken } = req.body;
  if (redis && refreshToken) {
    try {
      const decoded = jwt.decode(refreshToken);
      if (decoded?.exp) {
        const ttl = decoded.exp - Math.floor(Date.now() / 1000);
        if (ttl > 0) {
          await redis.set(`bl_${refreshToken}`, 'revoked', 'EX', ttl);
        }
      }
    } catch {
      // Same — we don't care if this fails
    }
  }

  // Clear refresh token from DB
  await User.findByIdAndUpdate(req.user._id, { refreshToken: null });

  sendResponse(res, 200, 'Logged out successfully');
});

/**
 * GET /api/auth/me
 * ─────────────────────────────────────────────────────
 * Returns the currently authenticated user's profile.
 *
 * This is a protected route — req.user is set by the auth middleware.
 * Simple but important for:
 *   - Frontend to get user data on page load
 *   - Verifying the token is still valid
 */
const getMe = catchAsync(async (req, res) => {
  // req.user is already populated by the protect middleware
  sendResponse(res, 200, 'User profile retrieved', { user: req.user });
});

module.exports = {
  register,
  login,
  refresh,
  logout,
  getMe,
};
