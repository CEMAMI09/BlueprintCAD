// API route to verify email with token
import { verifyEmailToken, recordVerificationAttempt } from '../../../backend/lib/email-verification';
import { getDb } from '../../../backend/lib/db';

export default async function handler(req, res) {
  if (req.method !== 'POST' && req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { token } = req.method === 'POST' ? req.body : req.query;

    if (!token) {
      return res.status(400).json({ error: 'Verification token is required' });
    }

    // Get client IP for rate limiting
    const ipAddress = req.headers['x-forwarded-for'] || req.socket.remoteAddress;

    // Verify the token
    const result = await verifyEmailToken(token);

    if (!result.success) {
      return res.status(400).json({ error: result.error });
    }

    // Get user info
    const db = await getDb();
    const user = await db.get(
      'SELECT id, username, email FROM users WHERE id = ?',
      [result.userId]
    );

    // Record successful verification
    await recordVerificationAttempt(user.id, user.email, 'verify', ipAddress);

    res.status(200).json({
      success: true,
      message: 'Email verified successfully!',
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        email_verified: true
      }
    });
  } catch (error) {
    console.error('Email verification error:', error);
    res.status(500).json({ error: 'Failed to verify email' });
  }
}
