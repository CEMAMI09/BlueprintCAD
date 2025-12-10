// Cancel subscription
import { getDb } from '../../../db/db';
import { getUserFromRequest } from '../../../backend/lib/auth';
import { cancelSubscription } from '../../../lib/stripe-utils';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const user = getUserFromRequest(req);
    if (!user || typeof user === 'string') {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const db = await getDb();
    
    // Get user's subscription
    const subscription = await db.get(
      'SELECT stripe_subscription_id FROM subscriptions WHERE user_id = ? AND status = ?',
      [user.userId, 'active']
    );

    if (!subscription || !subscription.stripe_subscription_id) {
      return res.status(404).json({ error: 'No active subscription found' });
    }

    // Cancel subscription (at period end)
    await cancelSubscription(subscription.stripe_subscription_id, false);

    // Update database
    await db.run(
      'UPDATE subscriptions SET cancel_at_period_end = 1, updated_at = CURRENT_TIMESTAMP WHERE stripe_subscription_id = ?',
      [subscription.stripe_subscription_id]
    );

    res.status(200).json({ success: true });
  } catch (error) {
    console.error('Cancel subscription error:', error);
    res.status(500).json({ error: 'Failed to cancel subscription' });
  }
}

