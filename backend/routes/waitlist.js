// backend/routes/waitlist.js
const express = require("express");
const router = express.Router();
const { getOne, getAll, execute } = require("../lib/db");
const { getUserFromRequest } = require("../lib/auth");
const { sendMassEmail } = require("../lib/email");

// POST /api/waitlist - Add email to waiting list
router.post("/", async (req, res) => {
  try {
    const { email, name, source } = req.body || {};

    if (!email) {
      return res.status(400).json({ error: "Email is required" });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ error: "Invalid email format" });
    }

    // Check if email already exists
    const existing = await getOne(
      "SELECT id, email FROM waiting_list WHERE email = $1",
      [email.toLowerCase()]
    );

    if (existing) {
      // Get their position
      const position = await getOne(
        "SELECT COUNT(*)::int as count FROM waiting_list WHERE created_at < $1",
        [existing.created_at || new Date()]
      );
      return res.status(200).json({
        message: "You're already on the waiting list!",
        position: (position?.count || 0) + 1,
        alreadyExists: true,
      });
    }

    // Get current position (count of people before them)
    const positionResult = await getOne(
      "SELECT COUNT(*)::int as count FROM waiting_list",
      []
    );
    const position = (positionResult?.count || 0) + 1;

    // Insert into waiting list
    const result = await execute(
      `INSERT INTO waiting_list (email, name, source, position, created_at)
       VALUES ($1, $2, $3, $4, NOW())
       RETURNING id, email, position, created_at`,
      [email.toLowerCase(), name || null, source || "website", position]
    );

    return res.status(201).json({
      message: "Successfully added to waiting list!",
      position: result.rows[0].position,
      email: result.rows[0].email,
    });
  } catch (error) {
    console.error("Waitlist signup error:", error);
    return res.status(500).json({ error: "Failed to add to waiting list" });
  }
});

// GET /api/waitlist - Get waiting list (admin only)
router.get("/", async (req, res) => {
  try {
    const user = getUserFromRequest(req);
    if (!user || !user.userId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    // Check if user is admin (tier = 'enterprise' or has is_admin flag)
    const dbUser = await getOne(
      "SELECT tier, is_admin FROM users WHERE id = $1",
      [user.userId]
    );

    if (!dbUser || (dbUser.tier !== "enterprise" && !dbUser.is_admin)) {
      return res.status(403).json({ error: "Admin access required" });
    }

    const { page = 1, limit = 50, search = "" } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);

    let query = "SELECT * FROM waiting_list WHERE 1=1";
    const params = [];
    let paramCount = 0;

    if (search) {
      paramCount++;
      query += ` AND (email ILIKE $${paramCount} OR name ILIKE $${paramCount})`;
      params.push(`%${search}%`);
    }

    query += ` ORDER BY created_at DESC LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}`;
    params.push(parseInt(limit), offset);

    const waitlist = await getAll(query, params);

    // Get total count
    let countQuery = "SELECT COUNT(*)::int as count FROM waiting_list WHERE 1=1";
    const countParams = [];
    if (search) {
      countParams.push(`%${search}%`);
      countQuery += ` AND (email ILIKE $1 OR name ILIKE $1)`;
    }
    const totalResult = await getOne(countQuery, countParams);
    const total = totalResult?.count || 0;

    return res.json({
      waitlist,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        totalPages: Math.ceil(total / parseInt(limit)),
      },
    });
  } catch (error) {
    console.error("Get waitlist error:", error);
    return res.status(500).json({ error: "Failed to fetch waiting list" });
  }
});

