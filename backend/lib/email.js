// Email utility for sending password recovery and username reminder emails
const nodemailer = require('nodemailer');

// Email configuration from environment variables
const EMAIL_CONFIG = {
  host: process.env.SMTP_HOST || 'smtp.gmail.com',
  port: parseInt(process.env.SMTP_PORT || '587'),
  secure: process.env.SMTP_SECURE === 'true', // true for 465, false for other ports
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
  // Connection timeout settings
  connectionTimeout: 60000, // 60 seconds
  greetingTimeout: 30000, // 30 seconds
  socketTimeout: 60000, // 60 seconds
  // For SendGrid specifically
  tls: {
    rejectUnauthorized: false, // Allow self-signed certificates if needed
  },
};

const FROM_EMAIL = process.env.SMTP_FROM || process.env.SMTP_USER;
const FROM_NAME = process.env.SMTP_FROM_NAME || 'Blueprint';
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

// Create reusable transporter
let transporter = null;

function getTransporter() {
  if (!transporter && EMAIL_CONFIG.auth.user && EMAIL_CONFIG.auth.pass) {
    transporter = nodemailer.createTransport(EMAIL_CONFIG);
  }
  return transporter;
}

/**
 * Prefer SendGrid REST API when SENDGRID_API_KEY is set (HTTPS; avoids blocked outbound SMTP on many hosts),
 * then fall back to Nodemailer/SMTP.
 */
async function sendMailWithSendGridFallback(mailOptions) {
  const toAddr = Array.isArray(mailOptions.to) ? mailOptions.to[0] : mailOptions.to;

  if (process.env.SENDGRID_API_KEY) {
    try {
      const { sendEmailViaAPI } = require('./sendgrid-api');
      await sendEmailViaAPI(toAddr, mailOptions.subject, mailOptions.html, mailOptions.text);
      return;
    } catch (apiError) {
      console.warn('[Email] SendGrid API failed, falling back to SMTP:', apiError.message);
    }
  }

  const transport = getTransporter();
  if (!transport) {
    console.error(
      'Email not configured. Set SENDGRID_API_KEY or SMTP_USER and SMTP_PASS environment variables.'
    );
    throw new Error('Email service not configured');
  }

  await transport.sendMail(mailOptions);
}

/**
 * Send password reset email
 * @param {string} email - User's email address
 * @param {string} username - User's username
 * @param {string} token - Password reset token
 */
async function sendPasswordResetEmail(email, username, token) {
  const resetUrl = `${APP_URL}/reset-password?token=${token}`;
  
  const mailOptions = {
    from: `"${FROM_NAME}" <${FROM_EMAIL}>`,
    to: email,
    subject: 'Password Reset Request - Blueprint',
    html: `
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
            .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 8px 8px; }
            .button { display: inline-block; padding: 12px 30px; background: #667eea; color: white; text-decoration: none; border-radius: 5px; margin: 20px 0; }
            .footer { text-align: center; color: #666; font-size: 12px; margin-top: 20px; }
            .warning { background: #fff3cd; border-left: 4px solid #ffc107; padding: 12px; margin: 20px 0; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>Password Reset Request</h1>
            </div>
            <div class="content">
              <p>Hi <strong>${username}</strong>,</p>
              
              <p>We received a request to reset your password for your Blueprint account. Click the button below to create a new password:</p>
              
              <div style="text-align: center;">
                <a href="${resetUrl}" class="button">Reset Password</a>
              </div>
              
              <p>Or copy and paste this link into your browser:</p>
              <p style="word-break: break-all; color: #667eea;">${resetUrl}</p>
              
              <div class="warning">
                <strong>⚠️ Security Notice:</strong><br>
                This link will expire in 1 hour. If you didn't request this password reset, you can safely ignore this email.
              </div>
              
              <p>For security reasons, this link can only be used once.</p>
            </div>
            <div class="footer">
              <p>This is an automated message from Forge. Please do not reply to this email.</p>
              <p>&copy; ${new Date().getFullYear()} Forge. All rights reserved.</p>
            </div>
          </div>
        </body>
      </html>
    `,
    text: `
Hi ${username},

We received a request to reset your password for your Forge account.

To reset your password, click the link below or copy and paste it into your browser:
${resetUrl}

This link will expire in 1 hour.

If you didn't request this password reset, you can safely ignore this email.

---
This is an automated message from Forge. Please do not reply to this email.
© ${new Date().getFullYear()} Forge. All rights reserved.
    `.trim(),
  };

  try {
    await sendMailWithSendGridFallback(mailOptions);
    console.log('Password reset email sent to:', email);
  } catch (error) {
    console.error('Error sending password reset email:', error);
    throw error;
  }
}

/**
 * Send username reminder email
 * @param {string} email - User's email address
 * @param {string} username - User's username
 */
