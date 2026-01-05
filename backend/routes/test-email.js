// Test email configuration endpoint
const express = require("express");
const router = express.Router();
const { getUserFromRequest } = require("../lib/auth");
const { getTransporter, testEmailConfig } = require("../lib/email");
const { sendMassEmail } = require("../lib/email");

// GET /api/test-email - Test email configuration (admin only)
router.get("/", async (req, res) => {
  try {
    const user = getUserFromRequest(req);
    if (!user || !user.userId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const { getOne } = require("../lib/db");
    const dbUser = await getOne(
      "SELECT tier, is_admin FROM users WHERE id = $1",
      [user.userId]
    );

    if (!dbUser || (dbUser.tier !== "enterprise" && !dbUser.is_admin)) {
      return res.status(403).json({ error: "Admin access required" });
    }

    // Test configuration
    const testResult = await testEmailConfig();
    
    // Also try to get transporter to check config
    const transport = getTransporter();
    const config = {
      hasTransporter: !!transport,
      smtpHost: process.env.SMTP_HOST || 'not set',
      smtpPort: process.env.SMTP_PORT || 'not set',
      smtpUser: process.env.SMTP_USER ? '***set***' : 'not set',
      smtpPass: process.env.SMTP_PASS ? '***set***' : 'not set',
      smtpFrom: process.env.SMTP_FROM || process.env.SMTP_USER || 'not set',
    };

    return res.json({
      testResult,
      config,
    });
  } catch (error) {
    console.error("Test email error:", error);
    return res.status(500).json({ 
      error: "Failed to test email configuration",
      details: error.message 
    });
  }
});

// POST /api/test-email/send - Send a test email (admin only)
router.post("/send", async (req, res) => {
  try {
    const user = getUserFromRequest(req);
    if (!user || !user.userId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const { getOne } = require("../lib/db");
    const dbUser = await getOne(
      "SELECT tier, is_admin, email FROM users WHERE id = $1",
      [user.userId]
    );

    if (!dbUser || (dbUser.tier !== "enterprise" && !dbUser.is_admin)) {
      return res.status(403).json({ error: "Admin access required" });
    }

    const { testEmail } = req.body || {};
    const recipientEmail = testEmail || dbUser.email;

    if (!recipientEmail) {
      return res.status(400).json({ error: "No email address provided" });
    }

    // Send test email
    await sendMassEmail(
      recipientEmail,
      "Test Email from BlueprintCAD",
      "<html><body><h1>Test Email</h1><p>This is a test email from BlueprintCAD. If you received this, your email configuration is working!</p></body></html>",
      "Test Email\n\nThis is a test email from BlueprintCAD. If you received this, your email configuration is working!"
    );

    return res.json({
      success: true,
      message: `Test email sent to ${recipientEmail}`,
    });
  } catch (error) {
    console.error("Send test email error:", error);
    return res.status(500).json({ 
      error: "Failed to send test email",
      details: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined,
    });
  }
});

module.exports = router;

