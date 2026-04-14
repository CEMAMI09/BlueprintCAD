const express = require("express");
const router = express.Router();
const { stripe } = require("../lib/stripe-utils");
const { execute, getOne } = require("../lib/db");
const { normalizeTier } = require("../lib/subscriptionFeatures");

function tierFromPriceId(priceId) {
  if (!priceId) return null;
  if (process.env.STRIPE_PRICE_CREATOR && priceId === process.env.STRIPE_PRICE_CREATOR) {
    return "creator";
  }
  if (process.env.STRIPE_PRICE_PRO && priceId === process.env.STRIPE_PRICE_PRO) {
    return "studio"; // "studio is pro" convention
  }
  return null;
}

async function applySubscriptionStateForUser(userId, subscription) {
  const priceId = subscription?.items?.data?.[0]?.price?.id || null;
  const normalizedTier = normalizeTier(tierFromPriceId(priceId) || "free");
  const status = subscription?.status || "active";

  let localStatus = "active";
  if (status === "canceled" || status === "unpaid" || status === "incomplete_expired") {
    localStatus = "canceled";
  } else if (subscription?.cancel_at_period_end) {
    localStatus = "canceling";
  }

  await execute(
    `UPDATE users
     SET tier = $1,
         subscription_status = $2,
         stripe_subscription_id = $3,
         subscription_current_period_end = to_timestamp($4)
     WHERE id = $5`,
    [
      localStatus === "canceled" ? "free" : normalizedTier,
      localStatus,
      subscription.id,
      subscription.current_period_end || null,
      userId,
    ]
  );
}

router.post(
  "/webhook",
  express.raw({ type: "application/json" }),
  async (req, res) => {
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
    if (!webhookSecret) {
      return res.status(500).send("Missing STRIPE_WEBHOOK_SECRET");
    }

    const signature = req.headers["stripe-signature"];
    if (!signature) {
      return res.status(400).send("Missing stripe-signature header");
    }

    let event;
    try {
      event = stripe.webhooks.constructEvent(req.body, signature, webhookSecret);
    } catch (err) {
      console.error("[stripe webhook] signature verification failed:", err.message);
      return res.status(400).send(`Webhook Error: ${err.message}`);
    }

    try {
      switch (event.type) {
        case "checkout.session.completed": {
          const session = event.data.object;
          const userId = Number(session?.metadata?.userId);
          const subId = session?.subscription;
          const customerId = session?.customer;
          if (userId && subId) {
            if (customerId) {
              await execute("UPDATE users SET stripe_customer_id = $1 WHERE id = $2", [
                String(customerId),
                userId,
              ]);
            }
            const sub = await stripe.subscriptions.retrieve(String(subId), {
              expand: ["items.data.price"],
            });
            await applySubscriptionStateForUser(userId, sub);
          }
          break;
        }
        case "customer.subscription.updated":
        case "customer.subscription.created":
        case "customer.subscription.deleted": {
          const sub = event.data.object;
          const customerId = sub?.customer ? String(sub.customer) : null;
          if (customerId) {
            const user = await getOne(
              "SELECT id FROM users WHERE stripe_customer_id = $1 LIMIT 1",
              [customerId]
            );
            if (user?.id) {
              await applySubscriptionStateForUser(user.id, sub);
            }
          }
          break;
        }
        default:
          break;
      }
      return res.json({ received: true });
    } catch (err) {
      console.error("[stripe webhook] handler error:", err);
      return res.status(500).send("Webhook handler failed");
    }
  }
);

module.exports = router;

