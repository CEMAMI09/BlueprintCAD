'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { X } from 'lucide-react';
import { DesignSystem as DS } from '@/backend/lib/ui/design-system';

interface UpgradeModalProps {
  isOpen: boolean;
  onClose: () => void;
  requiredTier?: 'creator' | 'studio';
  feature?: string;
  reason?: string;
  currentTier?: string;
  featureName?: string;
  message?: string;
}

const TIER_INFO = {
  creator: {
    name: 'Creator',
    subtitle: 'Sell & Earn',
    price: 19,
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

export default function UpgradeModal({
  isOpen,
  onClose,
  requiredTier,
  feature,
  reason,
  currentTier,
  featureName,
  message,
}: UpgradeModalProps) {
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const tierInfo = requiredTier ? TIER_INFO[requiredTier] : null;

  if (!isOpen) return null;
  if (!tierInfo) return null;

  const handleUpgrade = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        router.push('/login');
        return;
      }

      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/subscriptions/upgrade`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ tier: requiredTier }),
      });

      if (!res.ok) {
        throw new Error('Failed to create checkout session');
      }

      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      }
    } catch (error) {
      console.error('Upgrade error:', error);
      alert('Failed to start upgrade process. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const getFeatureMessage = () => {
    if (reason === 'limit_exceeded') {
      return `You've reached your limit for this feature. Upgrade to ${tierInfo.name} to continue.`;
    }
    if (reason === 'feature_not_available') {
      return `This feature requires ${tierInfo.name} subscription.`;
    }
    return `Upgrade to ${tierInfo.name} to unlock this feature.`;
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ backgroundColor: 'rgba(0, 0, 0, 0.75)' }}
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-2xl mx-4 rounded-xl p-6"
        style={{
          backgroundColor: DS.colors.background.card,
          border: `1px solid ${DS.colors.border.default}`,
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded-lg hover:bg-gray-800 transition-colors"
          style={{ color: DS.colors.text.secondary }}
        >
          <X size={20} />
        </button>

        <div className="text-center mb-6">
          <h2
            className="text-3xl font-bold mb-2"
            style={{ color: DS.colors.text.primary }}
          >
            Upgrade to {tierInfo.name}
          </h2>
          {tierInfo.subtitle && (
            <p
              className="text-sm mb-2"
              style={{ color: DS.colors.text.tertiary }}
            >
              {tierInfo.subtitle}
            </p>
          )}
          <p
            className="text-lg mb-4"
            style={{ color: DS.colors.text.secondary }}
          >
            ${tierInfo.price}/month
          </p>
          <p
            className="text-sm"
            style={{ color: DS.colors.text.tertiary }}
          >
            {getFeatureMessage()}
          </p>
        </div>

        <div className="mb-6">
          <h3
            className="text-lg font-semibold mb-3"
            style={{ color: DS.colors.text.primary }}
          >
            What you'll get:
          </h3>
          <ul className="space-y-2">
            {tierInfo.features.map((feature, idx) => (
              <li key={idx} className="flex items-start gap-2">
                <span
                  className="text-lg mt-0.5"
                  style={{ color: DS.colors.primary.blue }}
                >
                  ✓
                </span>
                <span style={{ color: DS.colors.text.secondary }}>{feature}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-3 rounded-lg font-medium transition-colors"
            style={{
              backgroundColor: DS.colors.background.panel,
              color: DS.colors.text.secondary,
              border: `1px solid ${DS.colors.border.default}`,
            }}
          >
            Maybe Later
          </button>
          <button
            onClick={handleUpgrade}
            disabled={loading}
            className="flex-1 px-4 py-3 rounded-lg font-medium transition-colors disabled:opacity-50"
            style={{
              backgroundColor: DS.colors.primary.blue,
              color: '#ffffff',
            }}
          >
            {loading ? 'Processing...' : `Upgrade to ${tierInfo.name}`}
          </button>
        </div>
      </div>
    </div>
  );
}

