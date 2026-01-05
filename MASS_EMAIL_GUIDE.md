# How to Mass Email Waitlisted Users

## Quick Start Guide

### Step 1: Grant Yourself Admin Access

First, you need admin access to use the email campaign system. Run this SQL command:

```sql
UPDATE users SET is_admin = true WHERE username = 'your-username';
```

Or if you prefer using the Railway CLI or a script, I can create one for you.

### Step 2: Access the Admin Email Campaigns Page

1. Log in to your account
2. Navigate to: `/admin/email-campaigns`
3. You should see the email campaigns interface

### Step 3: Send Email to Waiting List

1. **Click "Send Mass Email"** button
2. **Select "Waiting List" tab** (should be selected by default)
3. **Fill in the email form:**
   - **Subject**: Enter your email subject (e.g., "We're Launching Soon!")
   - **HTML Content**: Enter your HTML email template
   - **Plain Text Content** (optional): Enter a plain text version
   - **Only send to users who haven't been notified yet**: Check this if you only want to email new signups

4. **Click "Send Email"**

The system will:
- Create a campaign record
- Start sending emails asynchronously (won't block the page)
- Show you the campaign status
- Track sent/failed counts

---

## Email Template Examples

### Example 1: Launch Announcement

**Subject:**
```
We're Launching Soon! 🚀
```

**HTML Content:**
```html
<!DOCTYPE html>
<html>
<head>
  <style>
    body { 
      font-family: Arial, sans-serif; 
      line-height: 1.6; 
      color: #333; 
      max-width: 600px; 
      margin: 0 auto; 
      padding: 20px; 
    }
    .header { 
      background: linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%); 
      color: white; 
      padding: 30px; 
      text-align: center; 
      border-radius: 8px 8px 0 0; 
    }
    .content { 
      background: #f9f9f9; 
      padding: 30px; 
      border-radius: 0 0 8px 8px; 
    }
    .button { 
      display: inline-block; 
      padding: 12px 30px; 
      background: #3b82f6; 
      color: white; 
      text-decoration: none; 
      border-radius: 5px; 
      margin: 20px 0; 
    }
    .footer { 
      text-align: center; 
      color: #666; 
      font-size: 12px; 
      margin-top: 20px; 
    }
  </style>
</head>
<body>
  <div class="header">
    <h1>🚀 We're Launching Soon!</h1>
  </div>
  <div class="content">
    <p>Hi <strong>{name}</strong>,</p>
    
    <p>Thank you for joining the BlueprintCAD waiting list! We're excited to announce that we'll be launching very soon.</p>
    
    <p>As one of our early supporters, you'll get:</p>
    <ul>
      <li>Exclusive early access</li>
      <li>Special launch pricing</li>
      <li>Priority support</li>
    </ul>
    
    <div style="text-align: center;">
      <a href="https://www.blueprintcad.io" class="button">Get Early Access</a>
    </div>
    
    <p>We'll send you another email when we're ready to launch. Stay tuned!</p>
    
    <p>Best regards,<br>The BlueprintCAD Team</p>
  </div>
  <div class="footer">
    <p>© 2024 BlueprintCAD. All rights reserved.</p>
    <p>You're receiving this because you signed up for our waiting list.</p>
  </div>
</body>
</html>
```

**Plain Text Content:**
```
Hi {name},

Thank you for joining the BlueprintCAD waiting list! We're excited to announce that we'll be launching very soon.

As one of our early supporters, you'll get:
- Exclusive early access
- Special launch pricing
- Priority support

Visit: https://www.blueprintcad.io

We'll send you another email when we're ready to launch. Stay tuned!

Best regards,
The BlueprintCAD Team

---
© 2024 BlueprintCAD. All rights reserved.
You're receiving this because you signed up for our waiting list.
```

### Example 2: Beta Access Invitation

**Subject:**
```
You're Invited: BlueprintCAD Beta Access
```

**HTML Content:**
```html
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: #1a1a1a; color: white; padding: 30px; text-align: center; }
    .content { background: #f9f9f9; padding: 30px; }
    .button { display: inline-block; padding: 12px 30px; background: #3b82f6; color: white; text-decoration: none; border-radius: 5px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>🎉 You're Invited!</h1>
    </div>
    <div class="content">
      <p>Hi {name},</p>
      
      <p>Great news! BlueprintCAD is now in beta, and you're invited to try it out.</p>
      
      <p>Your beta access code: <strong>BETA2024</strong></p>
      
      <div style="text-align: center; margin: 30px 0;">
        <a href="https://www.blueprintcad.io/register?code=BETA2024" class="button">Claim Your Beta Access</a>
      </div>
      
      <p>What to expect:</p>
      <ul>
        <li>Full access to all features</li>
        <li>Your feedback helps shape the product</li>
        <li>Free during beta period</li>
      </ul>
      
      <p>We can't wait to see what you create!</p>
      
      <p>Best,<br>The BlueprintCAD Team</p>
    </div>
  </div>
</body>
</html>
```

---

## Personalization Placeholders

You can use these placeholders in your email templates:

- `{name}` - User's name (or "there" if not provided)
- `{email}` - User's email address

**Example:**
```html
<p>Hi {name},</p>
<p>We sent this to {email} because you joined our waiting list.</p>
```

---

## Monitoring Your Campaign

After sending an email:

1. **View Campaign Status**: The campaign will appear in the "Recent Campaigns" section
2. **Check Progress**: 
   - Status: `sending` → `completed`
   - Sent count: Number of successful sends
   - Failed count: Number of failed sends
3. **View Details**: Click on a campaign to see individual recipient status

---

## Tips & Best Practices

1. **Test First**: Send a test email to yourself before mass sending
2. **Use HTML + Text**: Always provide both HTML and plain text versions
3. **Personalize**: Use `{name}` to make emails feel personal
4. **Clear Subject**: Make your subject line compelling and clear
5. **Mobile-Friendly**: Keep email width under 600px
6. **Call to Action**: Include a clear button or link
7. **Unsubscribe**: Consider adding unsubscribe info (for future compliance)

---

## Troubleshooting

### Can't Access Admin Page

**Problem**: Getting redirected or "Admin access required" error

**Solution**: 
1. Make sure you're logged in
2. Grant admin access:
   ```sql
   UPDATE users SET is_admin = true WHERE username = 'your-username';
   ```
3. Refresh the page

### Emails Not Sending

**Problem**: Campaign shows "failed" or emails not being delivered

**Solution**:
1. Check SMTP configuration in Railway:
   - `SMTP_HOST`
   - `SMTP_PORT`
   - `SMTP_USER`
   - `SMTP_PASS`
2. Check Railway logs for email errors
3. Verify your email service limits (Gmail: 500/day, SendGrid: varies)

### Campaign Stuck on "Sending"

**Problem**: Campaign status stays on "sending"

**Solution**:
- This is normal for large lists - emails are sent asynchronously
- Check back in a few minutes
- Large lists (1000+) may take 10-20 minutes

---

## Alternative: Use API Directly

If you prefer using the API directly (e.g., from Postman or a script):

```bash
curl -X POST https://your-api.railway.app/api/waitlist/send-email \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "subject": "We'\''re Launching Soon!",
    "htmlContent": "<html><body>Hi {name}, we'\''re launching!</body></html>",
    "textContent": "Hi {name}, we'\''re launching!",
    "onlyNotNotified": false
  }'
```

---

## Quick Reference

**Admin Page**: `/admin/email-campaigns`  
**Waiting List Stats**: Shows total, notified, not notified, today, this week  
**Send Email**: Click "Send Mass Email" → Fill form → Click "Send Email"  
**Password**: `thorbeans1` (for site access)

---

Need help? Check the `WAITLIST_SETUP.md` file for more detailed documentation.

