const Project = require('../models/Project');
const ApiError = require('../utils/ApiError');

/**
 * Project-Level RBAC Middleware — authorize(...roles)
 * ─────────────────────────────────────────────────────
 * This is DIFFERENT from the global authorize in auth.middleware.js.
 *
 * The global one checks the user's SYSTEM role (User.role).
 * This one checks the user's PROJECT role (Project.members[].role).
 *
 * A user can be a "member" globally but an "admin" on a specific project.
 * That's the whole point of per-project RBAC.
 *
 * Flow:
 *   1. Read projectId from req.params (supports both :id and :projectId)
 *   2. Find the project in MongoDB
 *   3. Find the user in the project's members array
 *   4. Check if their project role is in the allowed roles
 *   5. Attach req.project for downstream controllers
 *
 * Usage:
 *   router.post('/:projectId/tasks', protect, authorize('admin', 'member'), createTask);
 *   router.delete('/:projectId/tasks/:taskId', protect, authorize('admin'), deleteTask);
 *
 * Must be used AFTER the `protect` middleware (which sets req.user).
 */
const authorize = (...roles) => {
  return async (req, res, next) => {
    try {
      const projectId = req.params.projectId || req.params.id;

      if (!projectId) {
        throw new ApiError(400, 'Project ID is required');
      }

      // Find the project
      const project = await Project.findById(projectId);

      if (!project) {
        throw new ApiError(404, 'Project not found');
      }

      // Check if the user is a member of this project
      const member = project.getMember(req.user._id);

      if (!member) {
        throw new ApiError(403, 'You are not a member of this project');
      }

      // Check if the user's project role is in the allowed roles
      if (!roles.includes(member.role)) {
        throw new ApiError(
          403,
          `Project role '${member.role}' is not authorized for this action. Required: ${roles.join(', ')}`
        );
      }

      // Attach project and member info to the request
      req.project = project;
      req.memberRole = member.role;

      next();
    } catch (error) {
      next(error);
    }
  };
};

module.exports = authorize;
