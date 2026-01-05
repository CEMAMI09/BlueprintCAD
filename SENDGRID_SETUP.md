# SendGrid Configuration for BlueprintCAD

## Your SendGrid Setup

- **Verified Domain**: `em554.blueprintcad.io`
- **Branding Link**: `url2750.blueprintcad.io`

## Railway Environment Variables

Set these in your Railway backend service:

```
SMTP_HOST=smtp.sendgrid.net
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=apikey
SMTP_PASS=SG.your-sendgrid-api-key-here
SMTP_FROM=noreply@em554.blueprintcad.io
SMTP_FROM_NAME=Blueprint
```

**Important Notes:**

1. **SMTP_USER** must be the literal word `apikey` (not your email)
2. **SMTP_PASS** is your SendGrid API key (starts with `SG.`)
3. **SMTP_FROM** should use your verified domain: `noreply@em554.blueprintcad.io` or `hello@em554.blueprintcad.io`
4. The FROM address domain must match your verified SendGrid domain

## Alternative Ports (if 587 times out)

If port 587 gives connection timeouts, try:

### Option 1: Port 465 with SSL
```
SMTP_PORT=465
SMTP_SECURE=true
```

### Option 2: Port 2525
```
SMTP_PORT=2525
SMTP_SECURE=false
```

## Verify Domain in SendGrid

1. Go to SendGrid → Settings → Sender Authentication
2. Check that `em554.blueprintcad.io` shows as "Verified" (green checkmark)
3. All DNS records should be validated

## Test Email

After setting up, use the "Test Email Config" button in `/admin/email-campaigns` to verify it works.

