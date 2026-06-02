const express = require('express');
const router = express.Router();
const authController = require('../controllers/auth.controller');
const { protect } = require('../middleware/auth.middleware');

/**
 * Auth Routes
 * ─────────────────────────────────────────────────────
 * POST /api/auth/register  → Create account        (public)
 * POST /api/auth/login     → Get tokens             (public)
 * POST /api/auth/refresh   → Refresh access token   (public — needs refresh token in body)
 * POST /api/auth/logout    → Invalidate tokens      (protected)
 * GET  /api/auth/me        → Get current user       (protected)
 */

// Public routes — no auth required
router.post('/register', authController.register);
router.post('/login', authController.login);
router.post('/refresh', authController.refresh);

// Protected routes — require valid access token
router.post('/logout', protect, authController.logout);
router.get('/me', protect, authController.getMe);

module.exports = router;
