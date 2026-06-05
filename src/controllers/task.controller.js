const Task = require('../models/Task');
const User = require('../models/User');
const ApiError = require('../utils/ApiError');
const catchAsync = require('../utils/catchAsync');
const sendResponse = require('../utils/sendResponse');
const { sendEmail } = require('../config/mailer');
const { taskAssignedTemplate } = require('../utils/emailTemplates');

/**
 * Populate options for task queries.
 * Always populate assignee and createdBy with name + email only.
 */
const TASK_POPULATE = [
  { path: 'assignee', select: 'name email' },
  { path: 'createdBy', select: 'name email' },
];

// ═══════════════════════════════════════════════════════
// CREATE TASK
// ═══════════════════════════════════════════════════════
/**
 * POST /api/projects/:projectId/tasks
 *
 * Body: { title, description?, status?, priority?, assignee?, dueDate? }
 *
 * The authorize middleware has already verified:
 *   - The user is a member of the project
 *   - The user's project role is 'admin' or 'member'
 *   - req.project is attached
 *
 * If an assignee is provided, we validate they're a project member.
 */
const createTask = catchAsync(async (req, res) => {
  const { title, description, status, priority, assignee, dueDate } = req.body;
  const project = req.project;

  // If assigning the task, ensure the assignee is a project member
  if (assignee) {
    const isMember = project.getMember(assignee);
    if (!isMember) {
      throw new ApiError(400, 'Assignee must be a member of this project');
    }
  }

  const task = await Task.create({
    title,
    description,
    project: project._id,
    createdBy: req.user._id,
    assignee: assignee || null,
    status,
    priority,
    dueDate: dueDate || null,
  });

  await task.populate(TASK_POPULATE);

  sendResponse(res, 201, 'Task created successfully', { task });
});

// ═══════════════════════════════════════════════════════
// GET ALL TASKS (with filtering, sorting, pagination)
// ═══════════════════════════════════════════════════════
/**
 * GET /api/projects/:projectId/tasks
 *
 * Query params:
 *   status    → filter by status (e.g. ?status=todo)
 *   priority  → filter by priority (e.g. ?priority=high)
 *   assignee  → filter by assignee ID (e.g. ?assignee=60f...)
 *   sortBy    → field to sort by: createdAt (default), dueDate, priority
 *   order     → asc or desc (default: desc)
 *   page      → page number (default: 1)
 *   limit     → items per page (default: 20, max: 100)
 *
 * This demonstrates proper query optimization:
 *   - Only apply filters that are present in the query
 *   - Use compound indexes for fast queries
 *   - Paginate to avoid loading thousands of tasks
 */
const getTasks = catchAsync(async (req, res) => {
  const { projectId } = req.params;

  // ── Build filter object ──────────────────────────────
  const filter = { project: projectId };

  if (req.query.status) {
    filter.status = req.query.status;
  }

  if (req.query.priority) {
    filter.priority = req.query.priority;
  }

  if (req.query.assignee) {
    filter.assignee = req.query.assignee;
  }

  // ── Build sort object ────────────────────────────────
  const sortBy = req.query.sortBy || 'createdAt';
  const order = req.query.order === 'asc' ? 1 : -1;

  // Whitelist allowed sort fields to prevent injection
  const allowedSortFields = ['createdAt', 'dueDate', 'priority', 'status', 'updatedAt'];
  const sortField = allowedSortFields.includes(sortBy) ? sortBy : 'createdAt';
  const sort = { [sortField]: order };

  // ── Pagination ───────────────────────────────────────
  const page = Math.max(1, parseInt(req.query.page, 10) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 20));
  const skip = (page - 1) * limit;

  // ── Execute query ────────────────────────────────────
  const [tasks, total] = await Promise.all([
    Task.find(filter)
      .populate(TASK_POPULATE)
      .sort(sort)
      .skip(skip)
      .limit(limit),
    Task.countDocuments(filter),
  ]);

  sendResponse(res, 200, 'Tasks retrieved successfully', {
    tasks,
    pagination: {
      page,
      limit,
      total,
      pages: Math.ceil(total / limit),
    },
  });
});

