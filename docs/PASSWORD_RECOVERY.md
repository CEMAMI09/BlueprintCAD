# Password & Username Recovery System

Complete implementation of password reset and username recovery functionality with email tokens and rate limiting.

## Features

✅ **Password Reset Flow**
- Secure token generation (32-byte random hex)
- Email-based password reset links
- 1-hour token expiration
- One-time use tokens
- Rate limiting (3 attempts per email per hour)

✅ **Username Recovery**
- Email-based username reminders
- Rate limiting (5 attempts per IP per hour)
- No email enumeration (always returns success message)

✅ **Security**
- Tokens stored in database with expiry
- Automatic invalidation of old tokens
- Rate limiting to prevent abuse
- No information leakage (email enumeration prevention)
- Secure password hashing

✅ **User Experience**
- Professional email templates
- Clear success/error messaging
- Auto-redirect after successful reset
- Mobile-responsive UI
- Loading states and validation

## Setup

### 1. Database Migration

The recovery tokens table has already been created. To verify:

```bash
node scripts/add-recovery-tokens-table.js
```

### 2. Email Configuration

Add these variables to your `.env.local` file:

```env
# SMTP Configuration (Required for email functionality)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-specific-password
SMTP_FROM=your-email@gmail.com
SMTP_FROM_NAME=Forge

# Application URL
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

#### Gmail Setup:
1. Enable 2-Factor Authentication on your Google account
2. Go to Google Account > Security > 2-Step Verification > App passwords
3. Create an app password for "Mail"
4. Use that password as `SMTP_PASS`

#### Other Email Providers:
- **SendGrid**: SMTP_HOST=smtp.sendgrid.net, SMTP_PORT=587
- **Mailgun**: SMTP_HOST=smtp.mailgun.org, SMTP_PORT=587
- **AWS SES**: SMTP_HOST=email-smtp.REGION.amazonaws.com, SMTP_PORT=587

### 3. Test Email Configuration

```javascript
const { testEmailConfig } = require('./lib/email');

(async () => {
  const result = await testEmailConfig();
  console.log(result);
})();
```

## Usage

### Password Reset Flow

1. User visits `/forgot-password`
2. Enters their email address
3. System generates secure token and sends email
4. User clicks link in email: `/reset-password?token=...`
5. User enters new password
6. Password is updated and old token is invalidated

### Username Recovery Flow

1. User visits `/forgot-username`
2. Enters their email address
3. System sends email with username
4. User can now log in with their username

## API Endpoints

### POST /api/auth/forgot-password
```json
{
  "email": "user@example.com"
}
```

**Response:**
```json
{
  "message": "If an account with that email exists, a password reset link has been sent.",
  "remaining": 2
}
```

### POST /api/auth/reset-password
```json
{
  "token": "abc123...",
  "password": "newSecurePassword123"
}
```

**Response:**
```json
{
  "message": "Password successfully reset. You can now log in with your new password.",
  "username": "johndoe"
}
```

### POST /api/auth/forgot-username
```json
{
  "email": "user@example.com"
}
```

**Response:**
```json
{
  "message": "If an account with that email exists, the username has been sent.",
  "remaining": 4
}
```

## Rate Limiting

### Password Reset
- **Limit**: 3 attempts per email per hour
- **Identifier**: Email address (lowercase)
- **Status Code**: 429 (Too Many Requests)

### Username Recovery
- **Limit**: 5 attempts per IP per hour
- **Identifier**: Client IP address
- **Status Code**: 429 (Too Many Requests)

Rate limits reset automatically after the time window expires.

## Email Templates

Both email types include:
- Professional HTML design
- Plain text fallback
- Responsive layout
- Clear call-to-action buttons
- Security warnings
- Branding customization

Templates are defined in `lib/email.js` and can be customized.

## Database Schema

### recovery_tokens Table

```sql
CREATE TABLE recovery_tokens (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  token TEXT UNIQUE NOT NULL,
  type TEXT NOT NULL CHECK(type IN ('password_reset', 'username_recovery')),
  expires_at DATETIME NOT NULL,
  used INTEGER DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX idx_recovery_tokens_token ON recovery_tokens(token) WHERE used = 0;
CREATE INDEX idx_recovery_tokens_expires ON recovery_tokens(expires_at);
```

## Security Considerations

1. **Email Enumeration Prevention**: Always return success message even if email doesn't exist
2. **Token Security**: 32-byte cryptographically secure random tokens
3. **Token Expiration**: All tokens expire after 1 hour
4. **One-Time Use**: Tokens are marked as used after successful password reset
5. **Rate Limiting**: Prevents brute force and abuse
6. **Old Token Invalidation**: Previous unused tokens are invalidated when requesting new reset
7. **Password Validation**: Minimum 8 characters enforced

## Customization

### Adjust Rate Limits

Edit `lib/rate-limit.js`:

```javascript
const LIMITS = {
  passwordReset: {
    maxAttempts: 5,  // Increase to 5
    windowMs: 60 * 60 * 1000, // 1 hour
  },
  usernameRecovery: {
    maxAttempts: 10, // Increase to 10
    windowMs: 60 * 60 * 1000,
  },
};
```

### Change Token Expiration

Edit forgot-password endpoint:

```javascript
const expiresAt = new Date(Date.now() + 2 * 60 * 60 * 1000); // 2 hours
```

### Customize Email Templates

Edit `lib/email.js` to modify HTML and text templates for:
- `sendPasswordResetEmail()`
- `sendUsernameReminderEmail()`

## Troubleshooting

### Email Not Sending

1. Check environment variables are set correctly
2. Verify SMTP credentials
3. Check console for error messages
4. Test configuration:
   ```bash
   node -e "require('./lib/email').testEmailConfig().then(console.log)"
   ```

### Rate Limit Issues

Reset rate limit for testing:
```javascript
const { resetRateLimit } = require('./lib/rate-limit');
resetRateLimit('user@example.com', 'passwordReset');
```

### Token Invalid/Expired

Tokens are valid for 1 hour. Check:
1. Token hasn't expired (check `expires_at` in database)
2. Token hasn't been used (`used = 0`)
3. Token exists in database

## Production Recommendations

1. **Use Environment Variables**: Never commit SMTP credentials to git
2. **Enable SSL/TLS**: Use `SMTP_SECURE=true` for port 465
3. **Monitor Rate Limits**: Track rate limit hits in production
4. **Log Security Events**: Log all password reset attempts
5. **Use Professional Email Service**: SendGrid, Mailgun, or AWS SES recommended
6. **Implement CAPTCHA**: Add CAPTCHA to prevent automated abuse
7. **Email Verification**: Consider adding email verification on signup
8. **2FA Option**: Consider adding 2FA for enhanced security

## Files Created

- `scripts/add-recovery-tokens-table.js` - Database migration
- `lib/email.js` - Email utility with templates
- `lib/rate-limit.js` - Rate limiting utility
- `pages/api/auth/forgot-password.ts` - Password reset request API
- `pages/api/auth/reset-password.ts` - Password reset confirmation API
- `pages/api/auth/forgot-username.ts` - Username recovery API
- `app/forgot-password/page.tsx` - Password reset request UI
- `app/reset-password/page.tsx` - Password reset confirmation UI
- `app/forgot-username/page.tsx` - Username recovery UI

## Dependencies

- `nodemailer` - Email sending
- `@types/nodemailer` - TypeScript types
- `crypto` (Node.js built-in) - Secure token generation

---

**Status**: ✅ Fully implemented and ready for use

**Note**: Remember to configure SMTP settings before using in production!
