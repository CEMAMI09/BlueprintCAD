# Security Best Practices for OAuth Implementation

## Implemented Security Measures

### 1. CSRF Protection ✅
- **NextAuth Built-in**: Automatic CSRF token generation and validation
- **State Parameter**: OAuth flow uses state parameter to prevent CSRF attacks
- **Token Validation**: All callbacks validate state before processing

### 2. Secure Token Storage ✅
- **httpOnly Cookies**: Session tokens stored in httpOnly cookies (not accessible via JavaScript)
- **Secure Flag**: Cookies marked as secure in production (HTTPS only)
- **SameSite**: Cookies use SameSite=Lax to prevent CSRF
- **Database Encryption**: OAuth tokens stored in encrypted database columns

### 3. Session Management ✅
- **JWT-Based**: Stateless JWT sessions with 7-day expiry
- **Automatic Refresh**: Sessions refresh on activity
- **Secure Logout**: Clears all session data and localStorage
- **Token Rotation**: Access tokens refreshed when expired

### 4. Account Linking Safety ✅
- **Email Verification**: Links accounts only if email matches
- **Duplicate Prevention**: Checks for existing OAuth connections before linking
- **Transaction-Based**: All account operations wrapped in database transactions
- **Rollback on Error**: Failed operations rollback to prevent partial updates

### 5. Disconnect Protection ✅
- **Last Auth Method**: Prevents disconnecting only authentication method
- **Password Check**: Validates user has password before allowing OAuth disconnect
- **Confirmation Dialog**: Requires user confirmation before disconnecting
- **Audit Trail**: Logs all provider connections/disconnections

### 6. Input Validation ✅
- **Provider Whitelist**: Only accepts 'google' and 'github' as valid providers
- **Type Checking**: Validates all input parameters before database operations
- **SQL Injection Prevention**: Uses parameterized queries throughout
- **XSS Prevention**: React automatically escapes all rendered content

### 7. Error Handling ✅
- **Generic Error Messages**: Don't leak sensitive information to users
- **Detailed Logging**: Full error details logged server-side only
- **Graceful Degradation**: Fallback to password auth if OAuth fails
- **User-Friendly Messages**: Clear, actionable error messages for users

## Additional Recommendations

### Rate Limiting

Add rate limiting to prevent abuse:

```javascript
// middleware/rateLimit.js
const rateLimit = new Map();

export function checkRateLimit(identifier, maxRequests = 5, windowMs = 60000) {
  const now = Date.now();
  const userRequests = rateLimit.get(identifier) || [];
  
  // Clean old requests
  const recentRequests = userRequests.filter(time => now - time < windowMs);
  
  if (recentRequests.length >= maxRequests) {
    return false;
  }
  
  recentRequests.push(now);
  rateLimit.set(identifier, recentRequests);
  return true;
}
```

Usage in API routes:
```javascript
// pages/api/auth/disconnect.js
const clientIp = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
if (!checkRateLimit(clientIp, 5, 60000)) {
  return res.status(429).json({ error: 'Too many requests' });
}
```

### Account Lockout

Implement lockout after failed attempts:

```javascript
// Track failed login attempts
const failedAttempts = new Map();

function checkAccountLockout(email) {
  const attempts = failedAttempts.get(email) || { count: 0, lockUntil: null };
  
  if (attempts.lockUntil && Date.now() < attempts.lockUntil) {
    return { locked: true, remainingTime: attempts.lockUntil - Date.now() };
  }
  
  return { locked: false };
}

function recordFailedAttempt(email) {
  const attempts = failedAttempts.get(email) || { count: 0 };
  attempts.count++;
  
  if (attempts.count >= 5) {
    attempts.lockUntil = Date.now() + 15 * 60 * 1000; // 15 minutes
  }
  
  failedAttempts.set(email, attempts);
}
```

### 2FA Implementation

Add two-factor authentication for enhanced security:

```javascript
// Generate TOTP secret
import speakeasy from 'speakeasy';

function generate2FASecret(username) {
  return speakeasy.generateSecret({
    name: `Forge (${username})`,
    length: 32
  });
}

// Verify 2FA token
function verify2FAToken(secret, token) {
  return speakeasy.totp.verify({
    secret,
    encoding: 'base32',
    token,
    window: 2
  });
}
```

### Password Strength Validation

Enforce strong passwords:

```javascript
function validatePasswordStrength(password) {
  const minLength = 8;
  const hasUpperCase = /[A-Z]/.test(password);
  const hasLowerCase = /[a-z]/.test(password);
  const hasNumbers = /\d/.test(password);
  const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(password);
  
  const errors = [];
  
  if (password.length < minLength) {
    errors.push(`Password must be at least ${minLength} characters`);
  }
  if (!hasUpperCase) {
    errors.push('Password must contain at least one uppercase letter');
  }
  if (!hasLowerCase) {
    errors.push('Password must contain at least one lowercase letter');
  }
  if (!hasNumbers) {
    errors.push('Password must contain at least one number');
  }
  if (!hasSpecialChar) {
    errors.push('Password must contain at least one special character');
  }
  
  return {
    valid: errors.length === 0,
    errors
  };
}
```

