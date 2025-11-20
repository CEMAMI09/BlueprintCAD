# OAuth Authentication Setup Guide

## Overview

Forge now supports Google and GitHub OAuth authentication alongside traditional email/password login. Users can:
- Sign in with Google or GitHub
- Link multiple OAuth providers to existing accounts
- Disconnect providers (if they have another auth method)
- See connected providers on their profile

## Setup Instructions

### 1. Database Migration

Run the migration script to add OAuth support to the database:

```bash
node scripts/add-oauth-support.js
```

This adds:
- `oauth_google_id`, `oauth_github_id`, `oauth_providers` columns to `users` table
- `accounts` table for storing OAuth tokens and provider info
- `sessions` table for NextAuth session management
- `verification_tokens` table for email verification
- Makes `password` column nullable (for OAuth-only users)

### 2. Environment Variables

Add the following to your `.env.local` file:

```bash
# NextAuth Configuration (Required)
NEXTAUTH_SECRET=your-nextauth-secret-generate-with-openssl-rand-base64-32
NEXTAUTH_URL=http://localhost:3000

# Google OAuth (Optional - for Google sign-in)
GOOGLE_CLIENT_ID=your-google-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-google-client-secret

# GitHub OAuth (Optional - for GitHub sign-in)
GITHUB_CLIENT_ID=your-github-client-id
GITHUB_CLIENT_SECRET=your-github-client-secret
```

#### Generate NEXTAUTH_SECRET

```bash
openssl rand -base64 32
```

### 3. Google OAuth Setup

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing
3. Enable Google+ API
4. Go to **Credentials** → **Create Credentials** → **OAuth 2.0 Client ID**
5. Configure OAuth consent screen:
   - User Type: External
   - App name: Forge
   - User support email: your-email@example.com
   - Developer contact: your-email@example.com
6. Create OAuth Client ID:
   - Application type: Web application
   - Name: Forge Web Client
   - Authorized JavaScript origins: `http://localhost:3000`
   - Authorized redirect URIs: `http://localhost:3000/api/auth/callback/google`
7. Copy **Client ID** and **Client Secret** to `.env.local`

For production, add your production domain to authorized origins and redirect URIs.

### 4. GitHub OAuth Setup

