# Blueprint Subscription System Design

## 🎯 4-Tier Subscription Structure

### FREE TIER
**Price:** $0/month
**Target:** Casual users, hobbyists

**Features:**
- ✅ View all public designs
- ✅ Upload up to 5 public projects
- ✅ Basic profile (banner, PFP, bio, socials)
- ✅ Basic search (designs + users)
- ✅ View forums (read-only, no posting)
- ✅ Basic messaging (5 active conversations)
- ✅ Basic notifications
- ✅ 1GB storage
- ✅ Basic folders (up to 3 folders, no teams)
- ✅ View quote tool (no saving)
- ✅ Dashboard with basic stats

**Limitations:**
- ❌ No private projects
- ❌ No selling designs
- ❌ No analytics
- ❌ No team features
- ❌ No API access
- ❌ No custom branding

---

### PRO TIER
**Price:** $10/month
**Target:** Serious hobbyists, small creators

**Features:**
- ✅ Everything in Free
- ✅ **Unlimited public projects**
- ✅ **Private projects** (unlimited)
- ✅ **Sell designs** (5% platform fee)
- ✅ **10GB storage**
- ✅ **Advanced search** (filters, sorting)
- ✅ **Basic analytics** (views, downloads, likes per project)
- ✅ **Post in forums**
- ✅ **Unlimited messaging**
- ✅ **Advanced folders** (up to 10 folders, basic team features - 2 members)
- ✅ **Save quote calculations**
- ✅ **Priority support**
- ✅ **Custom profile themes** (3 themes)

**New Features:**
- 📊 Project-level analytics dashboard
- 🎨 Profile customization options

---

### CREATOR TIER
**Price:** $25/month
**Target:** Professional creators, small businesses

**Features:**
- ✅ Everything in Pro
- ✅ **50GB storage**
- ✅ **Advanced analytics** (revenue tracking, engagement metrics, demographics, trends)
- ✅ **Storefront customization** (custom banner, featured designs, bio section)
- ✅ **Lower platform fee** (3% instead of 5%)
- ✅ **Team features** (up to 5 members, role-based permissions)
- ✅ **File versioning** (keep history of file changes)
- ✅ **Priority quote processing** (faster AI estimates)
- ✅ **API access** (read-only, rate-limited)
- ✅ **Unlimited folders** (advanced permissions, nested folders)
- ✅ **Custom branding** on storefront
- ✅ **Bulk operations** (upload multiple files, batch edit)

**New Features:**
- 📈 Advanced analytics dashboard
- 🏪 Storefront customization page
- 🔄 File versioning system
- 🔌 API access with documentation
- 👥 Enhanced team collaboration

---

### ENTERPRISE TIER
**Price:** $49-$99+/month (custom pricing)
**Target:** Large teams, agencies, enterprises

**Features:**
- ✅ Everything in Creator
- ✅ **200GB+ storage** (scalable, custom limits)
- ✅ **White-label options** (remove Blueprint branding)
- ✅ **Advanced team features** (unlimited members, custom roles, SSO)
- ✅ **Custom platform fee** (negotiable, can be as low as 1%)
- ✅ **Priority everything** (support, quotes, processing)
- ✅ **Dedicated support** (email, chat, phone)
- ✅ **Advanced API access** (full read/write, webhooks)
- ✅ **Custom integrations** (Zapier, custom webhooks)
- ✅ **Advanced security** (2FA, audit logs, IP restrictions)
- ✅ **Bulk operations** (advanced batch processing)
- ✅ **Custom domain** for storefront
- ✅ **Advanced analytics** (custom reports, exports)

**New Features:**
- 🏢 Enterprise dashboard
- 🔐 Advanced security settings
- 🔗 Custom integrations page
- 📊 Custom reporting tools

---

## 🚪 Subscription Gates - Exact Locations

### UPLOAD PAGE (`app/upload/page.tsx`)
**Gate:** Upload button
- **Free:** Show upgrade modal after 5 public projects
- **Free:** Block private project toggle, show upgrade modal
- **Free:** Block "For Sale" toggle, show upgrade modal

### EXPLORE PAGE (`app/explore/page.tsx`)
**Gate:** Upload Design button
- **Free:** Allow if < 5 projects
- **Free:** Show upgrade modal if >= 5 projects

### MARKETPLACE PAGE (`app/marketplace/page.tsx`)
**Gate:** Upload Design button
- **Free:** Show upgrade modal (need Pro to sell)

### PROFILE PAGE (`app/profile/[username]/page.tsx`)
**Gate:** Projects tab visibility
- **Free:** Show only public projects
- **Pro+:** Show all projects (public + private)

**Gate:** Settings button
- **Free:** Limited settings
- **Pro+:** Full settings including analytics

### SETTINGS PAGE (`app/settings/page.tsx`)
**Gate:** Billing section
- **All:** Show current plan, upgrade options

**Gate:** Analytics section
- **Free/Pro:** Show basic analytics
- **Creator+:** Show advanced analytics

**Gate:** Team section
- **Free:** Show upgrade modal
- **Pro:** Allow up to 2 members
- **Creator:** Allow up to 5 members
- **Enterprise:** Unlimited members

### FOLDERS PAGE (`app/folders/page.tsx`)
**Gate:** Create Folder button
- **Free:** Block after 3 folders, show upgrade modal
- **Pro:** Block after 10 folders, show upgrade modal
- **Creator+:** Unlimited

**Gate:** Add Team Member button
- **Free:** Show upgrade modal
- **Pro:** Allow up to 2 members
- **Creator:** Allow up to 5 members
- **Enterprise:** Unlimited

