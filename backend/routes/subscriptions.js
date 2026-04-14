// backend/routes/subscriptions.js
const express = require("express");
const router = express.Router();
const { getUserFromRequest } = require("../lib/auth");
const { getOne, execute } = require("../lib/db");
const { stripe } = require("../lib/stripe-utils");
const {
  normalizeTier,
  getFeaturesFlat,
  getRequiredTierForFeature,
} = require("../lib/subscriptionFeatures");

function appBaseUrl(req) {
  return (
    process.env.NEXT_PUBLIC_APP_URL ||
    process.env.NEXT_PUBLIC_BASE_URL ||
    `${req.protocol}://${req.get("host")}`
  );
}

function checkoutPriceIdForTier(rawTier) {
  const tier = normalizeTier(rawTier);
  if (tier === "creator") return process.env.STRIPE_PRICE_CREATOR || null;
  if (tier === "studio") {
    // "Studio is pro" per project convention.
    return process.env.STRIPE_PRICE_PRO || null;
  }
  return null;
}

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
      `SELECT tier, subscription_status, subscription_current_period_end, stripe_subscription_id
       FROM users WHERE id = $1`,
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
      active: user.subscription_status !== "canceled",
      expires_at: user.subscription_current_period_end || null,
      features,
      subscription: user.stripe_subscription_id
        ? {
            status: user.subscription_status || "active",
            currentPeriodEnd: user.subscription_current_period_end || null,
            cancelAtPeriodEnd: user.subscription_status === "canceling",
          }
        : null,
    });
  } catch (error) {
    console.error("GET /api/subscriptions/check error:", error);
    res.status(500).json({ error: "Failed to fetch subscription" });
  }
});

// POST /api/subscriptions/check
// Existing frontend calls this endpoint to start upgrade checkout.
router.post("/check", async (req, res) => {
  try {
    const decoded = getUserFromRequest(req);
    if (!decoded || !decoded.userId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const requestedTier = normalizeTier(req.body?.tier || "free");
    if (requestedTier === "free") {
      return res.status(400).json({ error: "Free tier does not require checkout" });
    }

    const priceId = checkoutPriceIdForTier(requestedTier);
    if (!priceId) {
      return res.status(400).json({
        error: `Missing Stripe price id for tier "${requestedTier}". Set STRIPE_PRICE_${requestedTier === "studio" ? "PRO" : "CREATOR"}.`,
      });
    }

    const user = await getOne(
      "SELECT id, email, username, stripe_customer_id FROM users WHERE id = $1",
      [decoded.userId]
    );
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    let customerId = user.stripe_customer_id || null;
    if (!customerId) {
      const customer = await stripe.customers.create({
        email: user.email,
        metadata: { userId: String(user.id), username: user.username || "" },
      });
      customerId = customer.id;
      await execute("UPDATE users SET stripe_customer_id = $1 WHERE id = $2", [
        customerId,
        user.id,
      ]);
    }

    const base = appBaseUrl(req);
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      mode: "subscription",
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${base}/subscription/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${base}/subscription`,
      metadata: {
        userId: String(user.id),
        requestedTier,
      },
      subscription_data: {
        metadata: {
          userId: String(user.id),
          tier: requestedTier,
        },
      },
      currency: "usd",
      allow_promotion_codes: true,
    });

    return res.json({ url: session.url });
  } catch (error) {
    console.error("POST /api/subscriptions/check error:", error);
    return res.status(500).json({ error: "Failed to create subscription checkout session" });
  }
});

// POST /api/subscriptions/cancel
router.post("/cancel", async (req, res) => {
  try {
    const decoded = getUserFromRequest(req);
    if (!decoded || !decoded.userId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const user = await getOne(
      "SELECT stripe_subscription_id FROM users WHERE id = $1",
      [decoded.userId]
    );
    if (!user?.stripe_subscription_id) {
      return res.status(400).json({ error: "No active Stripe subscription found" });
    }

    const sub = await stripe.subscriptions.update(user.stripe_subscription_id, {
      cancel_at_period_end: true,
    });

    await execute(
      `UPDATE users
       SET subscription_status = $1,
           subscription_current_period_end = to_timestamp($2)
       WHERE id = $3`,
      ["canceling", sub.current_period_end, decoded.userId]
    );

    return res.json({
      success: true,
      message: "Subscription will cancel at period end",
      cancelAtPeriodEnd: true,
      currentPeriodEnd: sub.current_period_end,
    });
  } catch (error) {
    console.error("POST /api/subscriptions/cancel error:", error);
    return res.status(500).json({ error: "Failed to cancel subscription" });
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