// GET /api/waitlist/stats - Get waiting list statistics (admin only)
router.get("/stats", async (req, res) => {
  try {
    const user = getUserFromRequest(req);
    if (!user || !user.userId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const dbUser = await getOne(
      "SELECT tier, is_admin FROM users WHERE id = $1",
      [user.userId]
    );

    if (!dbUser || (dbUser.tier !== "enterprise" && !dbUser.is_admin)) {
      return res.status(403).json({ error: "Admin access required" });
    }

    const total = await getOne(
      "SELECT COUNT(*)::int as count FROM waiting_list",
      []
    );

    const notified = await getOne(
      "SELECT COUNT(*)::int as count FROM waiting_list WHERE notified = true",
      []
    );

    const today = await getOne(
      "SELECT COUNT(*)::int as count FROM waiting_list WHERE created_at::date = CURRENT_DATE",
      []
    );

    const thisWeek = await getOne(
      "SELECT COUNT(*)::int as count FROM waiting_list WHERE created_at >= CURRENT_DATE - INTERVAL '7 days'",
      []
    );

    return res.json({
      total: total?.count || 0,
      notified: notified?.count || 0,
      notNotified: (total?.count || 0) - (notified?.count || 0),
      today: today?.count || 0,
      thisWeek: thisWeek?.count || 0,
    });
  } catch (error) {
    console.error("Get waitlist stats error:", error);
    return res.status(500).json({ error: "Failed to fetch statistics" });
  }
});

// POST /api/waitlist/send-email - Send mass email to waiting list (admin only)
router.post("/send-email", async (req, res) => {
  try {
    const user = getUserFromRequest(req);
    if (!user || !user.userId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const dbUser = await getOne(
      "SELECT tier, is_admin FROM users WHERE id = $1",
      [user.userId]
    );

    if (!dbUser || (dbUser.tier !== "enterprise" && !dbUser.is_admin)) {
      return res.status(403).json({ error: "Admin access required" });
    }

    const { subject, htmlContent, textContent, onlyNotNotified = false } = req.body || {};

    if (!subject || (!htmlContent && !textContent)) {
      return res.status(400).json({
        error: "Subject and message content are required",
      });
    }

    // Get waiting list emails
    let query = "SELECT email, name FROM waiting_list WHERE 1=1";
    const params = [];

    if (onlyNotNotified) {
      query += " AND notified = false";
    }

    const recipients = await getAll(query, params);

    if (recipients.length === 0) {
      return res.status(400).json({ error: "No recipients found" });
    }

    // Create campaign record
    const campaignResult = await execute(
      `INSERT INTO email_campaigns (name, subject, recipient_type, recipient_count, status, created_by)
       VALUES ($1, $2, 'waitlist', $3, 'sending', $4)
       RETURNING id`,
      [
        `Waitlist Email: ${subject}`,
        subject,
        recipients.length,
        user.userId,
      ]
    );

    const campaignId = campaignResult.rows[0].id;

    // Check if email service is configured
    const { getTransporter } = require("../lib/email");
    const transport = getTransporter();
    if (!transport) {
      return res.status(500).json({
        error: "Email service not configured",
        message: "Please configure SMTP settings (SMTP_USER, SMTP_PASS) in Railway environment variables",
      });
    }

    // Send emails asynchronously (don't block response)
    sendMassEmailToWaitlist(
      campaignId,
      recipients,
      subject,
      htmlContent,
      textContent
    ).catch((error) => {
      console.error("Error sending mass email:", error);
      // Update campaign status to failed
      execute(
        `UPDATE email_campaigns SET status = 'failed' WHERE id = $1`,
        [campaignId]
      ).catch(console.error);
    });

    return res.json({
      message: `Email campaign started. Sending to ${recipients.length} recipients.`,
      campaignId,
      recipientCount: recipients.length,
    });
  } catch (error) {
    console.error("Send waitlist email error:", error);
    return res.status(500).json({ error: "Failed to send emails" });
  }
});

// Helper function to send emails asynchronously
async function sendMassEmailToWaitlist(
  campaignId,
  recipients,
  subject,
  htmlContent,
  textContent
) {
  const { execute } = require("../lib/db");
  let sentCount = 0;
  let failedCount = 0;

  console.log(`[Campaign ${campaignId}] Starting to send ${recipients.length} emails...`);

  for (const recipient of recipients) {
    try {
      console.log(`[Campaign ${campaignId}] Sending to ${recipient.email}...`);
      
      // Replace placeholders in content
      const personalizedHtml = htmlContent
        ? htmlContent
            .replace(/\{name\}/g, recipient.name || "there")
            .replace(/\{email\}/g, recipient.email)
        : null;
      const personalizedText = textContent
        ? textContent
            .replace(/\{name\}/g, recipient.name || "there")
            .replace(/\{email\}/g, recipient.email)
        : null;

      await sendMassEmail(
        recipient.email,
        subject,
        personalizedHtml,
        personalizedText
      );

      console.log(`[Campaign ${campaignId}] ✅ Successfully sent to ${recipient.email}`);

      // Mark as notified in waiting list
      await execute(
        "UPDATE waiting_list SET notified = true WHERE email = $1",
        [recipient.email]
      );

      // Record successful send
      await execute(
        `INSERT INTO email_campaign_recipients (campaign_id, email, status, sent_at)
         VALUES ($1, $2, 'sent', NOW())`,
        [campaignId, recipient.email]
      );

      sentCount++;
    } catch (error) {
      console.error(`[Campaign ${campaignId}] ❌ Failed to send email to ${recipient.email}:`, error);
      console.error(`[Campaign ${campaignId}] Error details:`, {
        message: error.message,
        code: error.code,
        response: error.response,
        stack: error.stack?.split('\n').slice(0, 5).join('\n'),
      });

      // Record failed send
      const errorMessage = error.message || String(error).substring(0, 500);
      await execute(
        `INSERT INTO email_campaign_recipients (campaign_id, email, status, error_message)
         VALUES ($1, $2, 'failed', $3)`,
        [campaignId, recipient.email, errorMessage]
      );

      failedCount++;
    }

    // Small delay to avoid overwhelming email server
    await new Promise((resolve) => setTimeout(resolve, 100));
  }

  // Update campaign status
  try {
    await execute(
      `UPDATE email_campaigns 
       SET status = 'completed', sent_count = $1, failed_count = $2, sent_at = NOW()
       WHERE id = $3`,
      [sentCount, failedCount, campaignId]
    );

    console.log(
      `[Campaign ${campaignId}] ✅ Completed: ${sentCount} sent, ${failedCount} failed`
    );
  } catch (updateError) {
    console.error(`[Campaign ${campaignId}] Failed to update campaign status:`, updateError);
  }
}

module.exports = router;