1. Go to [GitHub Settings](https://github.com/settings/developers)
2. Click **OAuth Apps** → **New OAuth App**
3. Fill in details:
   - Application name: Forge
   - Homepage URL: `http://localhost:3000`
   - Authorization callback URL: `http://localhost:3000/api/auth/callback/github`
4. Click **Register application**
5. Generate a client secret
6. Copy **Client ID** and **Client Secret** to `.env.local`

For production, create a separate OAuth app with your production domain.

## Features

### User Authentication Flow

#### New User Sign-up with OAuth
1. User clicks "Continue with Google" or "Continue with GitHub"
2. User authenticates with OAuth provider
3. System creates new user account with:
   - Username generated from email (e.g., `user@gmail.com` → `user`)
   - Profile picture from OAuth provider
   - No password (OAuth-only authentication)
   - Provider ID stored in database

#### Existing User Sign-in with OAuth
1. User clicks OAuth button
2. System checks if email matches existing account
3. If match found:
   - Links OAuth provider to existing account
   - Updates `oauth_providers` array
   - Maintains existing user data
4. User can now sign in with either password or OAuth

#### Account Linking
- Users can link multiple OAuth providers to one account
- Each provider can only be linked to one account (prevents duplicates)
- System prevents duplicate users by checking email before creating new accounts

### Security Features

#### CSRF Protection
- NextAuth provides built-in CSRF protection
- Uses secure, httpOnly cookies for session management
- Validates state parameter during OAuth flow

#### Token Storage
- OAuth tokens stored in `accounts` table
- Access tokens, refresh tokens, and expiry times tracked
- Session tokens use secure random generation
- All sensitive data encrypted in database

#### Session Management
- JWT-based sessions (7-day expiry)
- Compatible with existing token-based system
- Automatic session refresh on activity
- Secure logout across all devices

#### Account Disconnection Safety
- Prevents disconnecting last auth method
- Requires password set before disconnecting only OAuth provider
- Validates user ownership before disconnection
- Transaction-based updates for data consistency

### API Routes

#### `GET /api/auth/providers`
Returns user's connected OAuth providers.

**Response:**
```json
{
  "providers": {
    "google": {
      "connected": true,
      "accountId": "123456789",
      "connectedAt": "2024-01-15T10:30:00Z"
    },
    "github": {
      "connected": false
    }
  }
}
```

#### `POST /api/auth/disconnect`
Disconnects an OAuth provider from user's account.

**Request:**
```json
{
  "provider": "google" | "github"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Google account disconnected successfully"
}
```

**Error (last auth method):**
```json
{
  "error": "Cannot disconnect your only authentication method. Please set a password first."
}
```

### UI Components

#### Login Page (`/app/login/page.tsx`)
- OAuth buttons for Google and GitHub
- Email/password form as fallback
- Proper error handling and loading states
- Responsive design

#### OAuth Callback (`/app/auth/callback/page.tsx`)
- Handles OAuth redirect after authentication
- Syncs NextAuth session with existing localStorage system
- Shows loading state during processing
- Error handling with user-friendly messages

#### Account Settings (`/app/settings/account/page.tsx`)
- View all connected providers
- Connect new providers
- Disconnect existing providers
- Security warnings and guidance

#### Profile Page (`/app/profile/[username]/page.tsx`)
- Shows OAuth provider badges
- Displays which providers user signed up with
- Public visibility (no sensitive data exposed)

## Database Schema

### Users Table
```sql
CREATE TABLE users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT UNIQUE NOT NULL,
  email TEXT UNIQUE NOT NULL,
  password TEXT,  -- Now nullable for OAuth-only users
  oauth_google_id TEXT UNIQUE,
  oauth_github_id TEXT UNIQUE,
  oauth_providers TEXT DEFAULT '[]',  -- JSON array
  -- ... other fields
);
```

### Accounts Table (NextAuth)
```sql
CREATE TABLE accounts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  type TEXT NOT NULL,
  provider TEXT NOT NULL,
  provider_account_id TEXT NOT NULL,
  refresh_token TEXT,
  access_token TEXT,
  expires_at INTEGER,
  token_type TEXT,
  scope TEXT,
  id_token TEXT,
  session_state TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(provider, provider_account_id),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
```

### Sessions Table (NextAuth)
```sql
CREATE TABLE sessions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  session_token TEXT NOT NULL UNIQUE,
  user_id INTEGER NOT NULL,
  expires DATETIME NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
```

## Compatibility with Existing System

### Token-Based Authentication
- NextAuth generates custom JWT tokens compatible with existing system
- Stored in session as `forgeToken`
- Automatically synced to localStorage on OAuth callback
- Existing API routes continue to work without changes

### User Data Structure
- OAuth users have same data structure as password users
- Profile pictures from OAuth providers stored in `profile_picture` field
- Usernames auto-generated but can be changed later
- All existing features (projects, comments, follows) work identically

### Migration Path
- Existing users can add OAuth to their accounts
- No data loss or account merging required
- OAuth-only users can set password later for full compatibility

## Testing

### Test OAuth Flow
1. Start dev server: `npm run dev`
2. Navigate to `http://localhost:3000/login`
3. Click "Continue with Google" or "Continue with GitHub"
4. Authenticate with provider
5. Verify redirect to home page
6. Check localStorage for token and user data
7. Navigate to `/settings/account` to verify provider connection

### Test Account Linking
1. Create account with email/password
2. Sign in normally
3. Go to `/settings/account`
4. Click "Connect" on Google or GitHub
5. Authenticate with OAuth provider
6. Verify provider appears as connected
7. Sign out and sign back in using OAuth

### Test Disconnect
1. Connect multiple providers to one account
2. Go to `/settings/account`
3. Try to disconnect a provider
4. Verify it disconnects successfully
5. Try to disconnect last provider with no password
6. Verify error message appears

## Production Deployment

### Update Environment Variables
1. Generate new `NEXTAUTH_SECRET` for production
2. Update `NEXTAUTH_URL` to production domain
3. Update OAuth redirect URIs in Google/GitHub apps
4. Use environment-specific secrets

### Security Checklist
- ✅ HTTPS enabled on production domain
- ✅ Secure cookies configuration
- ✅ CORS properly configured
- ✅ Rate limiting on auth endpoints
- ✅ Database backups enabled
- ✅ Error messages don't leak sensitive info
- ✅ OAuth apps use production credentials
- ✅ Session expiry appropriate for use case

## Troubleshooting

### "Configuration Error" on OAuth
- Check `NEXTAUTH_SECRET` is set in `.env.local`
- Verify `NEXTAUTH_URL` matches your domain
- Ensure OAuth provider credentials are correct

### "Redirect URI Mismatch"
- Verify redirect URI in OAuth app settings
- Should be: `{NEXTAUTH_URL}/api/auth/callback/{provider}`
- Check for trailing slashes or HTTP vs HTTPS

### "Cannot Disconnect Provider"
- User must have at least one auth method
- Check if password is set: `SELECT password FROM users WHERE id = ?`
- If no password, user must set one first

### Session Not Persisting
- Check if `SessionProvider` wraps app in `layout.tsx`
- Verify NextAuth configuration in `[...nextauth].js`
- Check browser cookies are enabled

### Profile Not Showing OAuth Badges
- Verify `oauth_providers` column exists in database
- Check API route returns parsed JSON array
- Inspect browser console for errors

## Future Enhancements

- [ ] Add more OAuth providers (Twitter, Discord, Microsoft)
- [ ] Implement OAuth token refresh logic
- [ ] Add 2FA for OAuth accounts
- [ ] Allow users to set primary auth method
- [ ] Add OAuth connection activity log
- [ ] Implement granular OAuth scopes
- [ ] Add OAuth account picker for multiple accounts
- [ ] Implement passwordless email magic links

## Support

For issues or questions:
1. Check logs: `console.log` statements in callback handlers
2. Verify database schema: `node -e "require('sqlite3').Database('./forge.db', db => { db.all('PRAGMA table_info(accounts)', console.log); })"`
3. Test with different browsers/incognito mode
4. Check OAuth provider status pages
