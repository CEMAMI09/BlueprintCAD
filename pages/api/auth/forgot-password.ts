// Handle forgot password requests
import { getDb } from '../../../db/db';
import { sendPasswordResetEmail } from '../../../shared/utils/email';
import { checkRateLimit } from '../../../shared/utils/rate-limit';
import crypto from 'crypto';
import type { NextApiRequest, NextApiResponse } from 'next';

interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetAt: number;
  retryAfter?: number;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { email } = req.body;

    if (!email || typeof email !== 'string') {
      return res.status(400).json({ error: 'Email is required' });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ error: 'Invalid email format' });
    }

    // Check rate limit (by email)
    const rateLimit = checkRateLimit(email.toLowerCase(), 'passwordReset') as RateLimitResult;
    
    if (!rateLimit.allowed) {
      return res.status(429).json({ 
        error: `Too many password reset attempts. Please try again in ${Math.ceil((rateLimit.retryAfter || 3600) / 60)} minutes.`,
        retryAfter: rateLimit.retryAfter || 3600
      });
    }

    const db = await getDb();

    // Find user by email
    const user = await db.get(
      'SELECT id, username, email FROM users WHERE LOWER(email) = LOWER(?)',
      [email]
    );

    // Always return success to prevent email enumeration
    // Don't reveal if email exists in database
    if (!user) {
      console.log('Password reset requested for non-existent email:', email);
      return res.status(200).json({ 
        message: 'If an account with that email exists, a password reset link has been sent.' 
      });
    }

    // Generate secure random token
    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour from now

    // Invalidate any existing unused tokens for this user
    await db.run(
      'UPDATE recovery_tokens SET used = 1 WHERE user_id = ? AND type = ? AND used = 0',
      [user.id, 'password_reset']
    );

    // Store new token
    await db.run(
      `INSERT INTO recovery_tokens (user_id, token, type, expires_at) 
       VALUES (?, ?, 'password_reset', ?)`,
      [user.id, token, expiresAt.toISOString()]
    );

    // Send email
    try {
      await sendPasswordResetEmail(user.email, user.username, token);
      console.log('Password reset email sent to:', user.email);
    } catch (emailError) {
      console.error('Failed to send password reset email:', emailError);
      // Don't expose email service errors to users
      return res.status(500).json({ 
        error: 'Failed to send password reset email. Please try again later.' 
      });
    }

    res.status(200).json({ 
      message: 'If an account with that email exists, a password reset link has been sent.',
      remaining: rateLimit.remaining
    });
  } catch (error) {
    console.error('Forgot password error:', error);
    res.status(500).json({ error: 'An error occurred. Please try again later.' });
  }
}
