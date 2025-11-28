// Check if user can perform a specific action
import { getDb } from '../../../db/db';
import { getUserFromRequest } from '../../../shared/utils/auth.js';
import { canPerformAction } from '../../../shared/utils/subscription-utils.js';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const user = getUserFromRequest(req);
    if (!user || typeof user === 'string') {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { feature } = req.query;

    if (!feature) {
      return res.status(400).json({ error: 'Feature parameter required' });
    }

    const result = await canPerformAction(user.userId, feature);

    res.status(200).json(result);
  } catch (error) {
    console.error('Can action check error:', error);
    res.status(500).json({ error: 'Failed to check action' });
  }
}

