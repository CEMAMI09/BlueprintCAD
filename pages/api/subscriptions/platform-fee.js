// Get platform fee for a user based on their subscription tier
import { getDb } from '../../../db/db';
import { getUserFromRequest } from '../../../shared/utils/auth';
import { getPlatformFee } from '../../../shared/utils/subscription-utils';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const user = getUserFromRequest(req);
    if (!user || typeof user === 'string') {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // Get platform fee for the user's tier
    const platformFee = await getPlatformFee(user.userId);

    res.status(200).json({ 
      platformFee: platformFee || 0.05, // Default to 5% if null
      tier: await (await import('../../../shared/utils/subscription-utils')).getUserTier(user.userId)
    });
  } catch (error) {
    console.error('Platform fee check error:', error);
    res.status(500).json({ error: 'Failed to get platform fee' });
  }
}

