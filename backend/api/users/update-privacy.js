// Update user privacy setting
import { getDb } from '../../../db/db';
import { getUserFromRequest } from '../../../backend/lib/auth';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const user = getUserFromRequest(req);
  if (!user) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const { isPrivate } = req.body;

  if (typeof isPrivate !== 'boolean') {
    return res.status(400).json({ error: 'isPrivate must be a boolean' });
  }

  const db = await getDb();

  try {
    await db.run(
      'UPDATE users SET profile_private = ? WHERE id = ?',
      [isPrivate ? 1 : 0, user.userId]
    );

    res.status(200).json({ 
      success: true, 
      profile_private: isPrivate 
    });
  } catch (error) {
    console.error('Update privacy error:', error);
    res.status(500).json({ error: 'Failed to update privacy setting' });
  }
}
