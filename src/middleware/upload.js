const multer = require('multer');
const { storage } = require('../config/cloudinary');

/**
 * File Upload Middleware (Multer + Cloudinary)
 * ─────────────────────────────────────────────────────
 * Multer handles multipart/form-data — the encoding used
 * when uploading files via HTML forms or API clients.
 *
 * Configuration:
 *   storage  → CloudinaryStorage (files go straight to Cloudinary)
 *   limits   → 5MB max per file (prevents abuse)
 *   fileFilter → Only allow specific file types
 *
 * Usage in routes:
 *   router.post('/attachments', upload, controller.uploadAttachments);
 *
 * The middleware accepts up to 5 files under the field name "attachments".
 * After processing, req.files contains an array of uploaded file info
 * including the Cloudinary URL and public_id.
 */

// Allowed MIME types — whitelist approach for security
const ALLOWED_MIME_TYPES = [
  'image/jpeg',
  'image/png',
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document', // .docx
];

const multerInstance = multer({
  storage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB in bytes
  },
  fileFilter: (req, file, cb) => {
    if (ALLOWED_MIME_TYPES.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(
        new Error(
          `File type '${file.mimetype}' is not allowed. Accepted: JPG, PNG, PDF, DOCX`
        ),
        false
      );
    }
  },
});

/**
 * Export the upload middleware
 * ─────────────────────────────────────────────────────
 * .array('attachments', 5) means:
 *   - Field name in the form/request: "attachments"
 *   - Maximum 5 files per request
 *
 * If the client sends more than 5 files, multer rejects
 * the request with a MulterError.
 */
const upload = multerInstance.array('attachments', 5);

module.exports = upload;
