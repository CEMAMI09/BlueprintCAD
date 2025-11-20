# Purchase Flow Setup Guide

## Overview

This guide covers the complete e-commerce purchase flow implementation for STL/CAD files on Blueprint (formerly Forge). The system includes:

- ✅ Stripe payment processing (test mode)
- ✅ Secure file downloads with tokens
- ✅ Transaction history
- ✅ Email notifications
- ✅ Refund support
- ✅ Download limits and expiration

## Architecture

### Backend APIs

**`/api/orders/checkout`** - Creates payment intent
- Method: POST
- Body: `{ projectId: number }`
- Returns: `{ clientSecret, orderId, orderNumber, amount, projectTitle }`

**`/api/orders/confirm`** - Confirms payment and sends emails
- Method: POST
- Body: `{ orderNumber: string }`
- Returns: `{ success, orderNumber, downloadToken, message }`

**`/api/orders/download`** - Secure file download
- Method: GET
- Query: `?token=xxx`
- Returns: File stream

**`/api/orders/my-orders`** - Transaction history
- Method: GET
- Query: `?type=all|purchases|sales`
- Returns: Order list with stats

**`/api/orders/refund`** - Process refunds
- Method: POST
- Body: `{ orderNumber, reason }`
- Returns: `{ success, refundId, amount }`

### Database Schema

**`orders` table:**
```sql
- id (INTEGER PRIMARY KEY)
- order_number (TEXT UNIQUE) - Format: BLU-{timestamp}-{random}
- buyer_id (INTEGER)
- seller_id (INTEGER)
- project_id (INTEGER)
- amount (REAL)
- currency (TEXT DEFAULT 'usd')
- stripe_payment_intent_id (TEXT)
- stripe_charge_id (TEXT)
- status (TEXT) - pending, completed, refunded
- payment_status (TEXT) - Stripe payment status
- download_token (TEXT UNIQUE)
- download_count (INTEGER DEFAULT 0)
- download_limit (INTEGER DEFAULT 3)
- refund_id (TEXT)
- refund_amount (REAL)
- refund_reason (TEXT)
- refunded_at (DATETIME)
- created_at (DATETIME DEFAULT CURRENT_TIMESTAMP)
- updated_at (DATETIME DEFAULT CURRENT_TIMESTAMP)
- expires_at (DATETIME) - 1 year from purchase
```

**`order_notifications` table:**
```sql
- id (INTEGER PRIMARY KEY)
- order_id (INTEGER)
- notification_type (TEXT) - purchase, sale, refund, seller_refund
- sent_to (TEXT)
- sent_at (DATETIME DEFAULT CURRENT_TIMESTAMP)
```

### Frontend Components

**`app/components/CheckoutModal.tsx`** - Payment UI
- Stripe Elements integration
- Card input form
- Payment confirmation
- Error handling

**`app/orders/page.tsx`** - Order history page
- Purchases and sales tabs
- Download management
- Refund requests
- Statistics dashboard

**`app/project/[id]/page.tsx`** - Purchase button integration
- "Buy Now" button for paid projects
- "Already Purchased" state
- Checkout modal trigger

## Setup Instructions

### 1. Install Dependencies

Already installed:
```bash
npm install stripe @stripe/stripe-js @stripe/react-stripe-js
```

### 2. Get Stripe Test Keys

1. Go to https://dashboard.stripe.com/register
2. Create a Stripe account (free for testing)
3. Navigate to **Developers → API keys**
4. Copy your **Publishable key** (starts with `pk_test_`)
5. Copy your **Secret key** (starts with `sk_test_`)

### 3. Configure Environment Variables

Create `.env.local` file in project root:

```bash
# Stripe Keys
STRIPE_SECRET_KEY=sk_test_51ABC123...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_51ABC123...

# Base URL for email links
NEXT_PUBLIC_BASE_URL=http://localhost:3000
```

**Important:** Never commit `.env.local` to version control!

### 4. Database Migration

Already completed - orders tables created:
```bash
node migrations/run-orders-migration.js
```

### 5. Test the System

#### Test Card Numbers (Stripe Test Mode)

Use these test cards for different scenarios:

| Card Number | Result |
|-------------|--------|
| 4242 4242 4242 4242 | Success |
| 4000 0000 0000 0002 | Decline |
| 4000 0025 0000 3155 | Requires authentication |

**CVV:** Any 3 digits  
**Expiration:** Any future date  
**ZIP:** Any 5 digits

#### Test Flow

1. **Create a paid project:**
   - Upload a project
   - Set `for_sale = 1` and `price = 9.99` in database

2. **Purchase as different user:**
   - Create second test account
   - Navigate to project page
   - Click "Purchase for $9.99"
   - Enter test card: `4242 4242 4242 4242`
   - Complete purchase

3. **Verify purchase:**
   - Check buyer's email for confirmation
   - Check seller's email for sale notification
   - Go to `/orders` to see transaction
   - Download file (3 times max)

4. **Test refund:**
   - Click "Request Refund" on order
   - Check emails for refund notifications
   - Verify refund in Stripe dashboard

## Configuration

### Platform Fee

Currently set to 10% in `lib/stripe-utils.js`:

```javascript
export function calculatePlatformFee(amount) {
  return Math.round(amount * 0.1 * 100) / 100; // 10% fee
}
```

### Download Limits

- **Downloads per purchase:** 3 (configurable in `migrations/002_orders_schema.sql`)
- **Download expiration:** 1 year from purchase

### Order Number Format