### QUOTE PAGE (`app/quote/page.tsx`)
**Gate:** Save Project button
- **Free:** Show upgrade modal
- **Pro+:** Allow saving

### FORUMS PAGE (`app/forum/page.tsx`)
**Gate:** Create Thread button
- **Free:** Show upgrade modal
- **Pro+:** Allow creating threads

### MESSAGES PAGE (`app/messages/page.tsx`)
**Gate:** Start New Conversation
- **Free:** Block after 5 conversations, show upgrade modal
- **Pro+:** Unlimited

### DASHBOARD PAGE (`app/dashboard/page.tsx`)
**Gate:** Analytics section
- **Free:** Show basic stats only
- **Pro:** Show project-level analytics
- **Creator+:** Show advanced analytics with revenue tracking

### PROJECT PAGE (`app/project/[id]/page.tsx`)
**Gate:** Make Private toggle
- **Free:** Show upgrade modal
- **Pro+:** Allow

**Gate:** For Sale toggle
- **Free:** Show upgrade modal
- **Pro+:** Allow

**Gate:** Analytics button
- **Free:** Hidden
- **Pro:** Show basic analytics
- **Creator+:** Show advanced analytics

---

## 🗄️ Database Schema Changes

### 1. Update `users` table
```sql
ALTER TABLE users ADD COLUMN subscription_tier TEXT DEFAULT 'free';
ALTER TABLE users ADD COLUMN subscription_status TEXT DEFAULT 'active';
ALTER TABLE users ADD COLUMN subscription_starts_at DATETIME;
ALTER TABLE users ADD COLUMN subscription_ends_at DATETIME;
ALTER TABLE users ADD COLUMN stripe_customer_id TEXT;
ALTER TABLE users ADD COLUMN stripe_subscription_id TEXT;
ALTER TABLE users ADD COLUMN storage_limit_gb INTEGER DEFAULT 1;
ALTER TABLE users ADD COLUMN storage_used_gb REAL DEFAULT 0;
```

### 2. Create `subscriptions` table
```sql
CREATE TABLE IF NOT EXISTS subscriptions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  tier TEXT NOT NULL,
  status TEXT NOT NULL,
  stripe_subscription_id TEXT UNIQUE,
  stripe_customer_id TEXT,
  current_period_start DATETIME,
  current_period_end DATETIME,
  cancel_at_period_end INTEGER DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id)
);
```

### 3. Create `subscription_usage` table
```sql
CREATE TABLE IF NOT EXISTS subscription_usage (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  feature TEXT NOT NULL,
  count INTEGER DEFAULT 0,
  limit_count INTEGER,
  reset_period TEXT,
  last_reset DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id),
  UNIQUE(user_id, feature)
);
```

### 4. Create `subscription_history` table
```sql
CREATE TABLE IF NOT EXISTS subscription_history (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  from_tier TEXT,
  to_tier TEXT,
  change_type TEXT,
  stripe_event_id TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id)
);
```

---

## 🔧 Implementation Files

### Backend Files to Create/Modify

1. **`backend/lib/subscription-utils.js`** - Subscription checking utilities
2. **`pages/api/subscriptions/check.js`** - Check user subscription status
3. **`pages/api/subscriptions/upgrade.js`** - Handle subscription upgrades
4. **`pages/api/subscriptions/webhook.js`** - Stripe webhook handler
5. **`pages/api/subscriptions/cancel.js`** - Cancel subscription
6. **`pages/api/subscriptions/features.js`** - Get available features for tier
7. **`pages/api/analytics/[projectId].js`** - Project analytics (Pro+)
8. **`pages/api/analytics/advanced.js`** - Advanced analytics (Creator+)
9. **`pages/api/storefront/customize.js`** - Storefront customization (Creator+)
10. **`pages/api/versioning/[projectId].js`** - File versioning (Creator+)

### Frontend Components to Create

1. **`frontend/components/SubscriptionGate.tsx`** - Reusable subscription gate component
2. **`frontend/components/UpgradeModal.tsx`** - Upgrade prompt modal
3. **`frontend/components/SubscriptionBadge.tsx`** - Show current tier badge
4. **`app/subscription/page.tsx`** - Subscription management page
5. **`app/analytics/page.tsx`** - Analytics dashboard (Pro+)
6. **`app/storefront/page.tsx`** - Storefront customization (Creator+)
7. **`app/api/page.tsx`** - API documentation (Creator+)

---

## 💳 Stripe Integration

### Stripe Products & Prices

```javascript
const STRIPE_PLANS = {
  pro: {
    priceId: 'price_pro_monthly', // Replace with actual Stripe price ID
    amount: 1000, // $10.00
    interval: 'month'
  },
  creator: {
    priceId: 'price_creator_monthly',
    amount: 2500, // $25.00
    interval: 'month'
  },
  enterprise: {
    priceId: 'price_enterprise_monthly',
    amount: 4900, // $49.00 base
    interval: 'month',
    custom: true // Allows custom pricing
  }
};
```

---

## 📊 Feature Implementation Priority

### Phase 1: Core Subscription System
1. Database schema
2. Subscription utilities
3. Basic gates on upload/private/sell
4. Stripe integration
5. Upgrade modals

### Phase 2: Analytics & Advanced Features
1. Basic analytics (Pro)
2. Advanced analytics (Creator)
3. Storefront customization
4. File versioning

### Phase 3: Enterprise Features
1. Team management enhancements
2. API access
3. White-label options
4. Custom integrations

---

## 🎨 UI/UX Considerations

- **Upgrade modals** should be non-intrusive but clear
- **Feature comparisons** should highlight value
- **Usage indicators** show progress toward limits
- **Graceful degradation** when limits are hit
- **Clear CTAs** for upgrades at the right moments

