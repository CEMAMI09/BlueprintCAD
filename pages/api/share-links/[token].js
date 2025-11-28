// API endpoint for managing individual share links (GET, DELETE)
import { getDb } from '../../../../db/db';
import { getUserFromRequest } from '../../../../shared/utils/auth';
import crypto from 'crypto';

export default async function handler(req, res) {
  const { token } = req.query;
  const db = await getDb();

  if (req.method === 'GET') {
    // Get share link details (for verification)
    try {
      const shareLink = await db.get('SELECT * FROM share_links WHERE link_token = ?', [token]);

      if (!shareLink) {
        return res.status(404).json({ error: 'Share link not found' });
      }

      // Check if expired
      if (shareLink.expires_at) {
        const expiresAt = new Date(shareLink.expires_at);
        if (expiresAt < new Date()) {
          return res.status(410).json({ error: 'Share link has expired' });
        }
      }

      // Don't return password hash
      const { password_hash, ...linkData } = shareLink;

      res.status(200).json({
        ...linkData,
        requires_password: !!password_hash,
        share_url: `/share/${shareLink.link_token}`
      });
    } catch (error) {
      console.error('Get share link error:', error);
      res.status(500).json({ error: 'Failed to get share link' });
    }
  } else if (req.method === 'POST') {
    // Verify password for password-protected links
    try {
      const { password } = req.body;
      const shareLink = await db.get('SELECT * FROM share_links WHERE link_token = ?', [token]);

      if (!shareLink) {
        return res.status(404).json({ error: 'Share link not found' });
      }

      if (!shareLink.password_hash) {
        return res.status(400).json({ error: 'This link does not require a password' });
      }

      const passwordHash = crypto.createHash('sha256').update(password).digest('hex');
      
      if (passwordHash !== shareLink.password_hash) {
        return res.status(401).json({ error: 'Incorrect password' });
      }

      res.status(200).json({ valid: true });
    } catch (error) {
      console.error('Verify password error:', error);
      res.status(500).json({ error: 'Failed to verify password' });
    }
  } else if (req.method === 'DELETE') {
    // Delete share link (requires ownership)
    const user = getUserFromRequest(req);
    
    if (!user || typeof user === 'string') {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const userId = user.userId;

    try {
      const shareLink = await db.get('SELECT * FROM share_links WHERE link_token = ?', [token]);

      if (!shareLink) {
        return res.status(404).json({ error: 'Share link not found' });
      }

      if (shareLink.created_by !== userId) {
        return res.status(403).json({ error: 'You do not have permission to delete this link' });
      }

      await db.run('DELETE FROM share_links WHERE link_token = ?', [token]);

      res.status(200).json({ message: 'Share link deleted successfully' });
    } catch (error) {
      console.error('Delete share link error:', error);
      res.status(500).json({ error: 'Failed to delete share link' });
    }
  } else {
    res.status(405).json({ error: 'Method not allowed' });
  }
}

