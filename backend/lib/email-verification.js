// Email verification utilities (PostgreSQL compatible)
const crypto = require('crypto');
const { getOne, execute } = require('../lib/db');

let schemaReady = false;

function generateSixDigitCode() {
  try {
    if (typeof crypto.randomInt === 'function') {
      return String(crypto.randomInt(100000, 1000000));
    }
  } catch (_) {
    /* ignore */
  }
  return String(100000 + Math.floor(Math.random() * 900000));
}

/**
 * Ensures tables and columns exist (idempotent). Safe to call on every app start / first token.
 */
async function ensureVerificationSchema() {
  if (schemaReady) return;

  await execute(`
    CREATE TABLE IF NOT EXISTS verification_tokens (
      id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL,
      identifier TEXT NOT NULL,
      token TEXT NOT NULL UNIQUE,
      expires TIMESTAMP NOT NULL,
      created_at TIMESTAMP DEFAULT NOW(),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );
  `);
  await execute(`
    CREATE INDEX IF NOT EXISTS idx_verification_tokens_token ON verification_tokens(token);
  `);
  await execute(`
    CREATE INDEX IF NOT EXISTS idx_verification_tokens_user ON verification_tokens(user_id);
  `);
  await execute(`
    CREATE INDEX IF NOT EXISTS idx_verification_tokens_identifier ON verification_tokens(identifier);
  `);
  await execute(`
    CREATE INDEX IF NOT EXISTS idx_verification_tokens_expires ON verification_tokens(expires);
  `);

  await execute(`
    DO $$ BEGIN
      IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'verification_tokens' AND column_name = 'verification_code'
      ) THEN
        ALTER TABLE verification_tokens ADD COLUMN verification_code VARCHAR(6);
      END IF;
    END $$;
  `);
  await execute(`
    CREATE INDEX IF NOT EXISTS idx_verification_tokens_code ON verification_tokens(verification_code);
  `);

  await execute(`
    CREATE TABLE IF NOT EXISTS email_verification_attempts (
      id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL,
      email TEXT NOT NULL,
      attempt_type TEXT NOT NULL,
      ip_address TEXT,
      created_at TIMESTAMP DEFAULT NOW(),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );
  `);
  await execute(`
    CREATE INDEX IF NOT EXISTS idx_verification_attempts_user ON email_verification_attempts(user_id, created_at);
  `);
  await execute(`
    CREATE INDEX IF NOT EXISTS idx_verification_attempts_email ON email_verification_attempts(email, created_at);
  `);
  await execute(`
    CREATE INDEX IF NOT EXISTS idx_verification_attempts_type ON email_verification_attempts(attempt_type, created_at);
  `);

  schemaReady = true;
}

function generateVerificationToken() {
  return crypto.randomBytes(32).toString('hex');
}

async function createVerificationToken(userId, email) {
  await ensureVerificationSchema();

  const token = generateVerificationToken();
  let code = generateSixDigitCode();
  for (let i = 0; i < 5; i++) {
    const clash = await getOne(
      'SELECT 1 FROM verification_tokens WHERE verification_code = $1 AND expires > NOW()',
      [code]
    );
    if (!clash) break;
    code = generateSixDigitCode();
  }

  const expires = new Date(Date.now() + 24 * 60 * 60 * 1000);

  await execute('DELETE FROM verification_tokens WHERE user_id = $1', [userId]);

  await execute(
    `INSERT INTO verification_tokens (user_id, identifier, token, verification_code, expires)
     VALUES ($1, $2, $3, $4, $5)`,
    [userId, email, token, code, expires.toISOString()]
  );

  return { token, code };
}

async function verifyEmailToken(tokenOrCode) {
  await ensureVerificationSchema();

  const input = String(tokenOrCode).trim();
  if (!input) {
    return { success: false, error: 'Invalid or expired token' };
  }

  const tokenRecord = await getOne(
    `SELECT * FROM verification_tokens
     WHERE expires > NOW() AND (token = $1 OR verification_code = $1)`,
    [input]
  );

  if (!tokenRecord) {
    return { success: false, error: 'Invalid or expired token' };
  }

  try {
    await execute('UPDATE users SET email_verified = true, verified_at = NOW() WHERE id = $1', [
      tokenRecord.user_id,
    ]);
  } catch (e) {
    if (e && String(e.message).includes('verified_at')) {
      await execute('UPDATE users SET email_verified = true WHERE id = $1', [tokenRecord.user_id]);
    } else {
      throw e;
    }
  }

  await execute('DELETE FROM verification_tokens WHERE user_id = $1', [tokenRecord.user_id]);

  return { success: true, userId: tokenRecord.user_id };
}

async function checkVerificationRateLimit(userId, email, type = 'send') {
  await ensureVerificationSchema();

  const recentAttempts = await getOne(
    `SELECT COUNT(*)::int as count FROM email_verification_attempts
     WHERE user_id = $1 AND attempt_type = $2 AND created_at > NOW() - INTERVAL '15 minutes'`,
    [userId, type]
  );

  if (recentAttempts?.count >= 3) {
    return { allowed: false, retryAfter: 15 * 60 * 1000 };
  }

  return { allowed: true };
}

async function recordVerificationAttempt(userId, email, type = 'send', ipAddress = null) {
  await ensureVerificationSchema();
  await execute(
    'INSERT INTO email_verification_attempts (user_id, email, attempt_type, ip_address) VALUES ($1, $2, $3, $4)',
    [userId, email, type, ipAddress]
  );
}

async function cleanupExpiredTokens() {
  await ensureVerificationSchema();
  const result = await execute('DELETE FROM verification_tokens WHERE expires < NOW()');
  return result.rowCount || 0;
}

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
  isUserVerified,
  ensureVerificationSchema,
};
