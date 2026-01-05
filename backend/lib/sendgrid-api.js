// SendGrid REST API client (alternative to SMTP for better reliability)
const sgMail = require('@sendgrid/mail');

// Initialize SendGrid
if (process.env.SENDGRID_API_KEY) {
  sgMail.setApiKey(process.env.SENDGRID_API_KEY);
}

/**
 * Send email using SendGrid REST API
 * @param {string} to - Recipient email
 * @param {string} subject - Email subject
 * @param {string} htmlContent - HTML content
 * @param {string} textContent - Plain text content
 */
async function sendEmailViaAPI(to, subject, htmlContent, textContent) {
  if (!process.env.SENDGRID_API_KEY) {
    throw new Error('SENDGRID_API_KEY environment variable is not set');
  }

  const fromEmail = process.env.SMTP_FROM || process.env.SENDGRID_FROM || 'noreply@em554.blueprintcad.io';
  const fromName = process.env.SMTP_FROM_NAME || 'Blueprint';

  const msg = {
    to: to,
    from: {
      email: fromEmail,
      name: fromName,
    },
    subject: subject,
    text: textContent || undefined,
    html: htmlContent || undefined,
  };

  try {
    await sgMail.send(msg);
    console.log(`[SendGrid API] Email sent successfully to ${to}`);
    return { success: true };
  } catch (error) {
    console.error(`[SendGrid API] Failed to send email to ${to}:`, error);
    if (error.response) {
      console.error('SendGrid API Error Details:', {
        status: error.response.status,
        body: error.response.body,
        headers: error.response.headers,
      });
    }
    throw error;
  }
}

module.exports = {
  sendEmailViaAPI,
};

