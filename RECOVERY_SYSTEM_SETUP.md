# Quick Start: Password Recovery System

## ✅ What's Been Implemented

### Database
- ✅ `recovery_tokens` table created with indexes
- ✅ Fields: user_id, token, type, expires_at, used, created_at
- ✅ Foreign key to users table
- ✅ Indexes for performance

### API Endpoints
- ✅ `POST /api/auth/forgot-password` - Request password reset
- ✅ `POST /api/auth/reset-password` - Reset password with token
- ✅ `POST /api/auth/forgot-username` - Request username reminder

### UI Pages
- ✅ `/forgot-password` - Request password reset
- ✅ `/reset-password?token=...` - Reset password form
- ✅ `/forgot-username` - Request username reminder
- ✅ Login page updated with recovery links

### Security Features
- ✅ Rate limiting (3 password resets/hour, 5 username recoveries/hour)
- ✅ Secure token generation (32-byte random)
- ✅ 1-hour token expiration
- ✅ One-time use tokens
- ✅ Email enumeration prevention
- ✅ Automatic old token invalidation

### Email System
- ✅ Professional HTML email templates
- ✅ Plain text fallbacks
- ✅ Nodemailer integration
- ✅ Configurable SMTP settings

## 🚀 How to Use

### Step 1: Configure Email (Required)

Create or edit `.env.local` in the root directory:

```env
# Gmail Example
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-gmail-app-password
SMTP_FROM=your-email@gmail.com
SMTP_FROM_NAME=Forge
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

**Gmail Setup:**
1. Go to Google Account → Security → 2-Step Verification
2. Scroll down to "App passwords"
3. Generate a password for "Mail"
4. Use that as `SMTP_PASS`

### Step 2: Start the Server

```bash
npm run dev
```

### Step 3: Test the System

1. **Password Reset Flow:**
   - Visit: http://localhost:3000/forgot-password
   - Enter email address
   - Check email inbox for reset link
   - Click link → enters password → success!

2. **Username Recovery:**
   - Visit: http://localhost:3000/forgot-username
   - Enter email address
   - Check email for username

3. **From Login Page:**
   - Visit: http://localhost:3000/login
   - Click "Forgot password?" or "Forgot username?"

## 📧 Email Templates

### Password Reset Email
- Professional gradient header
- Clear reset button
- Security warning (1-hour expiration)
- Alternative text link
- Footer with branding

### Username Reminder Email
- Professional gradient header
- Highlighted username display
- Login button
- Footer with branding

## 🔒 Security Details

### Rate Limiting
- **Password Reset**: 3 attempts per email per hour
- **Username Recovery**: 5 attempts per IP per hour
- Automatic cleanup of expired entries
- Returns 429 status when limit exceeded

### Token Security
- 32-byte cryptographically secure random token
- Stored as plain text (tokens are single-use and expire quickly)
- 1-hour expiration from creation
- Marked as "used" after successful reset
- Database indexes for fast lookup

### Email Enumeration Prevention
- Always returns success message
- Doesn't reveal if email exists
- Logs attempts for security monitoring

## 🧪 Testing Without Email

If you don't have SMTP configured yet, you can:

1. **Check token generation:**
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

2. **Test rate limiting:**
```bash
node scripts/test-recovery-system.js
```

3. **Check database:**
```bash
sqlite3 forge.db "SELECT * FROM recovery_tokens ORDER BY created_at DESC LIMIT 5"
```

4. **Manual token creation for testing:**
```sql
INSERT INTO recovery_tokens (user_id, token, type, expires_at) 
VALUES (1, 'test-token-123', 'password_reset', datetime('now', '+1 hour'));
```

Then visit: http://localhost:3000/reset-password?token=test-token-123

## 📁 Files Overview

```
forge/
├── lib/
│   ├── email.js              # Email service & templates
│   └── rate-limit.js         # Rate limiting utility
├── pages/api/auth/
│   ├── forgot-password.ts    # Password reset request
│   ├── reset-password.ts     # Password reset confirmation
│   └── forgot-username.ts    # Username recovery
├── app/
│   ├── forgot-password/
│   │   └── page.tsx         # Password reset request UI
│   ├── reset-password/
│   │   └── page.tsx         # Password reset form UI
│   ├── forgot-username/
│   │   └── page.tsx         # Username recovery UI
│   └── login/
│       └── page.tsx         # Updated with recovery links
├── scripts/
│   ├── add-recovery-tokens-table.js
│   └── test-recovery-system.js
├── docs/
│   └── PASSWORD_RECOVERY.md  # Full documentation
└── .env.example              # Environment template
```

## ✅ Verification Checklist

- [x] Database table created
- [x] Indexes created
- [x] API endpoints created
- [x] UI pages created
- [x] Login page updated
- [x] Email templates created
- [x] Rate limiting implemented
- [x] Security measures in place
- [x] Documentation written
- [x] All files compile without errors
- [ ] SMTP configured (user action required)
- [ ] Tested with real email (pending SMTP setup)

## 🎉 System Status: READY

The password recovery system is fully implemented and ready to use. Just configure your SMTP settings in `.env.local` and you're good to go!

## 🆘 Troubleshooting

**"Email service not configured"**
→ Add SMTP credentials to `.env.local`

**"Too many attempts"**
→ Wait 1 hour or reset rate limit in `lib/rate-limit.js`

**"Invalid or expired token"**
→ Request a new password reset (tokens expire after 1 hour)

**Emails not arriving**
→ Check spam folder, verify SMTP credentials, check console logs

---

Need help? Check `docs/PASSWORD_RECOVERY.md` for detailed documentation.
