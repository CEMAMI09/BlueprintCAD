const { verifyAuth } = require('./auth');
const { isUserVerified } = require('./email-verification');

/**
 * Middleware to require email verification for protected routes
 * Usage: const user = await requireEmailVerification(req, res);
 * Returns user object if verified, otherwise sends 403 error and returns null
 */
async function requireEmailVerification(req, res) {
  // First verify authentication
  const user = await verifyAuth(req);
  
  if (!user) {
    res.status(401).json({ error: 'Unauthorized' });
    return null;
  }

  // Check if email is verified
  const verified = await isUserVerified(user.userId || user.id);
  
  if (!verified) {
    res.status(403).json({ 
      error: 'Email verification required',
      message: 'Please verify your email address to access this feature. Check your inbox for the verification link or request a new one.',
      code: 'EMAIL_NOT_VERIFIED',
      userId: user.userId || user.id
    });
    return null;
  }

  return user;
}

/**
 * Check if a user is verified without blocking the request
 * Useful for returning verification status in API responses
 */
async function checkVerificationStatus(userId) {
  if (!userId) return false;
  return await isUserVerified(userId);
}

module.exports = {
  requireEmailVerification,
  checkVerificationStatus
};
