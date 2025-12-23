// backend/routes/subscriptions.js
const express = require("express");
const router = express.Router();
const { getUserFromRequest } = require("../lib/auth");
const { getOne } = require("../lib/db");

// GET /api/subscriptions/check - Get user's subscription tier
router.get("/check", async (req, res) => {
  try {
    const decoded = getUserFromRequest(req);

    if (!decoded || !decoded.userId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    // Get user's tier from database
    const user = await getOne(
      "SELECT tier FROM users WHERE id = $1",
      [decoded.userId]
    );

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    // Return subscription info
    // For now, just return the tier from the users table
    // In a full implementation, you'd check a subscriptions table
    res.json({
      tier: user.tier || "free",
      active: true, // Stub - would check subscription status
      expires_at: null, // Stub - would get from subscriptions table
    });
  } catch (error) {
    console.error("GET /api/subscriptions/check error:", error);
    res.status(500).json({ error: "Failed to fetch subscription" });
  }
});

module.exports = router;

