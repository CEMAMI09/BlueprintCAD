// Check user's subscription status and features
import { getDb } from '../../../db/db';
import { getUserFromRequest } from '../../../shared/utils/auth';
import { getUserTier, getUserFeatures, canPerformAction, getStorageInfo } from '../../../shared/utils/subscription-utils';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const user = getUserFromRequest(req);
    if (!user || typeof user === 'string') {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const userId = user.userId;
    const tier = await getUserTier(userId);
    const features = await getUserFeatures(userId);
    const storage = await getStorageInfo(userId);

    // Get subscription details from database
    const db = await getDb();
    const subscription = await db.get(
      'SELECT * FROM subscriptions WHERE user_id = ? ORDER BY created_at DESC LIMIT 1',
      [userId]
    );

    res.status(200).json({
      tier,
      features: features.features,
      storage,
      subscription: subscription ? {
        status: subscription.status,
        currentPeriodStart: subscription.current_period_start,
        currentPeriodEnd: subscription.current_period_end,
        cancelAtPeriodEnd: subscription.cancel_at_period_end === 1,
      } : null,
    });
  } catch (error) {
    console.error('Subscription check error:', error);
    res.status(500).json({ error: 'Failed to check subscription' });
  }
}