async function sendUsernameReminderEmail(email, username) {
  const loginUrl = `${APP_URL}/login`;
  
  const mailOptions = {
    from: `"${FROM_NAME}" <${FROM_EMAIL}>`,
    to: email,
    subject: 'Username Reminder - Blueprint',
    html: `
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
            .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 8px 8px; }
            .username-box { background: white; border: 2px solid #667eea; padding: 20px; text-align: center; border-radius: 8px; margin: 20px 0; }
            .username { font-size: 24px; font-weight: bold; color: #667eea; }
            .button { display: inline-block; padding: 12px 30px; background: #667eea; color: white; text-decoration: none; border-radius: 5px; margin: 20px 0; }
            .footer { text-align: center; color: #666; font-size: 12px; margin-top: 20px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>Username Reminder</h1>
            </div>
            <div class="content">
              <p>Hi there,</p>
              
              <p>You requested a reminder of your Blueprint username. Here it is:</p>
              
              <div class="username-box">
                <div style="color: #666; font-size: 14px; margin-bottom: 5px;">Your Username</div>
                <div class="username">${username}</div>
              </div>
              
              <p>You can use this username to log in to your account.</p>
              
              <div style="text-align: center;">
                <a href="${loginUrl}" class="button">Go to Login</a>
              </div>
              
              <p>If you're having trouble logging in or need to reset your password, you can do so from the login page.</p>
            </div>
            <div class="footer">
              <p>This is an automated message from Forge. Please do not reply to this email.</p>
              <p>&copy; ${new Date().getFullYear()} Forge. All rights reserved.</p>
            </div>
          </div>
        </body>
      </html>
    `,
    text: `
Hi there,

You requested a reminder of your Forge username. Here it is:

Username: ${username}

You can use this username to log in to your account at:
${loginUrl}

If you're having trouble logging in or need to reset your password, you can do so from the login page.

---
This is an automated message from Forge. Please do not reply to this email.
© ${new Date().getFullYear()} Forge. All rights reserved.
    `.trim(),
  };

  try {
    await sendMailWithSendGridFallback(mailOptions);
    console.log('Username reminder email sent to:', email);
  } catch (error) {
    console.error('Error sending username reminder email:', error);
    throw error;
  }
}

/**
 * Test email configuration
 */
