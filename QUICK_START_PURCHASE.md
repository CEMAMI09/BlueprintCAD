# Purchase Flow - Quick Start 🚀

## Setup (2 minutes)

### 1. Get Stripe Keys
Visit: https://dashboard.stripe.com/test/apikeys

Copy your keys.

### 2. Add to Environment
Create `.env.local`:
```bash
STRIPE_SECRET_KEY=sk_test_your_key_here
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_your_key_here
NEXT_PUBLIC_BASE_URL=http://localhost:3000
```

### 3. Restart Server
```bash
npm run dev
```

## Test Purchase (1 minute)

### Make a Project Paid
```sql
UPDATE projects SET for_sale = 1, price = 9.99 WHERE id = 1;
```

### Buy It
1. Go to project page (as different user)
2. Click "Purchase for $9.99"
3. Enter card: `4242 4242 4242 4242`
4. Use any future expiry, any CVC, any ZIP
5. Click "Pay Now"

### Download It
1. Go to `/orders`
2. Click "Download File"
3. File downloads to your computer

## That's It! ✅

### Key URLs
- Orders page: `/orders`
- Test cards: See `PURCHASE_FLOW.md`
- Stripe dashboard: https://dashboard.stripe.com/test/payments

### Quick Commands
```bash
# Check database
node migrations/check-orders.js

# View Stripe logs
open https://dashboard.stripe.com/test/logs
```

### Need Help?
Read the full guide: `PURCHASE_FLOW.md`
