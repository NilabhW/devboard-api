const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth.middleware');
const projectController = require('../controllers/project.controller');

/**
 * Project Routes
 * ─────────────────────────────────────────────────────
 * All routes are protected (require valid JWT).
 *
 * Authorization logic lives in the controllers themselves
 * (checking project membership and roles) rather than in
 * a separate middleware here, because:
 *   1. createProject and getProjects don't have a projectId param
 *   2. getProject needs member check but allows all roles
 *   3. updateProject needs admin check
 *   4. deleteProject needs owner check (even stricter than admin)
 *
 * This keeps the route definitions clean while the controllers
 * handle the nuanced permission checks.
 */

// Apply auth to all project routes
router.use(protect);

// ─── CRUD ──────────────────────────────────────────────
router.post('/', projectController.createProject);
router.get('/', projectController.getProjects);
router.get('/:id', projectController.getProject);
router.patch('/:id', projectController.updateProject);
router.delete('/:id', projectController.deleteProject);

// ─── Member Management ────────────────────────────────
router.post('/:id/members', projectController.addMember);
router.delete('/:id/members/:userId', projectController.removeMember);

module.exports = router;
