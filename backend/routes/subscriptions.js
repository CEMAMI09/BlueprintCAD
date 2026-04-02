// backend/routes/subscriptions.js
const express = require("express");
const router = express.Router();
const { getUserFromRequest } = require("../lib/auth");
const { getOne } = require("../lib/db");
const {
  normalizeTier,
  getFeaturesFlat,
  getRequiredTierForFeature,
} = require("../lib/subscriptionFeatures");

async function getUsageCount(userId, featureName) {
  try {
    switch (featureName) {
      case "maxProjects": {
        const r = await getOne(
          "SELECT COUNT(*)::int AS c FROM projects WHERE user_id = $1",
          [userId]
        );
        return r?.c ?? 0;
      }
      case "maxPrivateProjects": {
        const r = await getOne(
          `SELECT COUNT(*)::int AS c FROM projects WHERE user_id = $1 AND (is_public = false OR is_public IS NULL)`,
          [userId]
        );
        return r?.c ?? 0;
      }
      case "maxPublicProjects": {
        const r = await getOne(
          "SELECT COUNT(*)::int AS c FROM projects WHERE user_id = $1 AND is_public = true",
          [userId]
        );
        return r?.c ?? 0;
      }
      case "maxFolders": {
        const r = await getOne(
          "SELECT COUNT(*)::int AS c FROM folders WHERE owner_id = $1",
          [userId]
        );
        return r?.c ?? 0;
      }
      default:
        return 0;
    }
  } catch (e) {
    console.warn("[subscriptions] getUsageCount:", featureName, e?.message || e);
    return 0;
  }
}

// GET /api/subscriptions/check — tier + flat `features` map (required by SubscriptionGate)
router.get("/check", async (req, res) => {
  try {
    const decoded = getUserFromRequest(req);

    if (!decoded || !decoded.userId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const user = await getOne(
      "SELECT tier FROM users WHERE id = $1",
      [decoded.userId]
    );

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    const rawTier = user.tier || "free";
    const tier = normalizeTier(rawTier);
    const features = getFeaturesFlat(tier);

    res.json({
      tier,
      active: true,
      expires_at: null,
      features,
    });
  } catch (error) {
    console.error("GET /api/subscriptions/check error:", error);
    res.status(500).json({ error: "Failed to fetch subscription" });
  }
});

// GET /api/subscriptions/can-action?feature= — used by SubscriptionGate & upload flow
router.get("/can-action", async (req, res) => {
  try {
    const decoded = getUserFromRequest(req);
    if (!decoded || !decoded.userId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const feature = req.query.feature;
    if (!feature || typeof feature !== "string") {
      return res.status(400).json({ error: "feature query parameter required" });
    }

    const user = await getOne(
      "SELECT tier FROM users WHERE id = $1",
      [decoded.userId]
    );
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    const tier = normalizeTier(user.tier || "free");
    const features = getFeaturesFlat(tier);
    const featureValue = features[feature];

    if (featureValue === false || featureValue === 0) {
      return res.json({
        allowed: false,
        reason: "feature_not_available",
        requiredTier: getRequiredTierForFeature(feature),
      });
    }

    if (featureValue === true || featureValue === -1) {
      return res.json({ allowed: true });
    }

    if (typeof featureValue === "number" && featureValue > 0) {
      const current = await getUsageCount(decoded.userId, feature);
      const allowed = current < featureValue;
      return res.json({
        allowed,
        reason: allowed ? undefined : "limit_exceeded",
        current,
        limit: featureValue,
        requiredTier: allowed ? undefined : getRequiredTierForFeature(feature),
      });
    }

    return res.json({ allowed: true });
  } catch (error) {
    console.error("GET /api/subscriptions/can-action error:", error);
    res.status(500).json({ error: "Failed to check action" });
  }
});

module.exports = router;
