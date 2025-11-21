// Handle password reset with token
import { getDb } from '../../../db/db';
import { hashPassword } from '../../../backend/lib/auth';
import type { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { token, password } = req.body;

    if (!token || typeof token !== 'string') {
      return res.status(400).json({ error: 'Token is required' });
    }

    if (!password || typeof password !== 'string') {
      return res.status(400).json({ error: 'Password is required' });
    }

    // Validate password strength
    if (password.length < 8) {
      return res.status(400).json({ error: 'Password must be at least 8 characters long' });
    }

    const db = await getDb();

    // Find valid token
    const tokenRecord = await db.get(
      `SELECT rt.*, u.username, u.email 
       FROM recovery_tokens rt
       JOIN users u ON rt.user_id = u.id
       WHERE rt.token = ? 
       AND rt.type = 'password_reset'
       AND rt.used = 0
       AND rt.expires_at > datetime('now')`,
      [token]
    );

    if (!tokenRecord) {
      return res.status(400).json({ 
        error: 'Invalid or expired reset token. Please request a new password reset link.' 
      });
    }

    // Hash new password
    const hashedPassword = await hashPassword(password);

    // Update user password
    await db.run(
      'UPDATE users SET password = ? WHERE id = ?',
      [hashedPassword, tokenRecord.user_id]
    );

    // Mark token as used
    await db.run(
      'UPDATE recovery_tokens SET used = 1 WHERE id = ?',
      [tokenRecord.id]
    );

    console.log('Password reset successful for user:', tokenRecord.username);

    res.status(200).json({ 
      message: 'Password successfully reset. You can now log in with your new password.',
      username: tokenRecord.username
    });
  } catch (error) {
    console.error('Reset password error:', error);
    res.status(500).json({ error: 'An error occurred. Please try again later.' });
  }
}
