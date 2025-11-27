// Stripe webhook handler for subscription events
import { getDb } from '../../../db/db';
import Stripe from 'stripe';
import { TIER_FEATURES } from '../../../backend/lib/subscription-utils';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || 'sk_test_dummy', {
  apiVersion: '2023-10-16',
});

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const sig = req.headers['stripe-signature'];
  let event;

  try {
    event = stripe.webhooks.constructEvent(req.body, sig, webhookSecret);
  } catch (err) {
    console.error('Webhook signature verification failed:', err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  const db = await getDb();

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object;
        const userId = parseInt(session.metadata.userId);
        const tier = session.metadata.tier;

        if (userId && tier) {
          // Update user subscription
          await db.run(
            `UPDATE users 
             SET subscription_tier = ?, 
                 subscription_status = 'active',
                 subscription_starts_at = CURRENT_TIMESTAMP,
                 storage_limit_gb = ?
             WHERE id = ?`,
            [tier, getStorageLimitForTier(tier), userId]
          );

          // Create or update subscription record
          const subscription = await stripe.subscriptions.retrieve(session.subscription);
          
          await db.run(
            `INSERT INTO subscriptions 
             (user_id, tier, status, stripe_subscription_id, stripe_customer_id, 
              current_period_start, current_period_end)
             VALUES (?, ?, ?, ?, ?, ?, ?)
             ON CONFLICT(stripe_subscription_id) DO UPDATE SET
             tier = excluded.tier,
             status = excluded.status,
             current_period_start = excluded.current_period_start,
             current_period_end = excluded.current_period_end,
             updated_at = CURRENT_TIMESTAMP`,
            [
              userId,
              tier,
              'active',
              subscription.id,
              subscription.customer,
              new Date(subscription.current_period_start * 1000).toISOString(),
              new Date(subscription.current_period_end * 1000).toISOString(),
            ]
          );

          // Record in history
          await db.run(
            `INSERT INTO subscription_history (user_id, from_tier, to_tier, change_type, stripe_event_id)
             VALUES (?, (SELECT subscription_tier FROM users WHERE id = ?), ?, 'upgrade', ?)`,
            [userId, userId, tier, event.id]
          );

          // Track analytics event
          await db.run(
            `INSERT INTO analytics_events (user_id, event_type, metadata, created_at)
             VALUES (?, 'subscription_upgraded', ?, CURRENT_TIMESTAMP)`,
            [userId, JSON.stringify({ from_tier: 'free', to_tier: tier, stripe_event_id: event.id })]
          );
        }
        break;
      }

      case 'customer.subscription.updated': {
        const subscription = event.data.object;
        const dbSubscription = await db.get(
          'SELECT user_id FROM subscriptions WHERE stripe_subscription_id = ?',
          [subscription.id]
        );

        if (dbSubscription) {
          await db.run(
            `UPDATE subscriptions 
             SET status = ?,
                 current_period_start = ?,
                 current_period_end = ?,
                 cancel_at_period_end = ?,
                 updated_at = CURRENT_TIMESTAMP
             WHERE stripe_subscription_id = ?`,
            [
              subscription.status,
              new Date(subscription.current_period_start * 1000).toISOString(),
              new Date(subscription.current_period_end * 1000).toISOString(),
              subscription.cancel_at_period_end ? 1 : 0,
              subscription.id,
            ]
          );

          // Update user status if cancelled
          if (subscription.status === 'canceled' || subscription.status === 'unpaid') {
            await db.run(
              `UPDATE users 
               SET subscription_status = ?,
                   subscription_ends_at = ?
               WHERE id = ?`,
              [
                subscription.status,
                new Date(subscription.current_period_end * 1000).toISOString(),
                dbSubscription.user_id,
              ]
            );
          }
        }
        break;
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object;
        const dbSubscription = await db.get(
          'SELECT user_id FROM subscriptions WHERE stripe_subscription_id = ?',
          [subscription.id]
        );

        if (dbSubscription) {
          // Downgrade to free
          await db.run(
            `UPDATE users 
             SET subscription_tier = 'free',
                 subscription_status = 'inactive',
                 subscription_ends_at = CURRENT_TIMESTAMP,
                 storage_limit_gb = 1
             WHERE id = ?`,
            [dbSubscription.user_id]
          );

          await db.run(
            `UPDATE subscriptions SET status = 'canceled', updated_at = CURRENT_TIMESTAMP
             WHERE stripe_subscription_id = ?`,
            [subscription.id]
          );

          // Record in history
          await db.run(
            `INSERT INTO subscription_history (user_id, from_tier, to_tier, change_type, stripe_event_id)
             VALUES (?, (SELECT subscription_tier FROM users WHERE id = ?), 'free', 'cancel', ?)`,
            [dbSubscription.user_id, dbSubscription.user_id, event.id]
          );

          // Track analytics event
          await db.run(
            `INSERT INTO analytics_events (user_id, event_type, metadata, created_at)
             VALUES (?, 'subscription_cancelled', ?, CURRENT_TIMESTAMP)`,
            [dbSubscription.user_id, JSON.stringify({ from_tier: 'paid', to_tier: 'free', stripe_event_id: event.id })]
          );
        }
        break;
      }

      case 'invoice.payment_succeeded': {
        const invoice = event.data.object;
        if (invoice.subscription) {
          const dbSubscription = await db.get(
            'SELECT user_id FROM subscriptions WHERE stripe_subscription_id = ?',
            [invoice.subscription]
          );

          if (dbSubscription) {
            await db.run(
              `UPDATE users SET subscription_status = 'active' WHERE id = ?`,
              [dbSubscription.user_id]
            );
          }
        }
        break;
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object;
        if (invoice.subscription) {
          const dbSubscription = await db.get(
            'SELECT user_id FROM subscriptions WHERE stripe_subscription_id = ?',
            [invoice.subscription]
          );

          if (dbSubscription) {
            await db.run(
              `UPDATE users SET subscription_status = 'past_due' WHERE id = ?`,
              [dbSubscription.user_id]
            );
          }
        }
        break;
      }
    }

    res.status(200).json({ received: true });
  } catch (error) {
    console.error('Webhook processing error:', error);
    res.status(500).json({ error: 'Webhook processing failed' });
  }
}

function getStorageLimitForTier(tier) {
  const tierConfig = TIER_FEATURES[tier];
  if (tierConfig && tierConfig.features.storageGB) {
    return tierConfig.features.storageGB;
  }
  return 1; // Default to 1GB
}