`BLU-{timestamp}-{random}`

Example: `BLU-1704067200-a3f9`

## Email Templates

Email notifications are sent for:

1. **Purchase Confirmation** → Buyer
   - Order details
   - Download link
   - Download instructions

2. **Sale Notification** → Seller
   - Buyer username
   - Amount earned (90% after platform fee)
   - Order number

3. **Refund Notification** → Buyer
   - Refund amount
   - Processing time (5-10 business days)

4. **Seller Refund Notification** → Seller
   - Refund details
   - Earnings deduction

## Security Features

### Download Token Security

- 32-byte random hex token (256-bit entropy)
- One-time generation at payment confirmation
- Indexed for fast lookup
- Expires after 1 year
- Rate limited to 3 downloads

### Payment Security

- Stripe handles all payment data (PCI compliant)
- No card numbers stored in database
- Payment intent confirmation required
- Server-side validation of all transactions

### Access Control

- Users cannot buy their own projects
- Users cannot buy already-purchased projects
- Download requires valid token
- Refunds verify buyer/seller ownership

## Troubleshooting

### "Payment failed" error

**Check:**
- Stripe keys are correct in `.env.local`
- Using test card numbers in test mode
- Network connection to Stripe API

### Downloads not working

**Check:**
- Order status is `completed`
- Payment status is `succeeded`
- Download count < download limit
- Order not expired (< 1 year old)
- File exists at `public/uploads/{file_path}`

### Emails not sending

**Check:**
- SMTP configuration in `.env.local`
- `lib/email.js` configured correctly
- Check spam folder

### "Already purchased" not showing

**Check:**
- User is logged in
- Order exists in database
- Order not refunded

## Production Deployment

### Before Going Live:

1. **Switch to Live Keys:**
   ```bash
   STRIPE_SECRET_KEY=sk_live_...
   NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_...
   ```

2. **Enable Stripe Webhooks:**
   - Create webhook endpoint: `https://yourdomain.com/api/webhooks/stripe`
   - Subscribe to events: `payment_intent.succeeded`, `charge.refunded`
   - Add webhook signature verification

3. **Update Base URL:**
   ```bash
   NEXT_PUBLIC_BASE_URL=https://yourdomain.com
   ```

4. **Configure Email:**
   - Use production SMTP server
   - Update `SMTP_FROM` to real email

5. **Test in Live Mode:**
   - Use real cards (small amounts)
   - Verify emails arrive
   - Test download flow
   - Test refunds

## API Response Examples

### Successful Checkout

```json
{
  "clientSecret": "pi_abc123_secret_xyz789",
  "orderId": 1,
  "orderNumber": "BLU-1704067200-a3f9",
  "amount": 9.99,
  "projectTitle": "Robot Arm STL"
}
```

### Order History

```json
{
  "purchases": [
    {
      "id": 1,
      "order_number": "BLU-1704067200-a3f9",
      "amount": 9.99,
      "status": "completed",
      "payment_status": "succeeded",
      "download_count": 1,
      "download_limit": 3,
      "project": {
        "id": 42,
        "title": "Robot Arm STL"
      },
      "seller": {
        "username": "engineer123"
      }
    }
  ],
  "stats": {
    "totalPurchases": 1,
    "totalSpent": 9.99
  }
}
```

## Files Created

### Backend
- `lib/stripe-utils.js` - Stripe API wrapper
- `pages/api/orders/checkout.js` - Payment intent creation
- `pages/api/orders/confirm.js` - Payment confirmation
- `pages/api/orders/download.js` - Secure downloads
- `pages/api/orders/my-orders.js` - Transaction history
- `pages/api/orders/refund.js` - Refund processing
- `migrations/002_orders_schema.sql` - Database schema
- `lib/email-templates.js` - Updated with purchase emails

### Frontend
- `app/components/CheckoutModal.tsx` - Payment modal
- `app/orders/page.tsx` - Order history page
- `app/project/[id]/page.tsx` - Updated with buy button

### Documentation
- `.env.example` - Updated with Stripe keys
- `PURCHASE_FLOW.md` - This file

## Next Steps (Optional Enhancements)

### Webhook Implementation

Create `pages/api/webhooks/stripe.js` for automatic payment event handling:

```javascript
import Stripe from 'stripe';
import { buffer } from 'micro';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

export const config = {
  api: { bodyParser: false }
};

export default async function handler(req, res) {
  const sig = req.headers['stripe-signature'];
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  let event;
  try {
    const body = await buffer(req);
    event = stripe.webhooks.constructEvent(body, sig, webhookSecret);
  } catch (err) {
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  switch (event.type) {
    case 'payment_intent.succeeded':
      // Auto-confirm order
      break;
    case 'charge.refunded':
      // Update order status
      break;
  }

  res.json({ received: true });
}
```

### Analytics Dashboard

Track:
- Total sales volume
- Average order value
- Top selling projects
- Refund rate
- Download completion rate

### Bulk Downloads

Allow purchasing multiple projects:
- Shopping cart system
- Combined checkout
- Bulk download ZIP

### Licensing System

Different purchase tiers:
- Personal use license
- Commercial use license
- Unlimited prints vs. limited prints
- Resale rights

## Support

For issues or questions:
- Check database with: `node migrations/check-orders.js`
- View Stripe logs: https://dashboard.stripe.com/logs
- Test webhooks: https://dashboard.stripe.com/test/webhooks

---

**System Status:** ✅ Backend Complete | ✅ Frontend Complete | 🧪 Ready for Testing
