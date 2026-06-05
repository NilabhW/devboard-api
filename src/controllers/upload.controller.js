const Task = require('../models/Task');
const { cloudinary } = require('../config/cloudinary');
const ApiError = require('../utils/ApiError');
const catchAsync = require('../utils/catchAsync');
const sendResponse = require('../utils/sendResponse');

/**
 * Populate options for task queries (reused from task.controller.js).
 * Always populate assignee and createdBy with name + email only.
 */
const TASK_POPULATE = [
  { path: 'assignee', select: 'name email' },
  { path: 'createdBy', select: 'name email' },
  { path: 'attachments.uploadedBy', select: 'name email' },
];

// ═══════════════════════════════════════════════════════
// UPLOAD ATTACHMENTS
// ═══════════════════════════════════════════════════════
/**
 * POST /api/projects/:projectId/tasks/:taskId/attachments
 *
 * Upload files to a task via Cloudinary.
 *
 * Flow:
 *   1. Multer middleware processes the multipart upload (runs before this)
 *   2. Files are uploaded to Cloudinary automatically by multer-storage-cloudinary
 *   3. req.files contains the uploaded file info (url, public_id, originalname)
 *   4. We push each file's metadata into the task's attachments array
 *   5. Return the updated task
 *
 * The authorize middleware has already verified:
 *   - The user is a member of the project
 *   - The user's project role is 'admin' or 'member'
 *   - req.project is attached
 */
const uploadAttachments = catchAsync(async (req, res) => {
  // multer populates req.files with uploaded file info
  if (!req.files || req.files.length === 0) {
    throw new ApiError(400, 'No files uploaded. Please attach at least one file.');
  }

  // Find the task in this project
  const task = await Task.findOne({
    _id: req.params.taskId,
    project: req.params.projectId,
  });

  if (!task) {
    throw new ApiError(404, 'Task not found in this project');
  }

  // Map each uploaded file to our attachment schema
  const newAttachments = req.files.map((file) => ({
    url: file.path, // Cloudinary URL (multer-storage-cloudinary sets this)
    publicId: file.filename, // Cloudinary public_id for deletion later
    originalName: file.originalname,
    uploadedBy: req.user._id,
    uploadedAt: new Date(),
  }));

  // Push all new attachments into the task's array
  task.attachments.push(...newAttachments);
  await task.save();
  await task.populate(TASK_POPULATE);

  sendResponse(res, 200, `${newAttachments.length} file(s) uploaded successfully`, { task });
});

// ═══════════════════════════════════════════════════════
// DELETE ATTACHMENT
// ═══════════════════════════════════════════════════════
/**
 * DELETE /api/projects/:projectId/tasks/:taskId/attachments/:attachmentId
 *
 * Remove a specific attachment from a task.
 *
 * Flow:
 *   1. Find the task and verify it belongs to this project
 *   2. Find the attachment by its _id in the attachments array
 *   3. Delete the file from Cloudinary using cloudinary.uploader.destroy()
 *   4. Remove the attachment from the array
 *   5. Return the updated task
 *
 * Why delete from Cloudinary?
 *   If we only remove the DB reference, the file stays in Cloudinary
 *   forever, wasting storage. Always clean up orphaned files.
 */
const deleteAttachment = catchAsync(async (req, res) => {
  const { taskId, attachmentId, projectId } = req.params;

  // Find the task in this project
  const task = await Task.findOne({
    _id: taskId,
    project: projectId,
  });

  if (!task) {
    throw new ApiError(404, 'Task not found in this project');
  }

  // Find the attachment by _id
  const attachment = task.attachments.id(attachmentId);

  if (!attachment) {
    throw new ApiError(404, 'Attachment not found');
  }

  // Delete from Cloudinary
  // The public_id is stored in attachment.publicId
  if (attachment.publicId) {
    try {
      await cloudinary.uploader.destroy(attachment.publicId);
    } catch (error) {
      // Log but don't fail — the DB record should still be cleaned up
      console.error('⚠️  Failed to delete file from Cloudinary:', error.message);
    }
  }

  // Remove the attachment from the array using Mongoose's pull
  task.attachments.pull(attachmentId);
  await task.save();
  await task.populate(TASK_POPULATE);

  sendResponse(res, 200, 'Attachment deleted successfully', { task });
});

module.exports = {
  uploadAttachments,
  deleteAttachment,
};
