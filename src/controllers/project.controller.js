const Project = require('../models/Project');
const User = require('../models/User');
const Task = require('../models/Task');
const ApiError = require('../utils/ApiError');
const catchAsync = require('../utils/catchAsync');
const sendResponse = require('../utils/sendResponse');
const { sendEmail } = require('../config/mailer');
const { memberAddedTemplate } = require('../utils/emailTemplates');

/**
 * Populate options reused across queries.
 * Only return name + email from user refs — never leak passwords.
 */
const MEMBER_POPULATE = {
  path: 'members.user',
  select: 'name email',
};
const OWNER_POPULATE = {
  path: 'owner',
  select: 'name email',
};

// ═══════════════════════════════════════════════════════
// CREATE PROJECT
// ═══════════════════════════════════════════════════════
/**
 * POST /api/projects
 *
 * Body: { name, description }
 *
 * The creator automatically becomes:
 *   1. The project owner
 *   2. A member with role "admin"
 *
 * This mirrors how GitHub works — when you create a repo,
 * you're automatically the owner and admin.
 */
const createProject = catchAsync(async (req, res) => {
  const { name, description } = req.body;

  const project = await Project.create({
    name,
    description,
    owner: req.user._id,
    members: [{ user: req.user._id, role: 'admin' }],
  });

  // Populate the refs before returning
  await project.populate([OWNER_POPULATE, MEMBER_POPULATE]);

  sendResponse(res, 201, 'Project created successfully', { project });
});

// ═══════════════════════════════════════════════════════
// GET ALL PROJECTS (for current user)
// ═══════════════════════════════════════════════════════
/**
 * GET /api/projects
 *
 * Returns all projects where req.user is a member.
 * Uses the compound index on members.user for fast lookups.
 */
const getProjects = catchAsync(async (req, res) => {
  const projects = await Project.find({
    'members.user': req.user._id,
  })
    .populate([OWNER_POPULATE, MEMBER_POPULATE])
    .sort({ updatedAt: -1 }); // Most recently updated first

  sendResponse(res, 200, 'Projects retrieved successfully', {
    count: projects.length,
    projects,
  });
});

// ═══════════════════════════════════════════════════════
// GET SINGLE PROJECT
// ═══════════════════════════════════════════════════════
/**
 * GET /api/projects/:id
 *
 * Returns a single project with members populated.
 * Only accessible to members of the project.
 */
const getProject = catchAsync(async (req, res) => {
  const project = await Project.findById(req.params.id)
    .populate([OWNER_POPULATE, MEMBER_POPULATE]);

  if (!project) {
    throw new ApiError(404, 'Project not found');
  }

  // Check membership — only members can view project details
  const member = project.getMember(req.user._id);
  if (!member) {
    throw new ApiError(403, 'You are not a member of this project');
  }

  sendResponse(res, 200, 'Project retrieved successfully', { project });
});

// ═══════════════════════════════════════════════════════
// UPDATE PROJECT
// ═══════════════════════════════════════════════════════
/**
 * PATCH /api/projects/:id
 *
 * Body: { name?, description? }
 *
 * Only project admins can update the project name/description.
 * Uses the authorize middleware to check project-level role.
 */
const updateProject = catchAsync(async (req, res) => {
  const { name, description } = req.body;

  const project = await Project.findById(req.params.id);

  if (!project) {
    throw new ApiError(404, 'Project not found');
  }

  // Check admin role
  if (!project.isMemberWithRole(req.user._id, ['admin'])) {
    throw new ApiError(403, 'Only project admins can update the project');
  }

  // Only update the fields that were provided
  if (name !== undefined) project.name = name;
  if (description !== undefined) project.description = description;

  await project.save();
  await project.populate([OWNER_POPULATE, MEMBER_POPULATE]);

  sendResponse(res, 200, 'Project updated successfully', { project });
});

// ═══════════════════════════════════════════════════════
// DELETE PROJECT
// ═══════════════════════════════════════════════════════
/**
 * DELETE /api/projects/:id
 *
 * Only the project OWNER can delete it (not just any admin).
 * This is a destructive action — also deletes all tasks.
 */
