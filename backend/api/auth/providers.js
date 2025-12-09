// API route to get user's connected OAuth providers
import { getDb } from '../../../db/db';
import { verifyAuth } from '../../../backend/lib/auth';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const user = await verifyAuth(req);
    if (!user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const db = await getDb();

    // Get user's OAuth providers
    const userRecord = await db.get(
      'SELECT oauth_providers, oauth_google_id, oauth_github_id FROM users WHERE id = ?',
      [user.userId]
    );

    if (!userRecord) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Get account details
    const accounts = await db.all(
      'SELECT provider, provider_account_id, created_at FROM accounts WHERE user_id = ?',
      [user.userId]
    );

    const providers = {
      google: {
        connected: !!userRecord.oauth_google_id,
        accountId: userRecord.oauth_google_id,
        connectedAt: accounts.find(a => a.provider === 'google')?.created_at,
      },
      github: {
        connected: !!userRecord.oauth_github_id,
        accountId: userRecord.oauth_github_id,
        connectedAt: accounts.find(a => a.provider === 'github')?.created_at,
      },
    };

    res.status(200).json({ providers });
  } catch (error) {
    console.error('Error fetching providers:', error);
    res.status(500).json({ error: 'Failed to fetch providers' });
  }
}
