const express = require('express');
const router = express.Router({ mergeParams: true });
const { protect } = require('../middleware/auth.middleware');
const authorize = require('../middleware/authorize');
const upload = require('../middleware/upload');
const uploadController = require('../controllers/upload.controller');

/**
 * Upload Routes — nested under /api/projects/:projectId/tasks/:taskId/attachments
 * ─────────────────────────────────────────────────────
 * Uses { mergeParams: true } so we can access :projectId and :taskId
 * from parent routers.
 *
 * All routes use:
 *   1. protect — verifies JWT, attaches req.user
 *   2. authorize — verifies project membership + role, attaches req.project
 *
 * Attachment management requires 'admin' or 'member' project role.
 * Viewers can see attachments (they're part of the task response)
 * but cannot add or remove them.
 */

// Apply auth to all upload routes
router.use(protect);

// ─── Upload Attachments ────────────────────────────────
// upload middleware runs BEFORE the controller — it processes
// the multipart form data and uploads files to Cloudinary
router.post('/', authorize('admin', 'member'), upload, uploadController.uploadAttachments);

// ─── Delete Attachment ─────────────────────────────────
router.delete('/:attachmentId', authorize('admin', 'member'), uploadController.deleteAttachment);

module.exports = router;
