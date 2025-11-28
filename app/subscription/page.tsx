'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  ThreePanelLayout,
  CenterPanel,
  PanelHeader,
  PanelContent,
} from '@/components/ui/ThreePanelLayout';
import { GlobalNavSidebar } from '@/components/ui/GlobalNavSidebar';
import { Button, Card, Badge } from '@/components/ui/UIComponents';
import { DesignSystem as DS } from '@/backend/lib/ui/design-system';
import { Check, X, Zap, Crown, Building2, CreditCard, Calendar } from 'lucide-react';
import TierBadge from '@/frontend/components/TierBadge';

const TIERS = {
  free: {
    name: 'Base',
    price: 0,
    icon: Zap,
    color: DS.colors.text.secondary,
    features: [
      '3GB total storage',
      '250MB max file upload',
      'Unlimited public uploads',
      'Unlimited downloads',
      'Unlimited comments & stars',
      'Full messaging system',
      'Unlimited paid uploads (15% commission)',
      'Basic analytics (total sales, downloads)',
      '5 folders max (public only)',
      'Max 10 files per folder',
      '5 AI quotes/day (PLA only)',
      'Public link sharing',
    ],
    limitations: [
      'No private uploads',
      'No private folders',
      'No team folders',
      'No collaborators',
      'No branching',
      'No activity logs',
      'No printability analysis',
    ],
  },
  premium: {
    name: 'Premium',
    price: 10,
    icon: Crown,
    color: DS.colors.primary.blue,
    features: [
      '50GB total storage',
      '2GB max file upload',
      'Unlimited private & public uploads',
      'Unlimited folders (nested trees)',
      'Unlimited files per folder',
      'Up to 10 collaborators per folder',
      'Full versioning (branches, notes, metadata)',
      'Activity logs & change logs',
      '5% commission fee',
      'Advanced analytics page',
      '50 AI quotes/day',
      'PLA, PETG, ABS, TPU materials',
      'Printability analysis',
      'Support material estimate',
      'Weight/time calculation',
      'Password-protected links',
      'Expiring links',
      'View-only & download-blocked links',
      'Verified creator badge',
      'Pin designs',
    ],
  },
  pro: {
    name: 'Pro',
    price: 25,
    icon: Building2,
    color: '#9333ea', // Purple
    features: [
      'Everything in Premium',
      '500GB total storage',
      '5GB max file upload',
      'Unlimited collaborators',
      '0% commission fee',
      'Priority search ranking',
      'Seller storefront customization',
      'Featured creator slot rotation',
      'Tax documents handled (auto 1099)',
      'GitHub-style CAD versioning',
      'Branch permissions & previews',
      'Unlimited AI quotes',
      'All materials supported',
      'Auto-quote generation',
      'AI suggested price',
      'AI repair of broken STL',
      'AI model classification',
      'Custom CSS/theming',
      'External integrations',
      'Multiple payout methods',
      'Full link analytics',
    ],
  },
};

