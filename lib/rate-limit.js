// Simple in-memory rate limiter for password recovery requests
// Prevents abuse by limiting requests per IP/email

const rateLimitStore = new Map();

/**
 * Rate limit configuration
 */
const LIMITS = {
  // Password reset: 3 attempts per email per hour
  passwordReset: {
    maxAttempts: 3,
    windowMs: 60 * 60 * 1000, // 1 hour
  },
  // Username recovery: 5 attempts per IP per hour
  usernameRecovery: {
    maxAttempts: 5,
    windowMs: 60 * 60 * 1000, // 1 hour
  },
};

/**
 * Clean up expired entries (run periodically)
 */
function cleanupExpiredEntries() {
  const now = Date.now();
  
  for (const [key, value] of rateLimitStore.entries()) {
    if (now > value.resetAt) {
      rateLimitStore.delete(key);
    }
  }
}

// Clean up every 5 minutes
setInterval(cleanupExpiredEntries, 5 * 60 * 1000);

/**
 * Check if request is rate limited
 * @param {string} identifier - Email or IP address
 * @param {string} type - 'passwordReset' or 'usernameRecovery'
 * @returns {Object} { allowed: boolean, remaining: number, resetAt: number }
 */
function checkRateLimit(identifier, type) {
  const config = LIMITS[type];
  
  if (!config) {
    throw new Error(`Invalid rate limit type: ${type}`);
  }

  const key = `${type}:${identifier}`;
  const now = Date.now();
  
  let entry = rateLimitStore.get(key);

  // Create new entry if doesn't exist or expired
  if (!entry || now > entry.resetAt) {
    entry = {
      attempts: 0,
      resetAt: now + config.windowMs,
    };
    rateLimitStore.set(key, entry);
  }

  // Check if limit exceeded
  if (entry.attempts >= config.maxAttempts) {
    return {
      allowed: false,
      remaining: 0,
      resetAt: entry.resetAt,
      retryAfter: Math.ceil((entry.resetAt - now) / 1000), // seconds
    };
  }

  // Increment attempts
  entry.attempts++;
  
  return {
    allowed: true,
    remaining: config.maxAttempts - entry.attempts,
    resetAt: entry.resetAt,
  };
}

/**
 * Reset rate limit for identifier (useful for testing)
 * @param {string} identifier - Email or IP address
 * @param {string} type - 'passwordReset' or 'usernameRecovery'
 */
function resetRateLimit(identifier, type) {
  const key = `${type}:${identifier}`;
  rateLimitStore.delete(key);
}

/**
 * Get client IP from request
 * @param {Object} req - Next.js request object
 * @returns {string} IP address
 */
function getClientIP(req) {
  // Check various headers for IP (for proxies/load balancers)
  const forwarded = req.headers['x-forwarded-for'];
  const realIp = req.headers['x-real-ip'];
  
  if (forwarded) {
    return forwarded.split(',')[0].trim();
  }
  
  if (realIp) {
    return realIp;
  }
  
  return req.socket?.remoteAddress || 'unknown';
}

module.exports = {
  checkRateLimit,
  resetRateLimit,
  getClientIP,
  LIMITS,
};
