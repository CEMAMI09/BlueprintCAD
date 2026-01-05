# SMTP Connection Timeout - Troubleshooting Guide

## Error: Connection Timeout (ETIMEDOUT)

This means Railway can't connect to the SMTP server. Here's how to fix it:

---

## ✅ Solution 1: Verify SendGrid SMTP Settings

Make sure your Railway variables are exactly:

```
SMTP_HOST=smtp.sendgrid.net
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=apikey
SMTP_PASS=SG.your-actual-api-key-here
SMTP_FROM=noreply@blueprintcad.io
SMTP_FROM_NAME=Blueprint
```

**Important:**
- `SMTP_USER` must be the literal word `apikey` (not your email)
- `SMTP_PASS` must be your SendGrid API key (starts with `SG.`)
- No spaces or extra characters

---

## ✅ Solution 2: Check SendGrid API Key

1. Go to SendGrid → Settings → API Keys
2. Make sure your API key has **"Mail Send"** permissions
3. If it's restricted, it might not work
4. Try creating a new API key with **Full Access** (for testing)

---

## ✅ Solution 3: Use SendGrid API Instead of SMTP

If SMTP keeps timing out, you can use SendGrid's REST API instead (more reliable):

### Option A: Keep SMTP (Current Setup)
- Already configured
- Just need to fix connection issues

### Option B: Switch to SendGrid API (More Reliable)
- Uses HTTP instead of SMTP
- Better for cloud platforms like Railway
- Requires code changes

---

## ✅ Solution 4: Check Railway Network

Railway should allow outbound SMTP connections, but verify:

1. Check Railway service logs for network errors
2. Try a different SMTP port (465 with SSL instead of 587)
3. Contact Railway support if outbound SMTP is blocked

---

## ✅ Solution 5: Test with Different SMTP Settings

Try these alternative SendGrid SMTP settings:

### Option 1: Port 465 with SSL
```
SMTP_HOST=smtp.sendgrid.net
SMTP_PORT=465
SMTP_SECURE=true
SMTP_USER=apikey
SMTP_PASS=SG.your-api-key
```

### Option 2: Port 2525 (Alternative)
```
SMTP_HOST=smtp.sendgrid.net
SMTP_PORT=2525
SMTP_SECURE=false
SMTP_USER=apikey
SMTP_PASS=SG.your-api-key
```

---

## ✅ Solution 6: Verify Domain in SendGrid

1. Go to SendGrid → Settings → Sender Authentication
2. Make sure your domain (`blueprintcad.io`) is verified
3. All DNS records must be validated (green checkmarks)
4. If not verified, emails may be rejected

---

## Quick Test

Run this in Railway logs or via the test endpoint:

1. Go to `/admin/email-campaigns`
2. Click "Test Email Config"
3. Check the error message

Or check Railway logs for:
- `[Email] Creating SMTP transporter:` - Shows your config
- `[Email] SMTP connection verification failed:` - Shows the error

---

## Most Common Fix

**99% of the time, it's one of these:**

1. **Wrong SMTP_USER**: Must be `apikey` (literal word), not your email
2. **Wrong SMTP_PASS**: Must be the full API key starting with `SG.`
3. **Domain not verified**: SendGrid requires domain verification
4. **API key permissions**: Must have "Mail Send" permission

---

## Still Not Working?

1. **Check Railway logs** for the exact error
2. **Verify API key** in SendGrid dashboard
3. **Test with Gmail** first (easier to set up) to confirm SMTP works
4. **Contact SendGrid support** if domain verification is the issue

---

## Alternative: Use Gmail for Testing

If SendGrid is too complex, test with Gmail first:

```
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
SMTP_FROM=your-email@gmail.com
SMTP_FROM_NAME=Blueprint
```

Once Gmail works, you know SMTP is configured correctly, then switch back to SendGrid.