export default function SubscriptionPage() {
  const router = useRouter();
  const [subscription, setSubscription] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [upgrading, setUpgrading] = useState<string | null>(null);

  useEffect(() => {
    fetchSubscription();
  }, []);

  const fetchSubscription = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        router.push('/login');
        return;
      }

      const res = await fetch('/api/subscriptions/check', {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (res.ok) {
        const data = await res.json();
        setSubscription(data);
      }
    } catch (error) {
      console.error('Error fetching subscription:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleUpgrade = async (tier: string) => {
    setUpgrading(tier);
    try {
      const token = localStorage.getItem('token');
      
      // Map frontend tier names to backend tier names
      const tierMapping: Record<string, string> = {
        'free': 'free',
        'premium': 'pro',      // Frontend "premium" maps to backend "pro"
        'pro': 'creator',      // Frontend "pro" maps to backend "creator"
      };
      
      const backendTier = tierMapping[tier] || tier;
      
      const res = await fetch('/api/subscriptions/upgrade', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ tier: backendTier })
      });

      if (res.ok) {
        const data = await res.json();
        if (data.url) {
          window.location.href = data.url;
        }
      } else {
        alert('Failed to start upgrade process');
      }
    } catch (error) {
      console.error('Upgrade error:', error);
      alert('Failed to start upgrade process');
    } finally {
      setUpgrading(null);
    }
  };

  const handleCancel = async () => {
    if (!confirm('Are you sure you want to cancel your subscription? You will lose access to premium features at the end of your billing period.')) {
      return;
    }

    try {
      const token = localStorage.getItem('token');
      const res = await fetch('/api/subscriptions/cancel', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      });

      if (res.ok) {
        alert('Subscription will be cancelled at the end of the billing period');
        fetchSubscription();
      } else {
        alert('Failed to cancel subscription');
      }
    } catch (error) {
      console.error('Cancel error:', error);
      alert('Failed to cancel subscription');
    }
  };

  if (loading) {
    return (
      <ThreePanelLayout
        leftPanel={<GlobalNavSidebar />}
        centerPanel={
          <CenterPanel>
            <PanelHeader title="Subscription" />
            <PanelContent>
              <div className="flex items-center justify-center py-12">
                <div className="text-center">
                  <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                  <p style={{ color: DS.colors.text.secondary }}>Loading subscription...</p>
                </div>
              </div>
            </PanelContent>
          </CenterPanel>
        }
      />
    );
  }

  // Map backend tier to frontend tier for display
  const getFrontendTier = (backendTier: string): string => {
    const tierMapping: Record<string, string> = {
      'free': 'free',
      'pro': 'premium',        // Backend "pro" maps to frontend "premium"
      'creator': 'pro',        // Backend "creator" maps to frontend "pro"
      'enterprise': 'pro',     // Backend "enterprise" also maps to frontend "pro"
    };
    return tierMapping[backendTier] || 'free';
  };
  
  const backendTier = subscription?.tier || 'free';
  const frontendTier = getFrontendTier(backendTier);
  const currentTierInfo = TIERS[frontendTier as keyof typeof TIERS];

  return (
    <ThreePanelLayout
      leftPanel={<GlobalNavSidebar />}
      centerPanel={
        <CenterPanel>
          <PanelHeader title="Subscription Plans" />
          <PanelContent>
            <div className="space-y-6 px-6 py-6">
              {/* Current Plan */}
              {frontendTier !== 'free' && subscription?.subscription && (
                <Card padding="lg">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h3 className="text-xl font-bold mb-1" style={{ color: DS.colors.text.primary }}>
                        Current Plan: {currentTierInfo.name}
                      </h3>
                      {subscription.subscription.cancelAtPeriodEnd ? (
                        <p className="text-sm" style={{ color: DS.colors.accent.warning }}>
                          Cancels on {new Date(subscription.subscription.currentPeriodEnd).toLocaleDateString()}
                        </p>
                      ) : (
                        <p className="text-sm" style={{ color: DS.colors.text.secondary }}>
                          Renews on {new Date(subscription.subscription.currentPeriodEnd).toLocaleDateString()}
                        </p>
                      )}
                    </div>
                    {!subscription.subscription.cancelAtPeriodEnd && (
                      <Button
                        variant="secondary"
                        onClick={handleCancel}
                      >
                        Cancel Subscription
                      </Button>
                    )}
                  </div>
                </Card>
              )}

              {/* Storage Info */}
              {subscription?.storage && (
                <Card padding="lg">
                  <h3 className="text-lg font-semibold mb-3" style={{ color: DS.colors.text.primary }}>
                    Storage Usage
                  </h3>
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span style={{ color: DS.colors.text.secondary }}>Used</span>
                      <span style={{ color: DS.colors.text.primary }}>
                        {subscription.storage.used.toFixed(2)} GB / {subscription.storage.limit} GB
                      </span>
                    </div>
                    <div className="w-full bg-gray-800 rounded-full h-2">
                      <div
                        className="h-2 rounded-full transition-all"
                        style={{
                          width: `${Math.min(subscription.storage.percentUsed, 100)}%`,
                          backgroundColor: subscription.storage.percentUsed > 90 
                            ? DS.colors.accent.error 
                            : DS.colors.primary.blue
                        }}
                      />
                    </div>
                  </div>
                </Card>
              )}

              {/* Available Plans */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {Object.entries(TIERS).map(([tierKey, tierInfo]) => {
                  const Icon = tierInfo.icon;
                  const isCurrent = tierKey === frontendTier;
                  const tierOrder = ['free', 'premium', 'pro'];
                  const currentTierIndex = tierOrder.indexOf(frontendTier);
                  const thisTierIndex = tierOrder.indexOf(tierKey);
                  const isUpgrade = thisTierIndex > currentTierIndex;
                  
                  return (
                    <Card
                      key={tierKey}
                      padding="lg"
                      className={`relative ${isCurrent ? 'ring-2' : ''}`}
                      style={{
                        borderColor: isCurrent ? tierInfo.color : DS.colors.border.default,
                        backgroundColor: isCurrent ? `${tierInfo.color}10` : DS.colors.background.card,
                      }}
                    >
                      {isCurrent && (
                        <Badge
                          variant="default"
                          size="sm"
                          className="absolute top-4 right-4"
                          style={{ backgroundColor: tierInfo.color }}
                        >
                          Current
                        </Badge>
                      )}
                      
                      <div className="text-center mb-4">
                        <div className="inline-flex items-center justify-center w-12 h-12 rounded-full mb-3" style={{ backgroundColor: `${tierInfo.color}20` }}>
                          <Icon size={24} style={{ color: tierInfo.color }} />
                        </div>
                        <div className="flex items-center justify-center gap-2 mb-1">
                          <h3 className="text-xl font-bold" style={{ color: DS.colors.text.primary }}>
                            {tierInfo.name}
                          </h3>
                          {tierKey !== 'free' && <TierBadge tier={tierKey} size="sm" />}
                        </div>
                        <div className="mb-4">
                          <span className="text-3xl font-bold" style={{ color: DS.colors.text.primary }}>
                            ${tierInfo.price}
                          </span>
                          {tierInfo.price > 0 && (
                            <span className="text-sm" style={{ color: DS.colors.text.secondary }}>
                              /month
                            </span>
                          )}
                        </div>
                      </div>

                      <ul className="space-y-2 mb-6 max-h-96 overflow-y-auto">
                        {tierInfo.features.map((feature, idx) => (
                          <li key={idx} className="flex items-start gap-2 text-sm">
                            <Check size={16} className="mt-0.5 flex-shrink-0" style={{ color: tierInfo.color }} />
                            <span style={{ color: DS.colors.text.secondary }}>{feature}</span>
                          </li>
                        ))}
                        {tierKey === 'free' && tierInfo.limitations && tierInfo.limitations.map((limitation, idx) => (
                          <li key={idx} className="flex items-start gap-2 text-sm">
                            <X size={16} className="mt-0.5 flex-shrink-0" style={{ color: DS.colors.text.tertiary }} />
                            <span style={{ color: DS.colors.text.tertiary }}>{limitation}</span>
                          </li>
                        ))}
                      </ul>

                      {isCurrent ? (
                        <Button
                          variant="secondary"
                          fullWidth
                          disabled
                        >
                          Current Plan
                        </Button>
                      ) : (
                        <Button
                          variant={isUpgrade ? "primary" : "secondary"}
                          fullWidth
                          onClick={() => handleUpgrade(tierKey)}
                          disabled={upgrading === tierKey}
                          style={isUpgrade ? { backgroundColor: tierInfo.color } : {}}
                        >
                          {upgrading === tierKey ? 'Processing...' : isUpgrade ? 'Upgrade' : 'Downgrade'}
                        </Button>
                      )}
                    </Card>
                  );
                })}
              </div>
            </div>
          </PanelContent>
        </CenterPanel>
      }
    />
  );
}
