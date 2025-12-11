// API route to disconnect OAuth provider
import { getDb } from '../../../db/db';
import { verifyAuth } from '../../../backend/lib/auth';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const user = await verifyAuth(req);
    if (!user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { provider } = req.body;

    if (!provider || !['google', 'github'].includes(provider)) {
      return res.status(400).json({ error: 'Invalid provider' });
    }

    const db = await getDb();

    // Check if user has a password set
    const userRecord = await db.get(
      'SELECT password, oauth_providers FROM users WHERE id = ?',
      [user.userId]
    );

    if (!userRecord) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Parse OAuth providers
    let providers = [];
    try {
      providers = JSON.parse(userRecord.oauth_providers || '[]');
    } catch (e) {
      providers = [];
    }

    // Prevent disconnecting if it's the only auth method
    if (!userRecord.password && providers.length === 1 && providers.includes(provider)) {
      return res.status(400).json({ 
        error: 'Cannot disconnect your only authentication method. Please set a password first.' 
      });
    }

    // Remove provider from accounts table
    await db.run(
      'DELETE FROM accounts WHERE user_id = ? AND provider = ?',
      [user.userId, provider]
    );

    // Update user record
    const oauthIdColumn = provider === 'google' ? 'oauth_google_id' : 'oauth_github_id';
    await db.run(
      `UPDATE users SET ${oauthIdColumn} = NULL WHERE id = ?`,
      [user.userId]
    );

    // Update providers array
    const updatedProviders = providers.filter(p => p !== provider);
    await db.run(
      'UPDATE users SET oauth_providers = ? WHERE id = ?',
      [JSON.stringify(updatedProviders), user.userId]
    );

    res.status(200).json({ 
      success: true,
      message: `${provider.charAt(0).toUpperCase() + provider.slice(1)} account disconnected successfully` 
    });
  } catch (error) {
    console.error('Error disconnecting provider:', error);
    res.status(500).json({ error: 'Failed to disconnect provider' });
  }
}
