// SendGrid REST API client (alternative to SMTP for better reliability)
const sgMail = require('@sendgrid/mail');

function getSendGridApiKey() {
  const raw = process.env.SENDGRID_API_KEY;
  return typeof raw === 'string' ? raw.trim() : '';
}

/**
 * True when SendGrid rejected the request because of a bad or forbidden API key.
 * In that case SMTP fallback usually wastes a long connection timeout; callers should fail fast.
 */
function isSendGridAuthFailure(error) {
  if (!error) return false;
  const status = error.response?.status ?? error.code;
  return status === 401 || status === 403;
}

/** First human-readable message from SendGrid error body, if present */
function getSendGridFirstErrorMessage(error) {
  const body = error.response?.body;
  if (!body) return null;
  if (typeof body === 'string') {
    try {
      const parsed = JSON.parse(body);
      return parsed.errors?.[0]?.message || null;
    } catch {
      return null;
    }
  }
  if (typeof body === 'object' && Array.isArray(body.errors) && body.errors[0]?.message) {
    return body.errors[0].message;
  }
  return null;
}

/**
 * Send email using SendGrid REST API
 * @param {string} to - Recipient email
 * @param {string} subject - Email subject
 * @param {string} htmlContent - HTML content
 * @param {string} textContent - Plain text content
 */
async function sendEmailViaAPI(to, subject, htmlContent, textContent) {
  const apiKey = getSendGridApiKey();
  if (!apiKey) {
    throw new Error('SENDGRID_API_KEY environment variable is not set');
  }

  sgMail.setApiKey(apiKey);

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
    const status = error.response?.status ?? error.code;
    const body = error.response?.body;
    console.error('SendGrid API Error Details:', {
      status,
      body: body != null ? JSON.stringify(body) : undefined,
    });
    throw error;
  }
}

module.exports = {
  sendEmailViaAPI,
  isSendGridAuthFailure,
  getSendGridFirstErrorMessage,
};

