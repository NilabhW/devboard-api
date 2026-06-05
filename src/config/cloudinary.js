const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');

/**
 * Cloudinary Configuration
 * ─────────────────────────────────────────────────────
 * Cloudinary is a cloud-based image and file management service.
 * We use it to store task attachments (images, PDFs, docs) so
 * we don't have to manage file storage on our own server.
 *
 * The three credentials (cloud_name, api_key, api_secret) are
 * loaded from environment variables — never hardcoded.
 *
 * Why Cloudinary over local storage?
 *   - Files survive server restarts and redeployments
 *   - Built-in CDN for fast delivery
 *   - Automatic image optimization and transformations
 *   - No need to manage disk space on the server
 */
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

/**
 * Cloudinary Storage Engine for Multer
 * ─────────────────────────────────────────────────────
 * multer-storage-cloudinary bridges multer (the file upload
 * middleware) and cloudinary (the storage backend).
 *
 * Configuration:
 *   folder   → All uploads go to "devboard/attachments" in Cloudinary
 *   format   → Restrict to safe, common file types
 *   resource_type → "auto" lets Cloudinary handle images, PDFs, docs etc.
 *
 * Allowed formats:
 *   - jpg, jpeg, png → Images (screenshots, mockups)
 *   - pdf           → Documents, specs
 *   - docx          → Word documents
 */
const storage = new CloudinaryStorage({
  cloudinary,
  params: {
    folder: 'devboard/attachments',
    allowed_formats: ['jpg', 'jpeg', 'png', 'pdf', 'docx'],
    resource_type: 'auto',
  },
});

module.exports = { cloudinary, storage };
