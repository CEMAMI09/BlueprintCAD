// backend/routes/contact.js
const express = require("express");
const router = express.Router();
const nodemailer = require('nodemailer');

// Email configuration from environment variables
const EMAIL_CONFIG = {
  host: process.env.SMTP_HOST || 'smtp.gmail.com',
  port: parseInt(process.env.SMTP_PORT || '587'),
  secure: process.env.SMTP_SECURE === 'true',
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
  tls: {
    rejectUnauthorized: false,
  },
};

const FROM_EMAIL = process.env.SMTP_FROM || process.env.SMTP_USER;
const FROM_NAME = process.env.SMTP_FROM_NAME || 'BlueprintCAD';
const CONTACT_EMAIL = 'info.blueprintcad@gmail.com';

// Create reusable transporter
let transporter = null;

function getTransporter() {
  if (!transporter && EMAIL_CONFIG.auth.user && EMAIL_CONFIG.auth.pass) {
    transporter = nodemailer.createTransport(EMAIL_CONFIG);
  }
  return transporter;
}

// POST /api/contact - Send contact form message
router.post("/", async (req, res) => {
  try {
    const { name, email, subject, message } = req.body || {};

    // Validation
    if (!name || !email || !message) {
      return res.status(400).json({ error: "Name, email, and message are required" });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ error: "Invalid email format" });
    }

    const transport = getTransporter();
    
    if (!transport) {
      console.error('Email not configured. Set SMTP_USER and SMTP_PASS environment variables.');
      return res.status(500).json({ error: "Email service not configured" });
    }

    const emailSubject = subject 
      ? `Contact Form: ${subject}` 
      : 'Contact Form Submission - BlueprintCAD';

    const htmlContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #4F7DFF 0%, #3B66F0 100%); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
            .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 8px 8px; }
            .field { margin: 15px 0; }
            .label { font-weight: bold; color: #4F7DFF; }
            .value { margin-top: 5px; padding: 10px; background: white; border-radius: 4px; }
            .message-box { margin-top: 15px; padding: 15px; background: white; border-left: 4px solid #4F7DFF; border-radius: 4px; }
            .footer { text-align: center; color: #666; font-size: 12px; margin-top: 20px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>New Contact Form Submission</h1>
            </div>
            <div class="content">
              <div class="field">
                <div class="label">Name:</div>
                <div class="value">${name}</div>
              </div>
              <div class="field">
                <div class="label">Email:</div>
                <div class="value">${email}</div>
              </div>
              ${subject ? `
              <div class="field">
                <div class="label">Subject:</div>
                <div class="value">${subject}</div>
              </div>
              ` : ''}
              <div class="field">
                <div class="label">Message:</div>
                <div class="message-box">${message.replace(/\n/g, '<br>')}</div>
              </div>
            </div>
            <div class="footer">
              <p>This message was sent from the BlueprintCAD contact form.</p>
            </div>
          </div>
        </body>
      </html>
    `;

    const textContent = `
New Contact Form Submission

Name: ${name}
Email: ${email}
${subject ? `Subject: ${subject}\n` : ''}
Message:
${message}
    `;

    const mailOptions = {
      from: `"${FROM_NAME}" <${FROM_EMAIL}>`,
      to: CONTACT_EMAIL,
      replyTo: email,
      subject: emailSubject,
      html: htmlContent,
      text: textContent,
    };

    try {
      await transport.sendMail(mailOptions);
      console.log('Contact form email sent to:', CONTACT_EMAIL);
      return res.status(200).json({ 
        message: "Your message has been sent successfully. We'll get back to you soon!" 
      });
    } catch (error) {
      console.error('Error sending contact form email:', error);
      return res.status(500).json({ error: "Failed to send message. Please try again later." });
    }
  } catch (error) {
    console.error("Contact form error:", error);
    return res.status(500).json({ error: "Failed to process contact form submission" });
  }
});

module.exports = router;

