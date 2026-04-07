-- Create email verification tables for PostgreSQL
-- Run this script on your Railway PostgreSQL database

-- Add email_verified column to users table if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'users' AND column_name = 'email_verified'
  ) THEN
    ALTER TABLE users ADD COLUMN email_verified BOOLEAN DEFAULT false;
    -- Set existing users as verified (grandfather them in)
    UPDATE users SET email_verified = true WHERE created_at < NOW();
  END IF;
END $$;

-- Add verified_at column to users table if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'users' AND column_name = 'verified_at'
  ) THEN
    ALTER TABLE users ADD COLUMN verified_at TIMESTAMP;
    -- Set verified_at for existing verified users
    UPDATE users SET verified_at = created_at WHERE email_verified = true AND verified_at IS NULL;
  END IF;
END $$;

-- Create verification_tokens table
CREATE TABLE IF NOT EXISTS verification_tokens (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL,
  identifier TEXT NOT NULL,
  token TEXT NOT NULL UNIQUE,
  expires TIMESTAMP NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Create indexes for verification_tokens
CREATE INDEX IF NOT EXISTS idx_verification_tokens_token ON verification_tokens(token);
CREATE INDEX IF NOT EXISTS idx_verification_tokens_user ON verification_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_verification_tokens_identifier ON verification_tokens(identifier);
CREATE INDEX IF NOT EXISTS idx_verification_tokens_expires ON verification_tokens(expires);

-- 6-digit code (optional; added by app migration if table already existed)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'verification_tokens' AND column_name = 'verification_code'
  ) THEN
    ALTER TABLE verification_tokens ADD COLUMN verification_code VARCHAR(6);
  END IF;
END $$;
CREATE INDEX IF NOT EXISTS idx_verification_tokens_code ON verification_tokens(verification_code);

-- Create email_verification_attempts table for rate limiting
CREATE TABLE IF NOT EXISTS email_verification_attempts (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL,
  email TEXT NOT NULL,
  attempt_type TEXT NOT NULL CHECK(attempt_type IN ('send', 'verify')),
  ip_address TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Create indexes for email_verification_attempts
CREATE INDEX IF NOT EXISTS idx_verification_attempts_user ON email_verification_attempts(user_id, created_at);
CREATE INDEX IF NOT EXISTS idx_verification_attempts_email ON email_verification_attempts(email, created_at);
CREATE INDEX IF NOT EXISTS idx_verification_attempts_type ON email_verification_attempts(attempt_type, created_at);

