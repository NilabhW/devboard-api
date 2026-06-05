const express = require('express');
const router = express.Router({ mergeParams: true });
const { protect } = require('../middleware/auth.middleware');
const authorize = require('../middleware/authorize');
const taskController = require('../controllers/task.controller');

/**
 * Task Routes — nested under /api/projects/:projectId/tasks
 * ─────────────────────────────────────────────────────
 * Uses { mergeParams: true } so we can access :projectId
 * from the parent router.
 *
 * All routes use:
 *   1. protect — verifies JWT, attaches req.user
 *   2. authorize — verifies project membership + role, attaches req.project
 *
 * The authorize middleware runs on EVERY task route because
 * tasks always belong to a project. The allowed roles vary:
 *   - viewer: can only read (GET)
 *   - member: can read + create + update + assign
 *   - admin:  can do everything including delete
 */

// Apply auth to all task routes
router.use(protect);

// ─── CRUD ──────────────────────────────────────────────
router.post('/', authorize('admin', 'member'), taskController.createTask);
router.get('/', authorize('admin', 'member', 'viewer'), taskController.getTasks);
router.get('/:taskId', authorize('admin', 'member', 'viewer'), taskController.getTask);
router.patch('/:taskId', authorize('admin', 'member'), taskController.updateTask);
router.delete('/:taskId', authorize('admin'), taskController.deleteTask);

// ─── Assignment ────────────────────────────────────────
router.patch('/:taskId/assign', authorize('admin', 'member'), taskController.assignTask);

module.exports = router;
