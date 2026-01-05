# Waiting List & Mass Email System - Setup Guide

## 📋 Overview

This system allows you to:
1. Collect email addresses for a "coming soon" waiting list
2. Send mass emails to waiting list subscribers
3. Send mass emails to all registered users
4. Track email campaigns and delivery status

---

## 🗄️ Database Setup

### Step 1: Run the Migration

Connect to your Railway PostgreSQL database and run:

```bash
psql $DATABASE_URL -f backend/scripts/create-waitlist-tables.sql
```

Or manually execute the SQL in `backend/scripts/create-waitlist-tables.sql`.

This creates:
- `waiting_list` table - Stores email addresses
- `email_campaigns` table - Tracks mass email campaigns
- `email_campaign_recipients` table - Tracks individual email sends

---

## 🎨 Frontend Pages

### Coming Soon Page
- **Route**: `/coming-soon`
- **File**: `app/coming-soon/page.tsx`
- **Purpose**: Public page where visitors can join the waiting list

### Admin Email Campaigns Page
- **Route**: `/admin/email-campaigns`
- **File**: `app/admin/email-campaigns/page.tsx`
- **Purpose**: Admin interface for managing waiting list and sending emails
- **Access**: Requires Enterprise tier or `is_admin` flag

---

## 🔌 API Endpoints

### Waiting List Endpoints

#### `POST /api/waitlist`
Add email to waiting list (public)

**Request:**
```json
{
  "email": "user@example.com",
  "name": "John Doe",  // optional
  "source": "website"  // optional
}
```

**Response:**
```json
{
  "message": "Successfully added to waiting list!",
  "position": 42,
  "email": "user@example.com"
}
```

#### `GET /api/waitlist`
Get waiting list (admin only)

**Query Parameters:**
- `page` - Page number (default: 1)
- `limit` - Items per page (default: 50)
- `search` - Search by email or name

#### `GET /api/waitlist/stats`
Get waiting list statistics (admin only)

**Response:**
```json
{
  "total": 150,
  "notified": 50,
  "notNotified": 100,
  "today": 5,
  "thisWeek": 25
}
```

#### `POST /api/waitlist/send-email`
Send mass email to waiting list (admin only)

**Request:**
```json
{
  "subject": "We're Launching Soon!",
  "htmlContent": "<html><body>Hi {name}, ...</body></html>",
  "textContent": "Hi {name}, ...",  // optional
  "onlyNotNotified": false  // optional, default: false
}
```

**Placeholders:**
- `{name}` - Replaced with user's name (or "there" if not provided)
- `{email}` - Replaced with user's email

### Email Campaigns Endpoints

#### `POST /api/email-campaigns/send-to-all`
Send mass email to all users (admin only)

**Request:**
```json
{
  "subject": "Important Update",
  "htmlContent": "<html><body>Hi {username}, ...</body></html>",
  "textContent": "Hi {username}, ...",  // optional
  "userFilter": {  // optional
    "tier": "pro",  // "free", "pro", "studio", "enterprise"
    "emailVerified": true  // boolean
  }
}
```

**Placeholders:**
- `{username}` - Replaced with user's username (or "there" if not available)
- `{email}` - Replaced with user's email

#### `GET /api/email-campaigns`
Get all email campaigns (admin only)

**Query Parameters:**
- `page` - Page number (default: 1)
- `limit` - Items per page (default: 20)

#### `GET /api/email-campaigns/:id`
Get campaign details with recipient list (admin only)

---

## 🔐 Admin Access

To access admin features, a user must have:
- **Enterprise tier** (`tier = 'enterprise'`), OR
- **Admin flag** (`is_admin = true` in users table)

### Grant Admin Access

```sql
-- Option 1: Set tier to enterprise
UPDATE users SET tier = 'enterprise' WHERE username = 'your-username';

-- Option 2: Add is_admin column and set flag
ALTER TABLE users ADD COLUMN IF NOT EXISTS is_admin BOOLEAN DEFAULT false;
UPDATE users SET is_admin = true WHERE username = 'your-username';
```

---

## 📧 Email Templates

### Example: Launch Announcement