### Token Refresh Logic

Implement automatic token refresh:

```javascript
// pages/api/auth/refresh.js
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { provider } = req.body;
  const user = await verifyAuth(req);
  
  if (!user) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const db = await getDb();
  const account = await db.get(
    'SELECT * FROM accounts WHERE user_id = ? AND provider = ?',
    [user.userId, provider]
  );

  if (!account || !account.refresh_token) {
    return res.status(400).json({ error: 'No refresh token available' });
  }

  try {
    // Refresh token with OAuth provider
    const newTokens = await refreshOAuthToken(provider, account.refresh_token);
    
    // Update database
    await db.run(
      `UPDATE accounts 
       SET access_token = ?, expires_at = ?, updated_at = datetime('now')
       WHERE id = ?`,
      [newTokens.access_token, newTokens.expires_at, account.id]
    );

    res.status(200).json({ success: true });
  } catch (error) {
    console.error('Token refresh failed:', error);
    res.status(500).json({ error: 'Token refresh failed' });
  }
}
```

### Activity Logging

Track authentication events:

```javascript
// Create audit_logs table
await db.exec(`
  CREATE TABLE IF NOT EXISTS audit_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER,
    action TEXT NOT NULL,
    details TEXT,
    ip_address TEXT,
    user_agent TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
  )
`);

// Log authentication events
async function logAuthEvent(userId, action, details, req) {
  const db = await getDb();
  await db.run(
    `INSERT INTO audit_logs (user_id, action, details, ip_address, user_agent)
     VALUES (?, ?, ?, ?, ?)`,
    [
      userId,
      action,
      JSON.stringify(details),
      req.headers['x-forwarded-for'] || req.socket.remoteAddress,
      req.headers['user-agent']
    ]
  );
}

// Usage
await logAuthEvent(user.id, 'OAUTH_LOGIN', { provider: 'google' }, req);
await logAuthEvent(user.id, 'PROVIDER_CONNECTED', { provider: 'github' }, req);
await logAuthEvent(user.id, 'PROVIDER_DISCONNECTED', { provider: 'google' }, req);
```

### Email Notifications

Notify users of security events:

```javascript
import nodemailer from 'nodemailer';

async function sendSecurityEmail(user, event, details) {
  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: process.env.SMTP_PORT,
    secure: false,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });

  const templates = {
    OAUTH_CONNECTED: {
      subject: 'New OAuth Provider Connected',
      html: `
        <h2>Account Update</h2>
        <p>A new ${details.provider} account was connected to your Forge account.</p>
        <p><strong>Time:</strong> ${new Date().toLocaleString()}</p>
        <p><strong>IP Address:</strong> ${details.ip}</p>
        <p>If you didn't make this change, please secure your account immediately.</p>
      `
    },
    OAUTH_DISCONNECTED: {
      subject: 'OAuth Provider Disconnected',
      html: `
        <h2>Account Update</h2>
        <p>Your ${details.provider} account was disconnected from your Forge account.</p>
        <p><strong>Time:</strong> ${new Date().toLocaleString()}</p>
        <p>If you didn't make this change, please secure your account immediately.</p>
      `
    }
  };

  const template = templates[event];
  
  await transporter.sendMail({
    from: process.env.SMTP_FROM,
    to: user.email,
    subject: template.subject,
    html: template.html
  });
}
```

## Security Checklist for Production

- [ ] **HTTPS Enabled**: All traffic encrypted with valid SSL certificate
- [ ] **Environment Variables**: Secure secrets stored in environment (not in code)
- [ ] **Rate Limiting**: API endpoints protected against abuse
- [ ] **Account Lockout**: Failed login attempts tracked and limited
- [ ] **2FA Available**: Two-factor authentication option for users
- [ ] **Password Policy**: Strong password requirements enforced
- [ ] **Token Rotation**: OAuth tokens refreshed periodically
- [ ] **Activity Logging**: All auth events logged for audit
- [ ] **Email Notifications**: Users notified of security-related changes
- [ ] **Database Backups**: Regular encrypted backups configured
- [ ] **Error Logging**: Centralized error tracking (Sentry, etc.)
- [ ] **Security Headers**: CSP, HSTS, X-Frame-Options configured
- [ ] **Dependency Updates**: Regular security patches applied
- [ ] **Penetration Testing**: Security audit performed
- [ ] **Incident Response**: Plan in place for security breaches

## Monitoring and Alerts

Set up monitoring for:
- Failed login attempts (spike indicates attack)
- OAuth errors (provider issues or misconfiguration)
- Session creation rate (unusual activity)
- Account disconnections (potential compromise)
- API response times (degradation or DoS)

## Compliance Considerations

### GDPR
- User data can be exported and deleted
- Clear privacy policy and consent
- Data processing logged and auditable

### OAuth Provider Terms
- Follow Google and GitHub OAuth policies
- Don't misuse access tokens or user data
- Respect rate limits and quotas

### Data Retention
- Session tokens expire after 7 days
- Audit logs retained for 90 days
- Deleted user data purged after 30 days

## Contact

For security issues, please email: security@forge.example.com

**Do not** create public GitHub issues for security vulnerabilities.
