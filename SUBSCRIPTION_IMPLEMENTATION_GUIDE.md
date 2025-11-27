# Subscription System Implementation Guide

## 🚀 Quick Start

### 1. Run Database Migration
```bash
node db/migrations/006_add_subscriptions.js
```

### 2. Set Environment Variables
Add to `.env.local`:
```
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_PRICE_PRO=price_...
STRIPE_PRICE_CREATOR=price_...
STRIPE_PRICE_ENTERPRISE=price_...
```

### 3. Create Stripe Products
In Stripe Dashboard, create:
- **Pro Plan**: $10/month recurring
- **Creator Plan**: $25/month recurring  
- **Enterprise Plan**: $49/month recurring (or custom pricing)

Copy the Price IDs to your `.env.local`

---

## 📍 Exact Gate Locations & Implementation

### **UPLOAD PAGE** (`app/upload/page.tsx`)

#### Gate 1: Private Project Toggle
**Location:** Line ~200-250 (where `is_public` toggle is)
```tsx
// BEFORE the toggle
<SubscriptionGate
  feature="maxPrivateProjects"
  requiredTier="pro"
  showUpgradeModal={true}
>
  <label className="flex items-center gap-2">
    <input
      type="checkbox"
      checked={!projectData.is_public}
      onChange={(e) => {
        if (!e.target.checked) {
          setProjectData({ ...projectData, is_public: true });
        } else {
          // Check subscription first
          checkSubscription('maxPrivateProjects', () => {
            setProjectData({ ...projectData, is_public: false });
          });
        }
      }}
    />
    Make Private
  </label>
</SubscriptionGate>
```

#### Gate 2: For Sale Toggle
**Location:** Line ~250-300 (where `for_sale` toggle is)
```tsx
<SubscriptionGate
  feature="canSell"
  requiredTier="pro"
>
  <label className="flex items-center gap-2">
    <input
      type="checkbox"
      checked={projectData.for_sale}
      onChange={(e) => {
        checkSubscription('canSell', () => {
          setProjectData({ ...projectData, for_sale: e.target.checked });
        });
      }}
    />
    For Sale
  </label>
</SubscriptionGate>
```

#### Gate 3: Upload Button (Project Limit)
**Location:** Line ~400-500 (submit handler)
```tsx
const handleSubmit = async (e) => {
  e.preventDefault();
  
  // Check project limit
  const canUpload = await checkCanAction('maxProjects');
  if (!canUpload.allowed) {
    setShowUpgradeModal(true);
    setUpgradeTier(canUpload.requiredTier || 'pro');
    return;
  }
  
  // Continue with upload...
};
```

---

### **EXPLORE PAGE** (`app/explore/page.tsx`)

#### Gate: Upload Design Button
**Location:** Line ~100-150 (PanelHeader actions)
```tsx
<SubscriptionGate
  feature="maxProjects"
  requiredTier="pro"
  fallback={
    <Button
      onClick={() => {
        // Check limit first
        checkSubscription('maxProjects', () => {
          router.push('/upload');
        });
      }}
    >
      Upload Design
    </Button>
  }
>
  <Button onClick={() => router.push('/upload')}>
    Upload Design
  </Button>
</SubscriptionGate>
```

---

### **MARKETPLACE PAGE** (`app/marketplace/page.tsx`)

#### Gate: Upload Design Button
**Location:** Same as Explore page
```tsx
<SubscriptionGate
  feature="canSell"
  requiredTier="pro"
>
  <Button onClick={() => router.push('/upload')}>
    Upload Design
  </Button>
</SubscriptionGate>
```

---

### **FOLDERS PAGE** (`app/folders/page.tsx`)

#### Gate 1: Create Folder Button
**Location:** Line ~100-150 (PanelHeader or main content)
```tsx
<SubscriptionGate
  feature="maxFolders"
  requiredTier="pro"
>
  <Button onClick={handleCreateFolder}>
    Create Folder
  </Button>
</SubscriptionGate>
```

#### Gate 2: Add Team Member
**Location:** Line ~300-400 (folder member management)
```tsx
<SubscriptionGate
  feature="maxTeamMembers"
  requiredTier="pro"
>
  <Button onClick={handleAddMember}>
    Add Team Member
  </Button>
</SubscriptionGate>
```

**Implementation in handler:**
```tsx
const handleAddMember = async () => {
  const canAdd = await checkCanAction('maxTeamMembers');
  if (!canAdd.allowed) {
    setShowUpgradeModal(true);
    setUpgradeTier(canAdd.requiredTier || 'pro');
    return;
  }
  // Continue with adding member...
};
```

---

### **QUOTE PAGE** (`app/quote/page.tsx`)

#### Gate: Save Project Button
**Location:** Line ~1200-1300 (SaveProjectModal trigger)
```tsx
<SubscriptionGate
  feature="canSaveQuotes"
  requiredTier="pro"
>
  <Button onClick={() => setIsSaveModalOpen(true)}>
    Save to Projects
  </Button>
</SubscriptionGate>
```

---

### **FORUMS PAGE** (`app/forum/page.tsx`)

#### Gate: Create Thread Button
**Location:** Line ~200-300 (thread creation area)
```tsx
<SubscriptionGate
  feature="canPostForums"
  requiredTier="pro"
>
  <Button onClick={handleCreateThread}>
    Create Thread
  </Button>
</SubscriptionGate>
```

---

### **MESSAGES PAGE** (`app/messages/page.tsx`)

