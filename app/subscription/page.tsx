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
import { Check, X, Crown, Zap, Building2, Store, Users, TrendingUp } from 'lucide-react';
import TierBadge from '@/frontend/components/TierBadge';

const TIERS = {
  free: {
    name: 'Free',
    subtitle: 'Build & Browse',
    price: 0,
    icon: Zap,
    color: DS.colors.text.secondary,
    features: [
      'Unlimited public projects',
      '500MB storage',
      'Public profile',
      'Explore & Trending',
      'Download free designs',
      'Basic search',
      'Comments & stars',
      '1-2 private projects',
      'AI quote estimates (3/month)',
      'Sell designs (15% commission)',
    ],
    limitations: [
      'No storefront',
      'No manufacturing orders',
      'No advanced analytics',
      'No team collaboration',
    ],
  },
  creator: {
    name: 'Creator',
    subtitle: 'Sell & Earn',
    price: 15,
    icon: Store,
    color: DS.colors.primary.blue,
    features: [
      'Everything in Free +',
      'Sell designs in marketplace',
      'Personal storefront',
      'Stripe payouts',
      'AI manufacturing quotes',
      'Licensing controls',
      'Reviews & ratings',
      'Sales analytics',
      'More private projects',
      '50GB storage',
      'Featured listing eligibility',
      'Lower platform fees (5%)',
    ],
  },
  studio: {
    name: 'Studio',
    subtitle: 'Teams & Scaling',
    price: 49,
    icon: Building2,
    color: '#9333ea', // Purple
    features: [
      'Everything in Creator +',
      '10 team members in storefront',
      'Team folders (unlimited members)',
      'Role-based permissions',
      'Shared analytics',
      'Internal collaboration',
      'Priority quoting',
      'Shared storefront brand',
      '200GB storage',
      'API access',
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
        'creator': 'creator',
        'studio': 'studio',
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
      'creator': 'creator',
      'studio': 'studio',
      // Legacy tiers map to closest new tier
      'pro': 'creator',
      'enterprise': 'studio',
    };
    return tierMapping[backendTier] || 'free';
  };
  
  const backendTier = subscription?.tier || 'free';
  const frontendTier = getFrontendTier(backendTier);
  const currentTierInfo = TIERS[frontendTier as keyof typeof TIERS];

  const formatStorage = (bytes: number) => {
    if (bytes === -1) return 'Unlimited';
    if (bytes >= 1024 * 1024 * 1024) {
      return (bytes / (1024 * 1024 * 1024)).toFixed(2) + ' GB';
    } else if (bytes >= 1024 * 1024) {
      return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
    } else if (bytes >= 1024) {
      return (bytes / 1024).toFixed(2) + ' KB';
    }
    return bytes + ' B';
  };

  return (
    <ThreePanelLayout
      leftPanel={<GlobalNavSidebar />}
      centerPanel={
        <CenterPanel>
          <PanelHeader title="Subscription Plans" />
          <PanelContent className="p-8 md:p-12">
            <div className="space-y-8">
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
                <Card padding="lg" className="mb-8">
                  <h3 className="text-lg font-semibold mb-3" style={{ color: DS.colors.text.primary }}>
                    Storage Usage
                  </h3>
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span style={{ color: DS.colors.text.secondary }}>Used</span>
                      <span style={{ color: DS.colors.text.primary }}>
                        {formatStorage(subscription.storage.used * 1024 * 1024 * 1024)} / {formatStorage(subscription.storage.limit * 1024 * 1024 * 1024)}
                      </span>
                    </div>
                    <div className="w-full bg-gray-800 rounded-full h-2">
                      <div
                        className="h-2 rounded-full transition-all"
                        style={{
                          width: `${Math.min(subscription.storage.percentUsed || 0, 100)}%`,
                          backgroundColor: (subscription.storage.percentUsed || 0) > 90 
                            ? DS.colors.accent.error 
                            : DS.colors.primary.blue
                        }}
                      />
                    </div>
                  </div>
                </Card>
              )}

              {/* Available Plans */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                {Object.entries(TIERS).map(([tierKey, tierInfo]) => {
                  const Icon = tierInfo.icon;
                  const isCurrent = tierKey === frontendTier;
                  const tierOrder = ['free', 'creator', 'studio'];
                  const isUpgrade = tierOrder.indexOf(tierKey) > tierOrder.indexOf(frontendTier);
                  
                  return (
                    <Card
                      key={tierKey}
                      padding="lg"
                      className="relative flex flex-col"
                      style={{
                        borderColor: isCurrent ? tierInfo.color : DS.colors.border.default,
                        backgroundColor: isCurrent ? `${tierInfo.color}10` : DS.colors.background.card,
                        minHeight: '100%',
                        ...(isCurrent ? { 
                          boxShadow: `0 0 0 2px ${tierInfo.color}40`
                        } : {})
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
                        <div className="flex flex-col items-center gap-1 mb-1">
                          <h3 className="text-xl font-bold" style={{ color: DS.colors.text.primary }}>
                            {tierInfo.name}
                          </h3>
                          {tierInfo.subtitle && (
                            <p className="text-sm" style={{ color: DS.colors.text.secondary }}>
                              {tierInfo.subtitle}
                            </p>
                          )}
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

                      <ul className="space-y-2 mb-6 flex-grow">
                        {tierInfo.features.map((feature, idx) => (
                          <li key={idx} className="flex items-start gap-2 text-sm">
                            <Check size={16} className="mt-0.5 flex-shrink-0" style={{ color: tierInfo.color }} />
                            <span style={{ color: DS.colors.text.secondary }}>{feature}</span>
                          </li>
                        ))}
                        {tierKey === 'free' && 'limitations' in tierInfo && tierInfo.limitations.map((limitation, idx) => (
                          <li key={idx} className="flex items-start gap-2 text-sm">
                            <X size={16} className="mt-0.5 flex-shrink-0" style={{ color: DS.colors.text.tertiary }} />
                            <span style={{ color: DS.colors.text.tertiary }}>{limitation}</span>
                          </li>
                        ))}
                      </ul>

                      <div className="mt-auto">
                        {isCurrent ? (
                          <Button
                            variant="secondary"
                            fullWidth
                            disabled
                          >
                            Current Plan
                          </Button>
                        ) : tierKey === 'free' ? (
                          <Button
                            variant="secondary"
                            fullWidth
                            disabled
                          >
                            Free Plan
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
                      </div>
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

