const mongoose = require('mongoose');

/**
 * Task Schema
 * ─────────────────────────────────────────────────────
 * A task belongs to a project. It tracks:
 *   - Who created it (createdBy)
 *   - Who is working on it (assignee)
 *   - Its current status and priority
 *   - An optional due date
 *
 * Relationships:
 *   Task → Project  (many-to-one)
 *   Task → User     (assignee, createdBy — many-to-one)
 *
 * Status flow: todo → in_progress → in_review → done
 * This mirrors the typical Kanban board columns.
 */
const taskSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, 'Task title is required'],
      trim: true,
      minlength: [2, 'Task title must be at least 2 characters'],
      maxlength: [200, 'Task title must be at most 200 characters'],
    },
    description: {
      type: String,
      trim: true,
      maxlength: [2000, 'Description must be at most 2000 characters'],
      default: '',
    },
    project: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Project',
      required: [true, 'Task must belong to a project'],
    },
    assignee: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Task must have a creator'],
    },
    status: {
      type: String,
      enum: {
        values: ['todo', 'in_progress', 'in_review', 'done'],
        message: 'Status must be one of: todo, in_progress, in_review, done',
      },
      default: 'todo',
    },
    priority: {
      type: String,
      enum: {
        values: ['low', 'medium', 'high', 'urgent'],
        message: 'Priority must be one of: low, medium, high, urgent',
      },
      default: 'medium',
    },
    dueDate: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

/**
 * Compound indexes for common query patterns
 * ─────────────────────────────────────────────────────
 * 1. project + status: "show me all todo tasks in Project X"
 * 2. project + assignee: "show me all tasks assigned to User Y in Project X"
 * 3. project + priority: "show me all urgent tasks in Project X"
 */
taskSchema.index({ project: 1, status: 1 });
taskSchema.index({ project: 1, assignee: 1 });
taskSchema.index({ project: 1, priority: 1 });
taskSchema.index({ project: 1, createdAt: -1 }); // default sort

/**
 * Transform output — clean up JSON responses
 */
taskSchema.methods.toJSON = function () {
  const task = this.toObject();
  delete task.__v;
  return task;
};

module.exports = mongoose.model('Task', taskSchema);
