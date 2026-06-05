const mongoose = require('mongoose');

/**
 * Project Schema
 * ─────────────────────────────────────────────────────
 * A project is a container for tasks. It has:
 *   - An owner (the user who created it)
 *   - A members array with per-project roles
 *
 * Key design decision: roles live on the Project, NOT on the User.
 *   A user can be an "admin" on Project A and a "viewer" on Project B.
 *   This is how Jira, Linear, and GitHub all work.
 *
 * The members array stores embedded subdocuments:
 *   { user: ObjectId, role: "admin" | "member" | "viewer" }
 *
 * The owner is always in the members array with role "admin",
 * but we store owner separately for fast "who created this?" lookups
 * and to prevent the owner from being accidentally removed.
 */
const projectSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Project name is required'],
      trim: true,
      minlength: [2, 'Project name must be at least 2 characters'],
      maxlength: [100, 'Project name must be at most 100 characters'],
    },
    description: {
      type: String,
      trim: true,
      maxlength: [500, 'Description must be at most 500 characters'],
      default: '',
    },
    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Project must have an owner'],
    },
    members: [
      {
        user: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'User',
          required: true,
        },
        role: {
          type: String,
          enum: ['admin', 'member', 'viewer'],
          default: 'member',
        },
        _id: false, // Don't auto-generate _id for subdocuments
      },
    ],
  },
  {
    timestamps: true,
  }
);

/**
 * Index on members.user for fast lookups
 * ─────────────────────────────────────────────────────
 * "Get all projects where this user is a member" is the most
 * common query. Without this index, MongoDB scans every project.
 */
projectSchema.index({ 'members.user': 1 });
projectSchema.index({ owner: 1 });

/**
 * Instance Method — Check if a user is a member of this project
 * Returns the member subdocument if found, null otherwise.
 *
 * Handles both populated and unpopulated states:
 *   - Unpopulated: m.user is an ObjectId → m.user.toString() works
 *   - Populated:   m.user is a User object → need m.user._id.toString()
 */
projectSchema.methods.getMember = function (userId) {
  return this.members.find((m) => {
    const memberId = m.user._id || m.user; // _id if populated, raw ObjectId if not
    return memberId.toString() === userId.toString();
  }) || null;
};

/**
 * Instance Method — Check if a user has a specific role (or higher)
 */
projectSchema.methods.isMemberWithRole = function (userId, allowedRoles) {
  const member = this.getMember(userId);
  if (!member) return false;
  return allowedRoles.includes(member.role);
};

/**
 * Transform output — clean up JSON responses
 */
projectSchema.methods.toJSON = function () {
  const project = this.toObject();
  delete project.__v;
  return project;
};

module.exports = mongoose.model('Project', projectSchema);
