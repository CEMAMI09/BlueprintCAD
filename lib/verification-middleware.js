import { verifyAuth } from './auth.js';
import { isUserVerified } from './email-verification.js';

/**
 * Middleware to require email verification for protected routes
 * Usage: const user = await requireEmailVerification(req, res);
 * Returns user object if verified, otherwise sends 403 error and returns null
 */
export async function requireEmailVerification(req, res) {
  // First verify authentication
  const user = await verifyAuth(req, res);
  
  if (!user) {
    // verifyAuth already sent 401 response
    return null;
  }

  // Check if email is verified
  const verified = await isUserVerified(user.id);
  
  if (!verified) {
    res.status(403).json({ 
      error: 'Email verification required',
      message: 'Please verify your email address to access this feature. Check your inbox for the verification link or request a new one.',
      code: 'EMAIL_NOT_VERIFIED',
      userId: user.id
    });
    return null;
  }

  return user;
}

/**
 * Check if a user is verified without blocking the request
 * Useful for returning verification status in API responses
 */
export async function checkVerificationStatus(userId) {
  if (!userId) return false;
  return await isUserVerified(userId);
}
