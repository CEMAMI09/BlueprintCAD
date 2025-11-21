// Email verification utilities
import crypto from 'crypto';
import { getDb } from '../db/db';

// Generate secure verification token
export function generateVerificationToken() {
  return crypto.randomBytes(32).toString('hex');
}

// Create verification token in database
export async function createVerificationToken(userId, email) {
  const db = await getDb();
  const token = generateVerificationToken();
  const expires = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

  // Delete any existing tokens for this user
  await db.run('DELETE FROM verification_tokens WHERE user_id = ?', [userId]);

  // Create new token
  await db.run(
    'INSERT INTO verification_tokens (user_id, identifier, token, expires) VALUES (?, ?, ?, ?)',
    [userId, email, token, expires.toISOString()]
  );

  return token;
}

// Verify token and mark user as verified
export async function verifyEmailToken(token) {
  const db = await getDb();
  
  const tokenRecord = await db.get(
    'SELECT * FROM verification_tokens WHERE token = ? AND expires > datetime("now")',
    [token]
  );

  if (!tokenRecord) {
    return { success: false, error: 'Invalid or expired token' };
  }

  // Mark user as verified
  await db.run(
    'UPDATE users SET email_verified = 1, verified_at = datetime("now") WHERE id = ?',
    [tokenRecord.user_id]
  );

  // Delete used token
  await db.run('DELETE FROM verification_tokens WHERE token = ?', [token]);

  return { success: true, userId: tokenRecord.user_id };
}

// Check rate limiting for verification emails
export async function checkVerificationRateLimit(userId, email, type = 'send') {
  const db = await getDb();
  
  // Check attempts in last 15 minutes
  const recentAttempts = await db.get(
    `SELECT COUNT(*) as count FROM email_verification_attempts 
     WHERE user_id = ? AND attempt_type = ? AND created_at > datetime('now', '-15 minutes')`,
    [userId, type]
  );

  // Allow max 3 attempts per 15 minutes
  if (recentAttempts.count >= 3) {
    return { allowed: false, retryAfter: 15 * 60 * 1000 }; // 15 minutes in ms
  }

  return { allowed: true };
}

// Record verification attempt
export async function recordVerificationAttempt(userId, email, type = 'send', ipAddress = null) {
  const db = await getDb();
  
  await db.run(
    'INSERT INTO email_verification_attempts (user_id, email, attempt_type, ip_address) VALUES (?, ?, ?, ?)',
    [userId, email, type, ipAddress]
  );
}

// Clean up expired tokens (run periodically)
export async function cleanupExpiredTokens() {
  const db = await getDb();
  const result = await db.run('DELETE FROM verification_tokens WHERE expires < datetime("now")');
  return result.changes;
}

// Check if user is verified
export async function isUserVerified(userId) {
  const db = await getDb();
  const user = await db.get('SELECT email_verified FROM users WHERE id = ?', [userId]);
  return user?.email_verified === 1;
}
