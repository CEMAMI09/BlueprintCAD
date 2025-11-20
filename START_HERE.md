# 🚀 START HERE - Get OAuth Working Now

## Copy-Paste Setup (2 Minutes)

### Step 1: Run Migration
```bash
node scripts/add-oauth-support.js
```

### Step 2: Generate Secret
**Windows (PowerShell):**
```powershell
[Convert]::ToBase64String((1..32|%{Get-Random -Max 256}))
```

**Mac/Linux:**
```bash
openssl rand -base64 32
```

### Step 3: Create `.env.local`
Create this file in the project root:

```bash
# Copy your existing values
JWT_SECRET=your-existing-secret

# Add these new values (required)
NEXTAUTH_SECRET=paste-the-secret-you-generated-above
NEXTAUTH_URL=http://localhost:3000

# OAuth providers (optional - leave blank for now)
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
GITHUB_CLIENT_ID=
GITHUB_CLIENT_SECRET=
```

### Step 4: Start Server
```bash
npm run dev
```

### Step 5: Test It
1. Go to http://localhost:3000/login
2. You'll see Google and GitHub buttons (they won't work yet without credentials)
3. Email/password login still works normally
4. ✅ You're done! OAuth infrastructure is ready

## What Just Happened?

✅ Database updated with OAuth tables
✅ NextAuth configured and ready
✅ Login page has OAuth buttons
✅ Settings page can manage providers
✅ Profile page shows OAuth badges
✅ All security features active

## Want to Enable Google/GitHub?

### Quick OAuth Setup

#### Google (5 minutes)
1. Visit https://console.cloud.google.com/
2. Create project (any name)
3. APIs & Services → Credentials → Create OAuth Client
4. Add redirect: `http://localhost:3000/api/auth/callback/google`
5. Copy Client ID and Secret to `.env.local`
6. Restart server

#### GitHub (3 minutes)
1. Visit https://github.com/settings/developers
2. New OAuth App
3. Callback: `http://localhost:3000/api/auth/callback/github`
4. Copy Client ID and Secret to `.env.local`
5. Restart server

## Test OAuth Flow

After adding credentials:

1. Sign out (if logged in)
2. Click "Continue with Google" or "Continue with GitHub"
3. Authenticate with provider
4. You're signed in! 🎉

## Verify Everything Works

Quick test:
- [ ] Login page shows OAuth buttons
- [ ] Can sign in with email/password
- [ ] Can sign in with OAuth (if credentials added)
- [ ] Profile shows OAuth badge
- [ ] Settings → Account shows providers
- [ ] Can disconnect provider (if have password)

## Common Issues

### "Configuration" Error
- Make sure `.env.local` exists in project root
- Check `NEXTAUTH_SECRET` is set
- Restart the dev server

### OAuth Buttons Don't Work
- That's normal if you haven't added Google/GitHub credentials yet
- Email/password still works
- Add credentials when you're ready

### Migration Failed
- Check if `forge.db` file exists
- Try: `rm forge.db` then run `npm run dev` to recreate
- Then run migration again

## What's Next?

### For Testing (no OAuth credentials needed)
- Everything works with email/password
- OAuth infrastructure is ready
- Add credentials later when needed

### For Full OAuth Setup
- Read: `docs/OAUTH_SETUP.md`
- Set up Google and/or GitHub OAuth apps
- Add credentials to `.env.local`

### For Production
- Read: `docs/OAUTH_IMPLEMENTATION.md`
- Set up production OAuth apps
- Update `NEXTAUTH_URL` to production domain

## Need More Help?

📚 Full Documentation:
- `docs/QUICKSTART.md` - 5-minute guide
- `docs/OAUTH_SETUP.md` - Complete setup (180 lines)
- `docs/SECURITY.md` - Security best practices
- `docs/OAUTH_IMPLEMENTATION.md` - Technical details

## That's It!

You now have a complete OAuth system:
- ✅ Google OAuth ready
- ✅ GitHub OAuth ready
- ✅ Account linking
- ✅ Provider management
- ✅ Security features
- ✅ Compatible with existing system

**Start testing!** 🚀

---

**Time to complete**: 2-5 minutes
**Difficulty**: Easy (just copy-paste)
**Works without OAuth credentials**: Yes ✅
