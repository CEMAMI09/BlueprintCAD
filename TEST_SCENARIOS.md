# Subscription System Test Scenarios

## Overview
This document outlines comprehensive test scenarios for the Blueprint subscription system.

## Prerequisites
1. Stripe test keys configured in `.env`
2. Test database initialized
3. Test user accounts created

## Test Scenarios

### 1. Subscription Upgrade Flow

#### 1.1 Free to Pro Upgrade
**Steps:**
1. Log in as a free tier user
2. Navigate to Settings > Billing
3. Click "Upgrade Plan" button
4. Verify redirect to `/subscription` page
5. Select Pro plan ($10/month)
6. Click "Upgrade" button
7. Complete Stripe Checkout with test card: `4242 4242 4242 4242`
8. Verify redirect to `/subscription/success`
9. Check that user tier is updated to "pro" in database
10. Verify subscription status is "active"
11. Verify analytics event `subscription_upgrade_initiated` is tracked
12. Verify analytics event `subscription_upgraded` is tracked (from webhook)

**Expected Results:**
- User can access Pro features (unlimited projects, selling, forums)
- Storage limit increased to 10GB
- Subscription appears in billing section
- Webhook processes subscription activation

#### 1.2 Pro to Creator Upgrade
**Steps:**
1. Log in as Pro tier user
2. Navigate to `/subscription` page
3. Select Creator plan ($25/month)
4. Complete upgrade flow
5. Verify tier upgrade to "creator"
6. Verify access to Creator features (analytics, storefront, file versioning)

**Expected Results:**
- All Pro features remain accessible
- New Creator features unlocked
- Platform fee reduced to 3%

#### 1.3 Creator to Enterprise Upgrade
**Steps:**
1. Log in as Creator tier user
2. Navigate to `/subscription` page
3. Select Enterprise plan ($49/month)
4. Complete upgrade flow
5. Verify tier upgrade to "enterprise"
6. Verify access to Enterprise features (white-label, custom domain)

**Expected Results:**
- All Creator features remain accessible
- Enterprise features unlocked
- Platform fee reduced to 1%

### 2. Feature Gating Tests

#### 2.1 Project Limits
**Free Tier:**
- Create 5 projects → Should succeed
- Create 6th project → Should show upgrade modal
- Verify error message mentions tier limit

**Pro Tier:**
- Create unlimited projects → Should succeed
- No upgrade prompts for project creation

#### 2.2 Private Projects
**Free Tier:**
- Try to create private project → Should show upgrade modal
- Error message: "Private projects require Pro subscription"

**Pro Tier:**
- Create private project → Should succeed

#### 2.3 Selling Designs
**Free Tier:**
- Try to toggle "For Sale" on upload → Should show upgrade modal
- Error message: "Selling designs requires Pro subscription"

**Pro Tier:**
- Toggle "For Sale" → Should succeed
- Verify platform fee is 5%

**Creator Tier:**
- Verify platform fee is 3%

**Enterprise Tier:**
- Verify platform fee is 1%

#### 2.4 Forum Posting
**Free Tier:**
- Try to create forum thread → Should fail with 403
- Error message: "Posting in forums requires Pro subscription"

**Pro Tier:**
- Create forum thread → Should succeed
- Reply to thread → Should succeed

#### 2.5 Folder Limits
**Free Tier:**
- Create 3 folders → Should succeed
- Create 4th folder → Should show upgrade modal

**Pro Tier:**
- Create 10 folders → Should succeed
- Create 11th folder → Should show upgrade modal

**Creator/Enterprise:**
- Create unlimited folders → Should succeed

#### 2.6 Team Members
**Free Tier:**
- Try to invite team member → Should fail
- Error: "Team features require Pro subscription"

**Pro Tier:**
- Invite 2 team members → Should succeed
- Invite 3rd member → Should show upgrade modal

**Creator Tier:**
- Invite up to 5 team members → Should succeed

**Enterprise Tier:**
- Invite unlimited team members → Should succeed

#### 2.7 Analytics Dashboard
**Free/Pro Tier:**
- Navigate to `/analytics` → Should show upgrade modal
- Error: "Analytics requires Pro subscription" (should be Creator)

**Creator/Enterprise:**
- Navigate to `/analytics` → Should show dashboard
- Verify all analytics data loads correctly

#### 2.8 Storefront Customization
**Free/Pro/Creator (non-Creator):**
- Navigate to `/storefront` → Should show upgrade modal
- Error: "Storefront customization requires Creator subscription"

**Creator/Enterprise:**
- Navigate to `/storefront` → Should show customization UI
- Update storefront settings → Should save successfully

#### 2.9 File Versioning
**Free/Pro/Creator (non-Creator):**
- Navigate to project detail page
- Try to upload file version → Should show upgrade modal
- Error: "File versioning requires Creator subscription"

**Creator/Enterprise:**
- Upload file version → Should succeed
- View version history → Should display all versions
- Set version as current → Should update project file

### 3. Subscription Management Tests

#### 3.1 View Current Subscription
**Steps:**
1. Log in as subscribed user
2. Navigate to Settings > Billing
3. Verify current plan is displayed
4. Verify renewal date is shown
5. Verify storage usage is displayed

**Expected Results:**
- All subscription details visible
- Storage bar shows correct usage percentage