// ═══════════════════════════════════════════════════════
// GET SINGLE TASK
// ═══════════════════════════════════════════════════════
/**
 * GET /api/projects/:projectId/tasks/:taskId
 *
 * All project members (admin, member, viewer) can view a task.
 */
const getTask = catchAsync(async (req, res) => {
  const task = await Task.findOne({
    _id: req.params.taskId,
    project: req.params.projectId,
  }).populate(TASK_POPULATE);

  if (!task) {
    throw new ApiError(404, 'Task not found in this project');
  }

  sendResponse(res, 200, 'Task retrieved successfully', { task });
});

// ═══════════════════════════════════════════════════════
// UPDATE TASK
// ═══════════════════════════════════════════════════════
/**
 * PATCH /api/projects/:projectId/tasks/:taskId
 *
 * Body: { title?, description?, status?, priority?, dueDate? }
 *
 * Admin and member roles can update tasks.
 * If changing assignee, use the dedicated /assign endpoint instead.
 */
const updateTask = catchAsync(async (req, res) => {
  const { title, description, status, priority, dueDate } = req.body;

  const task = await Task.findOne({
    _id: req.params.taskId,
    project: req.params.projectId,
  });

  if (!task) {
    throw new ApiError(404, 'Task not found in this project');
  }

  // Only update fields that were provided
  if (title !== undefined) task.title = title;
  if (description !== undefined) task.description = description;
  if (status !== undefined) task.status = status;
  if (priority !== undefined) task.priority = priority;
  if (dueDate !== undefined) task.dueDate = dueDate;

  await task.save();
  await task.populate(TASK_POPULATE);

  sendResponse(res, 200, 'Task updated successfully', { task });
});

// ═══════════════════════════════════════════════════════
// DELETE TASK
// ═══════════════════════════════════════════════════════
/**
 * DELETE /api/projects/:projectId/tasks/:taskId
 *
 * Only project admins can delete tasks.
 */
const deleteTask = catchAsync(async (req, res) => {
  const task = await Task.findOneAndDelete({
    _id: req.params.taskId,
    project: req.params.projectId,
  });

  if (!task) {
    throw new ApiError(404, 'Task not found in this project');
  }

  sendResponse(res, 200, 'Task deleted successfully');
});

// ═══════════════════════════════════════════════════════
// ASSIGN TASK
// ═══════════════════════════════════════════════════════
/**
 * PATCH /api/projects/:projectId/tasks/:taskId/assign
 *
 * Body: { assignee } — the user ID to assign to, or null to unassign.
 *
 * Validates that the assignee is a member of the project.
 * Admin and member roles can assign tasks.
 */
const assignTask = catchAsync(async (req, res) => {
  const { assignee } = req.body;
  const project = req.project;

  const task = await Task.findOne({
    _id: req.params.taskId,
    project: req.params.projectId,
  });

  if (!task) {
    throw new ApiError(404, 'Task not found in this project');
  }

  // If assigning (not unassigning), validate the assignee is a project member
  if (assignee) {
    const isMember = project.getMember(assignee);
    if (!isMember) {
      throw new ApiError(400, 'Assignee must be a member of this project');
    }
  }

  task.assignee = assignee || null;
  await task.save();
  await task.populate(TASK_POPULATE);

  // ─── Fire-and-forget email notification ─────────────
  // Send email to the assignee, but don't await it.
  // If email fails, the API response still succeeds.
  if (assignee) {
    User.findById(assignee)
      .select('name email')
      .then((assigneeUser) => {
        if (assigneeUser) {
          const projectName = req.project?.name || 'a project';
          const html = taskAssignedTemplate(
            assigneeUser.name,
            task.title,
            projectName,
            null // taskUrl — set this when frontend is deployed
          );
          sendEmail(assigneeUser.email, `Task Assigned: ${task.title}`, html);
        }
      })
      .catch((err) => {
        console.error('⚠️  Failed to send task assignment email:', err.message);
      });
  }

  sendResponse(res, 200, assignee ? 'Task assigned successfully' : 'Task unassigned successfully', { task });
});

module.exports = {
  createTask,
  getTasks,
  getTask,
  updateTask,
  deleteTask,
  assignTask,
};
