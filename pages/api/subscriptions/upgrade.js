// Handle subscription upgrades
import { getDb } from '../../../db/db';
import { getUserFromRequest } from '../../../backend/lib/auth';
import { getOrCreateCustomer, createCheckoutSession } from '../../../lib/stripe-utils';
import { TIER_FEATURES } from '../../../backend/lib/subscription-utils';

// Stripe Price IDs - REPLACE WITH ACTUAL PRICE IDs FROM STRIPE DASHBOARD
const STRIPE_PRICE_IDS = {
  creator: process.env.STRIPE_PRICE_CREATOR || 'price_creator_monthly',
  studio: process.env.STRIPE_PRICE_STUDIO || 'price_studio_monthly',
};

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const user = getUserFromRequest(req);
    if (!user || typeof user === 'string') {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { tier } = req.body;

    if (!tier || !['creator', 'studio'].includes(tier)) {
      return res.status(400).json({ error: 'Invalid tier' });
    }

    const userId = user.userId;
    const db = await getDb();

    // Get user's email
    const userRecord = await db.get('SELECT email FROM users WHERE id = ?', [userId]);
    if (!userRecord) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Get or create Stripe customer
    const customer = await getOrCreateCustomer(userRecord.email, userId, {
      username: user.username,
    });

    // Update user's Stripe customer ID
    await db.run(
      'UPDATE users SET stripe_customer_id = ? WHERE id = ?',
      [customer.id, userId]
    );

    // Get price ID for tier
    const priceId = STRIPE_PRICE_IDS[tier];

    // Create checkout session
    const session = await createCheckoutSession(
      customer.id,
      priceId,
      `${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/subscription/success?session_id={CHECKOUT_SESSION_ID}`,
      `${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/subscription`,
      {
        userId: userId.toString(),
        tier,
        username: user.username,
      }
    );

    // Track analytics event
    try {
      await db.run(
        `INSERT INTO analytics_events (user_id, event_type, metadata, created_at)
         VALUES (?, 'subscription_upgrade_initiated', ?, CURRENT_TIMESTAMP)`,
        [userId, JSON.stringify({ tier, timestamp: new Date().toISOString() })]
      );
    } catch (error) {
      console.error('Failed to track analytics:', error);
      // Don't fail the request if analytics tracking fails
    }

    res.status(200).json({
      sessionId: session.id,
      url: session.url,
    });
  } catch (error) {
    console.error('Subscription upgrade error:', error);
    res.status(500).json({ error: 'Failed to create checkout session' });
  }
}