#### 3.2 Cancel Subscription
**Steps:**
1. Log in as Pro/Creator/Enterprise user
2. Navigate to Settings > Billing or `/subscription`
3. Click "Cancel Subscription"
4. Confirm cancellation
5. Verify subscription marked for cancellation
6. Verify `cancel_at_period_end` is true
7. Wait for period end (or manually trigger webhook)
8. Verify downgrade to free tier

**Expected Results:**
- Subscription remains active until period end
- User loses access to premium features after period end
- Analytics event `subscription_cancelled` tracked

#### 3.3 Subscription Renewal
**Steps:**
1. Set up active subscription
2. Simulate invoice payment (Stripe webhook)
3. Verify subscription remains active
4. Verify period dates updated

**Expected Results:**
- Subscription continues without interruption
- No feature access lost

### 4. Webhook Tests

#### 4.1 Checkout Session Completed
**Steps:**
1. Initiate subscription upgrade
2. Complete Stripe Checkout
3. Verify webhook receives `checkout.session.completed` event
4. Verify user tier updated in database
5. Verify subscription record created
6. Verify subscription history recorded
7. Verify analytics event tracked

**Expected Results:**
- All database updates successful
- User immediately has access to new tier features

#### 4.2 Subscription Updated
**Steps:**
1. Modify subscription in Stripe dashboard
2. Trigger `customer.subscription.updated` webhook
3. Verify subscription status updated
4. Verify period dates updated

**Expected Results:**
- Database reflects Stripe changes
- User access remains correct

#### 4.3 Subscription Deleted
**Steps:**
1. Cancel subscription in Stripe
2. Trigger `customer.subscription.deleted` webhook
3. Verify user downgraded to free
4. Verify subscription status set to "canceled"
5. Verify analytics event tracked

**Expected Results:**
- User immediately loses premium features
- Storage limit reduced to 1GB
- Graceful handling of feature access

### 5. Analytics Tracking Tests

#### 5.1 Subscription Events
**Verify tracking of:**
- `subscription_upgrade_initiated` - When user clicks upgrade
- `subscription_upgraded` - When webhook processes upgrade
- `subscription_cancelled` - When subscription cancelled
- `analytics_viewed` - When user views analytics dashboard

**Steps:**
1. Perform each action
2. Query `analytics_events` table
3. Verify event recorded with correct metadata

**Expected Results:**
- All events tracked with timestamps
- Metadata includes relevant context
- User ID correctly associated

#### 5.2 Feature Usage Tracking
**Verify tracking of:**
- Feature access attempts
- Upgrade prompts shown
- Feature usage by tier

**Expected Results:**
- Usage data available for analysis
- Can identify popular features
- Can identify conversion opportunities

### 6. Edge Cases

#### 6.1 Concurrent Upgrades
**Steps:**
1. User initiates upgrade
2. Before completion, initiate another upgrade
3. Verify only one active subscription

**Expected Results:**
- System handles gracefully
- No duplicate subscriptions
- Correct tier applied

#### 6.2 Expired Subscription
**Steps:**
1. Set subscription to expired state
2. Verify user downgraded to free
3. Verify feature access restricted

**Expected Results:**
- User cannot access premium features
- Upgrade prompts shown appropriately

#### 6.3 Payment Failure
**Steps:**
1. Set up subscription with payment method
2. Simulate payment failure
3. Verify webhook processes `invoice.payment_failed`
4. Verify subscription status updated

**Expected Results:**
- User notified of payment issue
- Grace period before feature loss
- Clear upgrade path shown

### 7. UI/UX Tests

#### 7.1 Upgrade Modals
**Verify:**
- Modal appears when feature gated
- Correct tier requirement shown
- Upgrade button works
- Modal can be dismissed

#### 7.2 Subscription Page
**Verify:**
- All tiers displayed correctly
- Current tier highlighted
- Upgrade/downgrade buttons work
- Storage usage displayed
- Cancel subscription works

#### 7.3 Settings Billing Section
**Verify:**
- Current plan displayed
- Upgrade button links to `/subscription`
- Storage usage shown
- Payment method info displayed

### 8. Performance Tests

#### 8.1 Subscription Check Performance
**Steps:**
1. Measure time to check subscription status
2. Verify caching if implemented
3. Test with high concurrent requests

**Expected Results:**
- Response time < 100ms
- No performance degradation

#### 8.2 Feature Gate Performance
**Steps:**
1. Measure time to check feature access
2. Test with multiple simultaneous checks
3. Verify database query optimization

**Expected Results:**
- Fast feature checks
- Minimal database load

## Test Data Setup

### Test Users
Create test users for each tier:
- `free_user@test.com` - Free tier
- `pro_user@test.com` - Pro tier
- `creator_user@test.com` - Creator tier
- `enterprise_user@test.com` - Enterprise tier

### Test Stripe Data
- Use Stripe test mode
- Test card: `4242 4242 4242 4242`
- Test webhook endpoint: `/api/subscriptions/webhook`

## Automated Testing

### Unit Tests
- `subscription-utils.js` functions
- Feature access checks
- Limit calculations

### Integration Tests
- API endpoint responses
- Database updates
- Webhook processing

### E2E Tests
- Complete upgrade flow
- Feature gating
- Subscription management

## Monitoring

### Key Metrics
- Subscription conversion rate
- Feature usage by tier
- Churn rate
- Average revenue per user (ARPU)

### Alerts
- Webhook processing failures
- Subscription sync issues
- Payment failures

## Notes

- All tests should use test database
- Stripe webhooks can be tested using Stripe CLI
- Analytics events should be verified in database
- Feature gates should be tested across all tiers

