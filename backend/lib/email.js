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
 * Send password reset email
 * @param {string} email - User's email address
 * @param {string} username - User's username
 * @param {string} token - Password reset token
 */
async function sendPasswordResetEmail(email, username, token) {
  const transport = getTransporter();
  
  if (!transport) {
    console.error('Email not configured. Set SMTP_USER and SMTP_PASS environment variables.');
    throw new Error('Email service not configured');
  }

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
    await transport.sendMail(mailOptions);
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
  const transport = getTransporter();
  
  if (!transport) {
    console.error('Email not configured. Set SMTP_USER and SMTP_PASS environment variables.');
    throw new Error('Email service not configured');
  }

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
    await transport.sendMail(mailOptions);
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

module.exports = {
  sendPasswordResetEmail,
  sendUsernameReminderEmail,
  testEmailConfig,
};