#### Gate: Start New Conversation
**Location:** Line ~100-200 (new conversation button)
```tsx
const handleStartConversation = async (userId) => {
  const canMessage = await checkCanAction('maxConversations');
  if (!canMessage.allowed) {
    setShowUpgradeModal(true);
    setUpgradeTier('pro');
    return;
  }
  // Start conversation...
};
```

---

### **PROJECT PAGE** (`app/project/[id]/page.tsx`)

#### Gate 1: Make Private Toggle (in edit mode)
**Location:** Line ~800-900 (project settings)
```tsx
{isOwner && (
  <SubscriptionGate
    feature="maxPrivateProjects"
    requiredTier="pro"
  >
    <label>
      <input
        type="checkbox"
        checked={!project.is_public}
        onChange={handleTogglePrivate}
      />
      Make Private
    </label>
  </SubscriptionGate>
)}
```

#### Gate 2: For Sale Toggle
**Location:** Same area
```tsx
<SubscriptionGate
  feature="canSell"
  requiredTier="pro"
>
  <label>
    <input
      type="checkbox"
      checked={project.for_sale}
      onChange={handleToggleForSale}
    />
    For Sale
  </label>
</SubscriptionGate>
```

#### Gate 3: Analytics Button
**Location:** Line ~700-800 (project actions)
```tsx
{(tier === 'pro' || tier === 'creator' || tier === 'enterprise') && (
  <Button onClick={() => router.push(`/analytics/${id}`)}>
    View Analytics
  </Button>
)}
```

---

### **SETTINGS PAGE** (`app/settings/page.tsx`)

#### Gate: Analytics Section
**Location:** Line ~400-500 (settings sections)
```tsx
{tier !== 'free' && (
  <section>
    <h2>Analytics</h2>
    {tier === 'pro' && <BasicAnalytics />}
    {(tier === 'creator' || tier === 'enterprise') && <AdvancedAnalytics />}
  </section>
)}
```

#### Gate: Team Section
**Location:** Line ~500-600
```tsx
<SubscriptionGate
  feature="maxTeamMembers"
  requiredTier="pro"
>
  <section>
    <h2>Team Management</h2>
    <TeamMembersList />
  </section>
</SubscriptionGate>
```

---

### **DASHBOARD PAGE** (`app/dashboard/page.tsx`)

#### Gate: Analytics Display
**Location:** Line ~200-300 (stats section)
```tsx
{useEffect(() => {
  const loadAnalytics = async () => {
    if (tier === 'free') {
      setAnalytics(null);
      return;
    }
    // Load analytics based on tier
    if (tier === 'pro') {
      const basic = await fetch('/api/analytics/basic');
      setAnalytics(await basic.json());
    } else {
      const advanced = await fetch('/api/analytics/advanced');
      setAnalytics(await advanced.json());
    }
  };
  loadAnalytics();
}, [tier]);
```

---

## 🔧 Helper Functions to Add

### Add to `app/upload/page.tsx` and other pages:

```tsx
const checkSubscription = async (feature: string, onAllowed: () => void) => {
  try {
    const res = await fetch(`/api/subscriptions/can-action?feature=${feature}`);
    const data = await res.json();
    
    if (data.allowed) {
      onAllowed();
    } else {
      setShowUpgradeModal(true);
      setUpgradeTier(data.requiredTier || 'pro');
    }
  } catch (error) {
    console.error('Subscription check error:', error);
  }
};

const checkCanAction = async (feature: string) => {
  try {
    const res = await fetch(`/api/subscriptions/can-action?feature=${feature}`);
    return await res.json();
  } catch (error) {
    return { allowed: false };
  }
};
```

---

## 📊 New Pages to Create

### 1. Subscription Management Page (`app/subscription/page.tsx`)
- Show current plan
- Upgrade/downgrade options
- Billing history
- Cancel subscription

### 2. Analytics Page (`app/analytics/page.tsx`)
- Basic analytics for Pro
- Advanced analytics for Creator+

### 3. Storefront Page (`app/storefront/page.tsx`)
- Customization options (Creator+)

### 4. API Documentation (`app/api/page.tsx`)
- API docs and keys (Creator+)

---

## 🎯 Platform Fee Integration

Update `app/checkout/page.tsx` and `pages/api/orders/checkout.js`:

```tsx
// Get user's platform fee
const platformFeeRes = await fetch('/api/subscriptions/platform-fee');
const { platformFee } = await platformFeeRes.json();

const totalPrice = basePrice + (basePrice * platformFee);
```

---

## ✅ Testing Checklist

- [ ] Free user can upload 5 public projects
- [ ] Free user blocked from 6th project
- [ ] Free user blocked from private projects
- [ ] Free user blocked from selling
- [ ] Pro user can upload unlimited projects
- [ ] Pro user can create private projects
- [ ] Pro user can sell designs
- [ ] Creator user gets 3% platform fee
- [ ] Enterprise user gets 1% platform fee
- [ ] Subscription webhook updates user tier
- [ ] Upgrade modal shows correct tier
- [ ] All gates show upgrade prompts

---

## 🚨 Important Notes

1. **Run migration first** before testing
2. **Set Stripe keys** in environment variables
3. **Create Stripe products** and copy Price IDs
4. **Test webhook** using Stripe CLI: `stripe listen --forward-to localhost:3000/api/subscriptions/webhook`
5. **Update platform fee** in checkout flow to use subscription-based fees