const deleteProject = catchAsync(async (req, res) => {
  const project = await Project.findById(req.params.id);

  if (!project) {
    throw new ApiError(404, 'Project not found');
  }

  // Only the owner can delete — stricter than "admin"
  if (project.owner.toString() !== req.user._id.toString()) {
    throw new ApiError(403, 'Only the project owner can delete this project');
  }

  // Delete all tasks belonging to this project
  await Task.deleteMany({ project: project._id });

  // Delete the project itself
  await Project.findByIdAndDelete(project._id);

  sendResponse(res, 200, 'Project and all its tasks deleted successfully');
});

// ═══════════════════════════════════════════════════════
// ADD MEMBER TO PROJECT
// ═══════════════════════════════════════════════════════
/**
 * POST /api/projects/:id/members
 *
 * Body: { userId, role }
 *
 * Only project admins can add members.
 *
 * Validations:
 *   - Target user must exist
 *   - Target user must not already be a member
 *   - Role must be valid
 */
const addMember = catchAsync(async (req, res) => {
  const { userId, role } = req.body;

  if (!userId || !role) {
    throw new ApiError(400, 'userId and role are required');
  }

  if (!['admin', 'member', 'viewer'].includes(role)) {
    throw new ApiError(400, 'Role must be one of: admin, member, viewer');
  }

  const project = await Project.findById(req.params.id);

  if (!project) {
    throw new ApiError(404, 'Project not found');
  }

  // Check that the requesting user is a project admin
  if (!project.isMemberWithRole(req.user._id, ['admin'])) {
    throw new ApiError(403, 'Only project admins can add members');
  }

  // Check that the target user exists
  const targetUser = await User.findById(userId);
  if (!targetUser) {
    throw new ApiError(404, 'User not found');
  }

  // Check that the user isn't already a member
  if (project.getMember(userId)) {
    throw new ApiError(409, 'User is already a member of this project');
  }

  // Add the member
  project.members.push({ user: userId, role });
  await project.save();
  await project.populate([OWNER_POPULATE, MEMBER_POPULATE]);

  // ─── Fire-and-forget email notification ─────────────
  // Notify the new member via email, but don't await it.
  // If email fails, the API response still succeeds.
  const html = memberAddedTemplate(
    targetUser.name,
    project.name,
    null // projectUrl — set this when frontend is deployed
  );
  sendEmail(targetUser.email, `You've been added to ${project.name}`, html).catch((err) => {
    console.error('⚠️  Failed to send member added email:', err.message);
  });

  sendResponse(res, 200, 'Member added successfully', { project });
});

// ═══════════════════════════════════════════════════════
// REMOVE MEMBER FROM PROJECT
// ═══════════════════════════════════════════════════════
/**
 * DELETE /api/projects/:id/members/:userId
 *
 * Only project admins can remove members.
 * The project owner CANNOT be removed.
 */
const removeMember = catchAsync(async (req, res) => {
  const { userId } = req.params;

  const project = await Project.findById(req.params.id);

  if (!project) {
    throw new ApiError(404, 'Project not found');
  }

  // Check that the requesting user is a project admin
  if (!project.isMemberWithRole(req.user._id, ['admin'])) {
    throw new ApiError(403, 'Only project admins can remove members');
  }

  // Can't remove the owner
  if (project.owner.toString() === userId) {
    throw new ApiError(400, 'Cannot remove the project owner');
  }

  // Check that the target user is actually a member
  if (!project.getMember(userId)) {
    throw new ApiError(404, 'User is not a member of this project');
  }

  // Remove the member
  project.members = project.members.filter(
    (m) => m.user.toString() !== userId
  );
  await project.save();
  await project.populate([OWNER_POPULATE, MEMBER_POPULATE]);

  sendResponse(res, 200, 'Member removed successfully', { project });
});

module.exports = {
  createProject,
  getProjects,
  getProject,
  updateProject,
  deleteProject,
  addMember,
  removeMember,
};
