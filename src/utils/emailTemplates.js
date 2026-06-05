/**
 * Email Templates
 * ─────────────────────────────────────────────────────
 * HTML templates for transactional emails sent by DevBoard.
 *
 * Design principles:
 *   - Inline CSS (email clients strip <style> tags)
 *   - Simple HTML (no JavaScript, limited CSS support)
 *   - Clean, professional appearance
 *   - Clear call-to-action
 *
 * Each template function returns a complete HTML string
 * ready to be passed to sendEmail().
 */

/**
 * Task Assigned Notification
 * ─────────────────────────────────────────────────────
 * Sent when a task is assigned to a user.
 *
 * @param {string} assigneeName — Name of the person being assigned
 * @param {string} taskTitle    — Title of the task
 * @param {string} projectName  — Name of the project
 * @param {string} taskUrl      — Direct link to the task (frontend URL)
 * @returns {string} HTML email body
 */
const taskAssignedTemplate = (assigneeName, taskTitle, projectName, taskUrl) => {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
    </head>
    <body style="margin: 0; padding: 0; background-color: #f4f5f7; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
      <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f4f5f7; padding: 40px 20px;">
        <tr>
          <td align="center">
            <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.08);">
              <!-- Header -->
              <tr>
                <td style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px 40px;">
                  <h1 style="color: #ffffff; margin: 0; font-size: 24px; font-weight: 600;">📋 DevBoard</h1>
                </td>
              </tr>
              <!-- Body -->
              <tr>
                <td style="padding: 40px;">
                  <h2 style="color: #1a1a2e; margin: 0 0 16px 0; font-size: 20px;">New Task Assignment</h2>
                  <p style="color: #4a5568; font-size: 16px; line-height: 1.6; margin: 0 0 24px 0;">
                    Hi <strong>${assigneeName}</strong>,
                  </p>
                  <p style="color: #4a5568; font-size: 16px; line-height: 1.6; margin: 0 0 24px 0;">
                    You've been assigned a new task in the project <strong>${projectName}</strong>:
                  </p>
                  <!-- Task Card -->
                  <div style="background-color: #f7fafc; border-left: 4px solid #667eea; padding: 16px 20px; border-radius: 0 6px 6px 0; margin: 0 0 28px 0;">
                    <p style="color: #2d3748; font-size: 18px; font-weight: 600; margin: 0;">
                      ${taskTitle}
                    </p>
                  </div>
                  ${taskUrl ? `
                  <a href="${taskUrl}" style="display: inline-block; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: #ffffff; text-decoration: none; padding: 12px 28px; border-radius: 6px; font-size: 14px; font-weight: 600;">
                    View Task →
                  </a>
                  ` : ''}
                </td>
              </tr>
              <!-- Footer -->
              <tr>
                <td style="padding: 20px 40px; background-color: #f7fafc; border-top: 1px solid #e2e8f0;">
                  <p style="color: #a0aec0; font-size: 12px; margin: 0; text-align: center;">
                    This is an automated notification from DevBoard. Please do not reply to this email.
                  </p>
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>
    </body>
    </html>
  `;
};

/**
 * Member Added to Project Notification
 * ─────────────────────────────────────────────────────
 * Sent when a user is added as a member of a project.
 *
 * @param {string} memberName  — Name of the newly added member
 * @param {string} projectName — Name of the project
 * @param {string} projectUrl  — Direct link to the project (frontend URL)
 * @returns {string} HTML email body
 */
const memberAddedTemplate = (memberName, projectName, projectUrl) => {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
    </head>
    <body style="margin: 0; padding: 0; background-color: #f4f5f7; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
      <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f4f5f7; padding: 40px 20px;">
        <tr>
          <td align="center">
            <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.08);">
              <!-- Header -->
              <tr>
                <td style="background: linear-gradient(135deg, #38b2ac 0%, #2c7a7b 100%); padding: 30px 40px;">
                  <h1 style="color: #ffffff; margin: 0; font-size: 24px; font-weight: 600;">📋 DevBoard</h1>
                </td>
              </tr>
              <!-- Body -->
              <tr>
                <td style="padding: 40px;">
                  <h2 style="color: #1a1a2e; margin: 0 0 16px 0; font-size: 20px;">You've Been Added to a Project!</h2>
                  <p style="color: #4a5568; font-size: 16px; line-height: 1.6; margin: 0 0 24px 0;">
                    Hi <strong>${memberName}</strong>,
                  </p>
                  <p style="color: #4a5568; font-size: 16px; line-height: 1.6; margin: 0 0 24px 0;">
                    You've been added as a member of the following project:
                  </p>
                  <!-- Project Card -->
                  <div style="background-color: #f0fff4; border-left: 4px solid #38b2ac; padding: 16px 20px; border-radius: 0 6px 6px 0; margin: 0 0 28px 0;">
                    <p style="color: #2d3748; font-size: 18px; font-weight: 600; margin: 0;">
                      ${projectName}
                    </p>
                  </div>
                  ${projectUrl ? `
                  <a href="${projectUrl}" style="display: inline-block; background: linear-gradient(135deg, #38b2ac 0%, #2c7a7b 100%); color: #ffffff; text-decoration: none; padding: 12px 28px; border-radius: 6px; font-size: 14px; font-weight: 600;">
                    View Project →
                  </a>
                  ` : ''}
                </td>
              </tr>
              <!-- Footer -->
              <tr>
                <td style="padding: 20px 40px; background-color: #f7fafc; border-top: 1px solid #e2e8f0;">
                  <p style="color: #a0aec0; font-size: 12px; margin: 0; text-align: center;">
                    This is an automated notification from DevBoard. Please do not reply to this email.
                  </p>
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>
    </body>
    </html>
  `;
};

module.exports = {
  taskAssignedTemplate,
  memberAddedTemplate,
};
