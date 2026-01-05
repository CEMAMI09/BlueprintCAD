// Email verification utilities (PostgreSQL compatible)
const crypto = require('crypto');
const { getOne, execute } = require('../lib/db');

// Generate secure verification token
function generateVerificationToken() {
  return crypto.randomBytes(32).toString('hex');
}

// Create verification token in database
async function createVerificationToken(userId, email) {
  const token = generateVerificationToken();
  const expires = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

  // Delete any existing tokens for this user
  await execute(
    'DELETE FROM verification_tokens WHERE user_id = $1',
    [userId]
  );

  // Create new token
  await execute(
    'INSERT INTO verification_tokens (user_id, identifier, token, expires) VALUES ($1, $2, $3, $4)',
    [userId, email, token, expires.toISOString()]
  );

  return token;
}

// Verify token and mark user as verified
async function verifyEmailToken(token) {
  const tokenRecord = await getOne(
    'SELECT * FROM verification_tokens WHERE token = $1 AND expires > NOW()',
    [token]
  );

  if (!tokenRecord) {
    return { success: false, error: 'Invalid or expired token' };
  }

  // Mark user as verified
  await execute(
    'UPDATE users SET email_verified = true, verified_at = NOW() WHERE id = $1',
    [tokenRecord.user_id]
  );

  // Delete used token
  await execute('DELETE FROM verification_tokens WHERE token = $1', [token]);

  return { success: true, userId: tokenRecord.user_id };
}

// Check rate limiting for verification emails
async function checkVerificationRateLimit(userId, email, type = 'send') {
  // Check attempts in last 15 minutes
  const recentAttempts = await getOne(
    `SELECT COUNT(*)::int as count FROM email_verification_attempts 
     WHERE user_id = $1 AND attempt_type = $2 AND created_at > NOW() - INTERVAL '15 minutes'`,
    [userId, type]
  );

  // Allow max 3 attempts per 15 minutes
  if (recentAttempts?.count >= 3) {
    return { allowed: false, retryAfter: 15 * 60 * 1000 }; // 15 minutes in ms
  }

  return { allowed: true };
}

// Record verification attempt
async function recordVerificationAttempt(userId, email, type = 'send', ipAddress = null) {
  await execute(
    'INSERT INTO email_verification_attempts (user_id, email, attempt_type, ip_address) VALUES ($1, $2, $3, $4)',
    [userId, email, type, ipAddress]
  );
}

// Clean up expired tokens (run periodically)
async function cleanupExpiredTokens() {
  const result = await execute('DELETE FROM verification_tokens WHERE expires < NOW()');
  return result.rowCount || 0;
}

// Check if user is verified
async function isUserVerified(userId) {
  const user = await getOne('SELECT email_verified FROM users WHERE id = $1', [userId]);
  return user?.email_verified === true;
}

module.exports = {
  generateVerificationToken,
  createVerificationToken,
  verifyEmailToken,
  checkVerificationRateLimit,
  recordVerificationAttempt,
  cleanupExpiredTokens,
  isUserVerified
};