**HTML:**
```html
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .button { display: inline-block; padding: 12px 30px; background: #3b82f6; color: white; text-decoration: none; border-radius: 5px; }
  </style>
</head>
<body>
  <div class="container">
    <h1>We're Launching Soon!</h1>
    <p>Hi {name},</p>
    <p>Thank you for joining our waiting list! We're excited to announce that BlueprintCAD will be launching soon.</p>
    <p>As one of our early supporters, you'll get exclusive early access.</p>
    <a href="https://www.blueprintcad.io" class="button">Get Early Access</a>
    <p>Best regards,<br>The BlueprintCAD Team</p>
  </div>
</body>
</html>
```

**Text:**
```
Hi {name},

Thank you for joining our waiting list! We're excited to announce that BlueprintCAD will be launching soon.

As one of our early supporters, you'll get exclusive early access.

Visit: https://www.blueprintcad.io

Best regards,
The BlueprintCAD Team
```

---

## 🚀 Usage Workflow

### 1. Set Up Coming Soon Page

1. Update your homepage (`app/page.tsx`) to redirect to `/coming-soon` if needed
2. Or link to `/coming-soon` from your main navigation

### 2. Collect Emails

- Users visit `/coming-soon`
- Enter email and optionally name
- Automatically added to waiting list with position number

### 3. Send Launch Email

1. Go to `/admin/email-campaigns`
2. Click "Send Mass Email"
3. Select "Waiting List" tab
4. Fill in subject and HTML content
5. Optionally check "Only send to users who haven't been notified yet"
6. Click "Send Email"

### 4. Send Updates to All Users

1. Go to `/admin/email-campaigns`
2. Click "Send Mass Email"
3. Select "All Users" tab
4. Fill in subject and HTML content
5. Optionally filter by tier or email verification status
6. Click "Send Email"

### 5. Monitor Campaigns

- View all campaigns in the "Recent Campaigns" section
- See status (draft, sending, completed, failed)
- Track sent/failed counts
- View individual recipient status via campaign details

---

## 📊 Campaign Status

- **draft** - Campaign created but not started
- **sending** - Emails are being sent
- **completed** - All emails sent (successful or failed)
- **failed** - Campaign failed to start

### Recipient Status

- **pending** - Not yet sent
- **sent** - Successfully sent
- **failed** - Failed to send
- **bounced** - Email bounced

---

## ⚠️ Important Notes

1. **Rate Limiting**: Emails are sent with a 100ms delay between each to avoid overwhelming your SMTP server
2. **Async Processing**: Email sending happens asynchronously - the API returns immediately while emails are sent in the background
3. **Error Handling**: Failed emails are logged in `email_campaign_recipients` table with error messages
4. **SMTP Configuration**: Ensure your SMTP settings are configured in Railway environment variables
5. **Email Limits**: Check your SMTP provider's rate limits (e.g., Gmail: 500/day, SendGrid: varies by plan)

---

## 🔧 Troubleshooting

### Emails Not Sending

1. Check SMTP configuration in Railway:
   - `SMTP_HOST`
   - `SMTP_PORT`
   - `SMTP_USER`
   - `SMTP_PASS`

2. Check email service logs in Railway dashboard

3. Verify campaign status in admin panel

4. Check `email_campaign_recipients` table for error messages

### Admin Access Denied

1. Verify user tier is "enterprise" OR `is_admin = true`
2. Check JWT token is valid
3. Ensure user is logged in

### Database Errors

1. Verify migration script ran successfully
2. Check table exists: `SELECT * FROM waiting_list LIMIT 1;`
3. Check column names match (PostgreSQL is case-sensitive for quoted identifiers)

---

## 📝 Example cURL Commands

### Add to Waiting List
```bash
curl -X POST https://your-api.railway.app/api/waitlist \
  -H "Content-Type: application/json" \
  -d '{"email": "user@example.com", "name": "John Doe"}'
```

### Send Email to Waiting List (Admin)
```bash
curl -X POST https://your-api.railway.app/api/waitlist/send-email \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "subject": "We'\''re Launching!",
    "htmlContent": "<html><body>Hi {name}, we'\''re launching!</body></html>",
    "onlyNotNotified": true
  }'
```

---

## 🎯 Next Steps

1. Run database migration
2. Test coming soon page at `/coming-soon`
3. Grant yourself admin access
4. Test sending a campaign to yourself
5. Monitor campaign status
6. Launch! 🚀

