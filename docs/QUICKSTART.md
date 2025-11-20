# Quick Start: OAuth Authentication

## Get Started in 5 Minutes

### 1. Run Database Migration
```bash
node scripts/add-oauth-support.js
```

### 2. Generate NextAuth Secret
```bash
openssl rand -base64 32
```

### 3. Add to `.env.local`
```bash
# Required
NEXTAUTH_SECRET=<paste-generated-secret>
NEXTAUTH_URL=http://localhost:3000
JWT_SECRET=your-existing-jwt-secret

# Optional (for testing without OAuth providers)
# Leave these blank to test with email/password only
```

### 4. Start Development Server
```bash
npm run dev
```

### 5. Test Basic Functionality
1. Navigate to http://localhost:3000/login
2. OAuth buttons will show but won't work yet (no provider credentials)
3. Email/password login still works normally

## Enable OAuth Providers (Optional)

### For Google OAuth
1. Visit: https://console.cloud.google.com/
2. Create project → Enable Google+ API
3. Create OAuth 2.0 Client ID
4. Add redirect URI: `http://localhost:3000/api/auth/callback/google`
5. Add to `.env.local`:
```bash
GOOGLE_CLIENT_ID=your-client-id
GOOGLE_CLIENT_SECRET=your-client-secret
```

### For GitHub OAuth
1. Visit: https://github.com/settings/developers
2. New OAuth App
3. Callback URL: `http://localhost:3000/api/auth/callback/github`
4. Add to `.env.local`:
```bash
GITHUB_CLIENT_ID=your-client-id
GITHUB_CLIENT_SECRET=your-client-secret
```

### 6. Restart Server
```bash
# Stop server (Ctrl+C)
npm run dev
```

## Test OAuth Flow

### Create New User
1. Click "Continue with Google" or "Continue with GitHub"
2. Authenticate with provider
3. Should redirect to home page
4. Check profile page - OAuth badge should appear

### Link Existing Account
1. Sign in with email/password
2. Go to Settings → Account (`/settings/account`)
3. Click "Connect" on Google or GitHub
4. Authenticate
5. Provider should show as "Connected"

### Disconnect Provider
1. Go to Settings → Account
2. Click "Disconnect" on a provider
3. Confirm in dialog
4. Provider disconnects (if you have another auth method)

## Verify Everything Works

Run through this checklist:

- [ ] Can create account with email/password
- [ ] Can create account with Google OAuth
- [ ] Can create account with GitHub OAuth
- [ ] Can link Google to existing account
- [ ] Can link GitHub to existing account
- [ ] OAuth badges show on profile page
- [ ] Can disconnect provider (with another auth method)
- [ ] Cannot disconnect last auth method
- [ ] Session persists across page refreshes
- [ ] Can sign out properly
- [ ] Can sign back in with any linked method

## Troubleshooting

### "Configuration" error
- Check `NEXTAUTH_SECRET` is set in `.env.local`
- Make sure `.env.local` is in project root

### OAuth buttons don't appear
- Verify AuthProvider wraps app in `app/layout.tsx`
- Check browser console for errors
- Ensure imports are correct

### "Redirect URI mismatch"
- Verify callback URL in OAuth app settings
- Should be: `http://localhost:3000/api/auth/callback/google`
- Check for typos, trailing slashes, HTTP vs HTTPS

### Session not persisting
- Clear browser cookies and localStorage
- Check if SessionProvider is wrapping the app
- Verify NEXTAUTH_SECRET is set

### Database errors
- Run migration again: `node scripts/add-oauth-support.js`
- Check `forge.db` file exists
- Verify tables were created: `sqlite3 forge.db ".tables"`

## Next Steps

Once OAuth is working:

1. **Read Full Documentation**: See `docs/OAUTH_SETUP.md`
2. **Review Security**: Read `docs/SECURITY.md`
3. **Set Up Production**: Configure production OAuth apps
4. **Add Rate Limiting**: Implement from security docs
5. **Enable Email Notifications**: Alert users of account changes

## File Structure

Key files created/modified:

```
forge/
├── pages/api/auth/
│   ├── [...nextauth].js          # NextAuth configuration
│   ├── providers.js               # Get connected providers
│   └── disconnect.js              # Disconnect provider
├── app/
│   ├── auth/callback/page.tsx     # OAuth callback handler
│   ├── login/page.tsx             # Updated with OAuth buttons
│   ├── settings/account/page.tsx  # Manage providers
│   ├── profile/[username]/page.tsx # Shows OAuth badges
│   └── providers/AuthProvider.tsx # SessionProvider wrapper
├── scripts/
│   └── add-oauth-support.js       # Database migration
├── types/
│   └── next-auth.d.ts             # TypeScript definitions
└── docs/
    ├── OAUTH_SETUP.md             # Full documentation
    ├── SECURITY.md                # Security best practices
    └── QUICKSTART.md              # This file
```

## Support

Need help? Check:
1. Full documentation: `docs/OAUTH_SETUP.md`
2. Security guide: `docs/SECURITY.md`
3. NextAuth docs: https://next-auth.js.org
4. GitHub issues for common problems

Happy coding! 🚀
