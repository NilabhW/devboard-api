const nodemailer = require('nodemailer');

/**
 * Email Configuration (Nodemailer)
 * ─────────────────────────────────────────────────────
 * Sends transactional emails for events like:
 *   - Task assignment notifications
 *   - Project member invitations
 *
 * In production, use real SMTP credentials (SendGrid, Mailgun, etc.)
 * In development, we fallback to Ethereal — a fake SMTP service
 * from the Nodemailer team. Emails aren't actually delivered;
 * instead you get a preview URL to view them in the browser.
 *
 * Why Ethereal?
 *   - No signup required
 *   - Auto-creates test accounts
 *   - Perfect for development and testing
 *   - Preview URL lets you see exactly what the email looks like
 */

let transporter = null;

/**
 * Initialize the email transporter
 * ─────────────────────────────────────────────────────
 * Called once on first sendEmail() invocation (lazy init).
 *
 * If SMTP_HOST is set in .env → use real SMTP credentials
 * If not → create an Ethereal test account automatically
 */
const createTransporter = async () => {
  // If real SMTP credentials are provided, use them
  if (process.env.SMTP_HOST) {
    transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT, 10) || 587,
      secure: parseInt(process.env.SMTP_PORT, 10) === 465, // true for port 465, false otherwise
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });

    console.log(`📧 Email configured with SMTP host: ${process.env.SMTP_HOST}`);
    return;
  }

  // Fallback: Ethereal test account for development
  // This creates a disposable mailbox that catches outgoing emails
  try {
    const testAccount = await nodemailer.createTestAccount();

    transporter = nodemailer.createTransport({
      host: 'smtp.ethereal.email',
      port: 587,
      secure: false,
      auth: {
        user: testAccount.user,
        pass: testAccount.pass,
      },
    });

    console.log(`📧 Email configured with Ethereal test account: ${testAccount.user}`);
  } catch (error) {
    console.error('⚠️  Failed to create Ethereal test account:', error.message);
    console.error('   Email notifications will be disabled.');
  }
};

/**
 * Send an email
 * ─────────────────────────────────────────────────────
 * @param {string} to      — Recipient email address
 * @param {string} subject — Email subject line
 * @param {string} html    — Email body as HTML
 *
 * Returns the message info on success, or null on failure.
 * In development (Ethereal), logs a preview URL to the console
 * so you can view the email without any real delivery.
 *
 * This function NEVER throws — email failures should not
 * break API responses. Errors are logged and swallowed.
 */
const sendEmail = async (to, subject, html) => {
  try {
    // Lazy init — create transporter on first use
    if (!transporter) {
      await createTransporter();
    }

    // If transporter creation failed (no SMTP, Ethereal down), bail silently
    if (!transporter) {
      console.warn('⚠️  Email transporter not available. Skipping email to:', to);
      return null;
    }

    const mailOptions = {
      from: process.env.SMTP_USER || '"DevBoard" <noreply@devboard.dev>',
      to,
      subject,
      html,
    };

    const info = await transporter.sendMail(mailOptions);

    // In development with Ethereal, log the preview URL
    // nodemailer.getTestMessageUrl() returns false for non-Ethereal transports
    const previewUrl = nodemailer.getTestMessageUrl(info);
    if (previewUrl) {
      console.log(`📨 Email preview URL: ${previewUrl}`);
    }

    console.log(`📧 Email sent to ${to}: ${info.messageId}`);
    return info;
  } catch (error) {
    // Log but don't throw — email failures should never break the API
    console.error(`❌ Failed to send email to ${to}:`, error.message);
    return null;
  }
};

module.exports = { sendEmail };
