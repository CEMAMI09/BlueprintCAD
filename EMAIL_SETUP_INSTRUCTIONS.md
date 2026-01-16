# Email Verification Setup Instructions

## Step 1: Database Migration ✅

The migration has been created. Run it using one of these methods:

### Option A: Using Railway CLI (Recommended)
```bash
railway connect Postgres
```
Then in the psql prompt:
```sql
\i backend/migrations/add_email_verification.sql
```

### Option B: Using psql directly
If you have PostgreSQL installed locally, use:
```bash
PGPASSWORD=tLFAgWPCQGfGSZRRdXJAkgmlMKtThoam psql -h tramway.proxy.rlwy.net -U postgres -p 57466 -d railway -f backend/migrations/add_email_verification.sql
```

### Option C: Copy-paste SQL
Connect to your database and run:
```sql
-- Add email verification fields to users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS email_verified BOOLEAN DEFAULT false;
ALTER TABLE users ADD COLUMN IF NOT EXISTS verification_token VARCHAR(255);
ALTER TABLE users ADD COLUMN IF NOT EXISTS verification_token_expires TIMESTAMP;

CREATE INDEX IF NOT EXISTS idx_users_verification_token ON users(verification_token);
```

## Step 2: Email Configuration

You need to set up SMTP email settings in your environment variables (Railway dashboard or `.env` file):

### For Gmail:
```env
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password  # NOT your regular password! See below
SMTP_FROM=your-email@gmail.com
SMTP_FROM_NAME=Blueprint
NEXT_PUBLIC_APP_URL=https://yourdomain.com  # or http://localhost:3000 for local
```

### Getting Gmail App Password:
1. Go to your Google Account settings
2. Enable 2-Step Verification (required for app passwords)
3. Go to "App passwords" section
4. Generate a new app password for "Mail"
5. Use that 16-character password as `SMTP_PASS`

### For Other Email Providers:

**SendGrid:**
```env
SMTP_HOST=smtp.sendgrid.net
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=apikey
SMTP_PASS=your-sendgrid-api-key
SMTP_FROM=your-verified-sender@yourdomain.com
```

**Mailgun:**
```env
SMTP_HOST=smtp.mailgun.org
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-mailgun-smtp-username
SMTP_PASS=your-mailgun-smtp-password
SMTP_FROM=your-verified-sender@yourdomain.com
```

**Outlook/Office365:**
```env
SMTP_HOST=smtp.office365.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-email@outlook.com
SMTP_PASS=your-password
SMTP_FROM=your-email@outlook.com
```

## Step 3: Add to Railway Environment Variables

1. Go to your Railway project dashboard
2. Click on your backend service
3. Go to "Variables" tab
4. Add all the SMTP variables listed above
5. Redeploy your service

## Verification Flow

✅ **Current Flow (Correct):**
1. User registers with email/password → Account created
2. User redirected to `/auth/verify-email-notice` page
3. Verification email sent automatically
4. User clicks link in email → Verifies account
5. User can now log in normally

**OAuth users:** Automatically verified (no email verification needed)

## Testing

After setup, test by:
1. Register a new account
2. Check your email inbox (and spam folder)
3. Click the verification link
4. Should redirect to success page
5. Try logging in with the new account

