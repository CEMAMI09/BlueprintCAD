// Handle forgot username requests
import { getDb } from '../../../db/db';
import { sendUsernameReminderEmail } from '../../../shared/utils/email.js';
import { checkRateLimit, getClientIP } from '../../../shared/utils/rate-limit.js';
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

    // Check rate limit (by IP to prevent email enumeration)
    const clientIP = getClientIP(req);
    const rateLimit = checkRateLimit(clientIP, 'usernameRecovery') as RateLimitResult;
    
    if (!rateLimit.allowed) {
      return res.status(429).json({ 
        error: `Too many username recovery attempts. Please try again in ${Math.ceil((rateLimit.retryAfter || 3600) / 60)} minutes.`,
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
    if (!user) {
      console.log('Username recovery requested for non-existent email:', email);
      return res.status(200).json({ 
        message: 'If an account with that email exists, the username has been sent.' 
      });
    }

    // Send email
    try {
      await sendUsernameReminderEmail(user.email, user.username);
      console.log('Username reminder email sent to:', user.email);
    } catch (emailError) {
      console.error('Failed to send username reminder email:', emailError);
      return res.status(500).json({ 
        error: 'Failed to send username reminder email. Please try again later.' 
      });
    }

    res.status(200).json({ 
      message: 'If an account with that email exists, the username has been sent.',
      remaining: rateLimit.remaining
    });
  } catch (error) {
    console.error('Forgot username error:', error);
    res.status(500).json({ error: 'An error occurred. Please try again later.' });
  }
}
