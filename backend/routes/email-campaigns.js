// backend/routes/email-campaigns.js
// Admin routes for sending mass emails to all users

const express = require("express");
const router = express.Router();
const { getOne, getAll, execute } = require("../lib/db");
const { getUserFromRequest } = require("../lib/auth");
const { sendMassEmail } = require("../lib/email");

// Helper to check admin access
async function requireAdmin(req, res) {
  const user = getUserFromRequest(req);
  if (!user || !user.userId) {
    res.status(401).json({ error: "Unauthorized" });
    return null;
  }

  const dbUser = await getOne(
    "SELECT tier, is_admin FROM users WHERE id = $1",
    [user.userId]
  );

  if (!dbUser || (dbUser.tier !== "enterprise" && !dbUser.is_admin)) {
    res.status(403).json({ error: "Admin access required" });
    return null;
  }

  return user;
}

// POST /api/email-campaigns/send-to-all - Send mass email to all users (admin only)
router.post("/send-to-all", async (req, res) => {
  try {
    const admin = await requireAdmin(req, res);
    if (!admin) return;

    const { subject, htmlContent, textContent, userFilter } = req.body || {};

    if (!subject || (!htmlContent && !textContent)) {
      return res.status(400).json({
        error: "Subject and message content are required",
      });
    }

    // Build user query with optional filters
    let query = "SELECT email, username FROM users WHERE email IS NOT NULL";
    const params = [];
    let paramCount = 0;

    if (userFilter) {
      if (userFilter.tier) {
        paramCount++;
        query += ` AND tier = $${paramCount}`;
        params.push(userFilter.tier);
      }
      if (userFilter.emailVerified !== undefined) {
        paramCount++;
        query += ` AND email_verified = $${paramCount}`;
        params.push(userFilter.emailVerified);
      }
    }

    const recipients = await getAll(query, params);

    if (recipients.length === 0) {
      return res.status(400).json({ error: "No recipients found" });
    }

    // Create campaign record
    const campaignResult = await execute(
      `INSERT INTO email_campaigns (name, subject, recipient_type, recipient_count, status, created_by)
       VALUES ($1, $2, 'all_users', $3, 'sending', $4)
       RETURNING id`,
      [
        `Mass Email to All Users: ${subject}`,
        subject,
        recipients.length,
        admin.userId,
      ]
    );

    const campaignId = campaignResult.rows[0].id;

    // Send emails asynchronously
    sendMassEmailToUsers(
      campaignId,
      recipients,
      subject,
      htmlContent,
      textContent
    ).catch((error) => {
      console.error("Error sending mass email:", error);
    });

    return res.json({
      message: `Email campaign started. Sending to ${recipients.length} recipients.`,
      campaignId,
      recipientCount: recipients.length,
    });
  } catch (error) {
    console.error("Send mass email error:", error);
    return res.status(500).json({ error: "Failed to send emails" });
  }
});

// GET /api/email-campaigns - Get all email campaigns (admin only)
router.get("/", async (req, res) => {
  try {
    const admin = await requireAdmin(req, res);
    if (!admin) return;

    const { page = 1, limit = 20 } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);

    const campaigns = await getAll(
      `SELECT 
        ec.*,
        u.username as created_by_username
       FROM email_campaigns ec
       LEFT JOIN users u ON ec.created_by = u.id
       ORDER BY ec.created_at DESC
       LIMIT $1 OFFSET $2`,
      [parseInt(limit), offset]
    );

    const totalResult = await getOne(
      "SELECT COUNT(*)::int as count FROM email_campaigns",
      []
    );

    return res.json({
      campaigns,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: totalResult?.count || 0,
        totalPages: Math.ceil((totalResult?.count || 0) / parseInt(limit)),
      },
    });
  } catch (error) {
    console.error("Get campaigns error:", error);
    return res.status(500).json({ error: "Failed to fetch campaigns" });
  }
});

// GET /api/email-campaigns/:id - Get campaign details (admin only)
router.get("/:id", async (req, res) => {
  try {
    const admin = await requireAdmin(req, res);
    if (!admin) return;

    const { id } = req.params;

    const campaign = await getOne(
      `SELECT 
        ec.*,
        u.username as created_by_username
       FROM email_campaigns ec
       LEFT JOIN users u ON ec.created_by = u.id
       WHERE ec.id = $1`,
      [id]
    );

    if (!campaign) {
      return res.status(404).json({ error: "Campaign not found" });
    }

    // Get recipient details
    const recipients = await getAll(
      `SELECT email, status, sent_at, error_message
       FROM email_campaign_recipients
       WHERE campaign_id = $1
       ORDER BY sent_at DESC`,
      [id]
    );

    return res.json({
      campaign,
      recipients,
    });
  } catch (error) {
    console.error("Get campaign error:", error);
    return res.status(500).json({ error: "Failed to fetch campaign" });
  }
});

// Helper function to send emails to all users
async function sendMassEmailToUsers(
  campaignId,
  recipients,
  subject,
  htmlContent,
  textContent
) {
  let sentCount = 0;
  let failedCount = 0;

  for (const recipient of recipients) {
    try {
      // Replace placeholders
      const personalizedHtml = htmlContent
        ? htmlContent
            .replace(/\{username\}/g, recipient.username || "there")
            .replace(/\{email\}/g, recipient.email)
        : null;
      const personalizedText = textContent
        ? textContent
            .replace(/\{username\}/g, recipient.username || "there")
            .replace(/\{email\}/g, recipient.email)
        : null;

      await sendMassEmail(
        recipient.email,
        subject,
        personalizedHtml,
        personalizedText
      );

      await execute(
        `INSERT INTO email_campaign_recipients (campaign_id, email, status, sent_at)
         VALUES ($1, $2, 'sent', NOW())`,
        [campaignId, recipient.email]
      );

      sentCount++;
    } catch (error) {
      console.error(`Failed to send email to ${recipient.email}:`, error);

      await execute(
        `INSERT INTO email_campaign_recipients (campaign_id, email, status, error_message)
         VALUES ($1, $2, 'failed', $3)`,
        [campaignId, recipient.email, error.message]
      );

      failedCount++;
    }

    // Small delay to avoid overwhelming email server
    await new Promise((resolve) => setTimeout(resolve, 100));
  }

  // Update campaign status
  await execute(
    `UPDATE email_campaigns 
     SET status = 'completed', sent_count = $1, failed_count = $2, sent_at = NOW()
     WHERE id = $3`,
    [sentCount, failedCount, campaignId]
  );

  console.log(
    `Campaign ${campaignId} completed: ${sentCount} sent, ${failedCount} failed`
  );
}

module.exports = router;