async function testEmailConfig() {
  const transport = getTransporter();
  
  if (!transport) {
    return { success: false, error: 'Email not configured' };
  }

  try {
    await transport.verify();
    return { success: true, message: 'Email configuration is valid' };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

/**
 * Send email verification email
 * @param {string} email - User's email address
 * @param {string} username - User's username
 * @param {string} token - Verification token
 */
async function sendVerificationEmail(email, username, token, verificationCode) {
  if (!FROM_EMAIL) {
    throw new Error('SMTP_FROM or SMTP_USER must be set for outgoing mail');
  }

  const verificationUrl = `${APP_URL}/verify-email?token=${token}`;
  const codeBlock =
    verificationCode != null
      ? `
              <p style="margin:16px 0 8px 0;"><strong>Or enter this code on the verification page:</strong></p>
              <div style="text-align:center;font-size:28px;letter-spacing:8px;font-family:ui-monospace,monospace;font-weight:700;color:#2F80ED;padding:16px;background:#f0f4ff;border-radius:8px;border:1px solid #cfe2ff;">
                ${String(verificationCode)}
              </div>
              <p style="font-size:13px;color:#666;margin-top:8px;">This code expires in 24 hours, same as the link.</p>
`
      : '';
  
  const mailOptions = {
    from: `"${FROM_NAME}" <${FROM_EMAIL}>`,
    to: email,
    subject: 'Verify Your Email - Blueprint',
    html: `
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
            .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 8px 8px; }
            .button { display: inline-block; padding: 12px 30px; background: #3b82f6; color: white; text-decoration: none; border-radius: 5px; margin: 20px 0; }
            .footer { text-align: center; color: #666; font-size: 12px; margin-top: 20px; }
            .warning { background: #fff3cd; border-left: 4px solid #ffc107; padding: 12px; margin: 20px 0; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>Verify Your Email</h1>
            </div>
            <div class="content">
              <p>Hi <strong>${username}</strong>,</p>
              
              <p>Thanks for signing up for Blueprint! To get started, please verify your email address by clicking the button below:</p>
              
              <div style="text-align: center;">
                <a href="${verificationUrl}" class="button">Verify Email Address</a>
              </div>
              
              <p>Or copy and paste this link into your browser:</p>
              <p style="word-break: break-all; color: #3b82f6;">${verificationUrl}</p>
              ${codeBlock}
              <div class="warning">
                <strong>⏱️ This link expires in 24 hours</strong><br>
                If you didn't create an account with Blueprint, you can safely ignore this email.
              </div>
            </div>
            <div class="footer">
              <p>This is an automated message from Blueprint. Please do not reply to this email.</p>
              <p>&copy; ${new Date().getFullYear()} Blueprint. All rights reserved.</p>
            </div>
          </div>
        </body>
      </html>
    `,
    text: `
Hi ${username},

Thanks for signing up for Blueprint! To get started, please verify your email address.

Verify your email by clicking this link:
${verificationUrl}
${verificationCode != null ? `\n\nOr enter this 6-digit code on the site: ${verificationCode}\n` : ''}
This link and code expire in 24 hours.

If you didn't create an account with Blueprint, you can safely ignore this email.

---
This is an automated message from Blueprint. Please do not reply to this email.
© ${new Date().getFullYear()} Blueprint. All rights reserved.
    `.trim(),
  };

  try {
    await sendMailWithSendGridFallback(mailOptions);
    console.log('Verification email sent to:', email);
  } catch (error) {
    console.error('Error sending verification email:', error);
    throw error;
  }
}

/**
 * Convert plain text to simple HTML
 * @param {string} text - Plain text content
 * @returns {string} HTML content
 */
function textToHtml(text) {
  if (!text) return '';
  
  // Escape HTML characters
  const escaped = text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
  
  // Convert line breaks to <br> and paragraphs
  const paragraphs = escaped.split(/\n\s*\n/).filter(p => p.trim());
  const htmlParagraphs = paragraphs.map(p => {
    const lines = p.split('\n').filter(l => l.trim());
    return `<p>${lines.join('<br>')}</p>`;
  }).join('');
  
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    body { 
      font-family: Arial, sans-serif; 
      line-height: 1.6; 
      color: #333; 
      max-width: 600px; 
      margin: 0 auto; 
      padding: 20px; 
      background-color: #f9f9f9;
    }
    .container {
      background-color: #ffffff;
      padding: 30px;
      padding: 30px;
      border-radius: 8px;
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
    }
    p { margin: 0 0 16px 0; }
    a { color: #3b82f6; text-decoration: none; }
    a:hover { text-decoration: underline; }
  </style>
</head>
<body>
  <div class="container">
    ${htmlParagraphs}
  </div>
</body>
</html>
  `.trim();
}

/**
 * Send mass email (for campaigns)
 * Uses SendGrid API if available, falls back to SMTP
 * @param {string} email - Recipient email address
 * @param {string} subject - Email subject
 * @param {string} htmlContent - HTML email content (optional)
 * @param {string} textContent - Plain text email content (will auto-generate HTML if htmlContent not provided)
 */
async function sendMassEmail(email, subject, htmlContent, textContent) {
  // Try SendGrid API first (more reliable, avoids SMTP port blocking)
  if (process.env.SENDGRID_API_KEY) {
    try {
      const { sendEmailViaAPI } = require('./sendgrid-api');
      const finalHtml = htmlContent || (textContent ? textToHtml(textContent) : null);
      const finalText = textContent || (htmlContent ? stripHtml(htmlContent) : null);
      
      await sendEmailViaAPI(email, subject, finalHtml, finalText);
      console.log(`[Email] Mass email sent via SendGrid API to: ${email}`);
      return;
    } catch (apiError) {
      console.warn(`[Email] SendGrid API failed, falling back to SMTP:`, apiError.message);
      // Fall through to SMTP
    }
  }

  // Fallback to SMTP
  const transport = getTransporter();
  
  if (!transport) {
    console.error('Email not configured. Set SENDGRID_API_KEY or SMTP_USER and SMTP_PASS environment variables.');
    throw new Error('Email service not configured');
  }

  // If no HTML provided but text is provided, auto-generate HTML
  const finalHtml = htmlContent || (textContent ? textToHtml(textContent) : null);
  const finalText = textContent || (htmlContent ? stripHtml(htmlContent) : null);

  const mailOptions = {
    from: `"${FROM_NAME}" <${FROM_EMAIL}>`,
    to: email,
    subject: subject,
    html: finalHtml || undefined,
    text: finalText || undefined,
  };

  try {
    await transport.sendMail(mailOptions);
    console.log(`[Email] Mass email sent via SMTP to: ${email}`);
  } catch (error) {
    console.error(`[Email] Error sending mass email to ${email}:`, error);
    throw error;
  }
}

/**
 * Strip HTML tags to get plain text
 * @param {string} html - HTML content
 * @returns {string} Plain text
 */
function stripHtml(html) {
  if (!html) return '';
  return html
    .replace(/<[^>]*>/g, '') // Remove HTML tags
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .trim();
}

module.exports = {
  sendPasswordResetEmail,
  sendUsernameReminderEmail,
  sendVerificationEmail,
  sendMassEmail,
  testEmailConfig,
  getTransporter, // Export for checking email config
};
