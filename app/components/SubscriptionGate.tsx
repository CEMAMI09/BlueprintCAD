'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import UpgradeModal from './UpgradeModal';

interface SubscriptionGateProps {
  feature: string;
  requiredTier?: 'pro' | 'creator' | 'enterprise';
  children: React.ReactNode;
  fallback?: React.ReactNode;
  showUpgradeModal?: boolean;
}

export default function SubscriptionGate({
  feature,
  requiredTier,
  children,
  fallback,
  showUpgradeModal = true,
}: SubscriptionGateProps) {
  const [hasAccess, setHasAccess] = useState<boolean | null>(null);
  const [checkResult, setCheckResult] = useState<any>(null);
  const [showModal, setShowModal] = useState(false);
  const router = useRouter();

  useEffect(() => {
    checkAccess();
  }, [feature]);

  const checkAccess = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        setHasAccess(false);
        return;
      }

      const res = await fetch('/api/subscriptions/check');
      if (!res.ok) {
        setHasAccess(false);
        return;
      }

      const data = await res.json();
      const featureValue = data.features[feature];

      // Check if feature is available
      if (featureValue === false || featureValue === 0) {
        setHasAccess(false);
        setCheckResult({
          allowed: false,
          reason: 'feature_not_available',
          requiredTier: requiredTier || getRequiredTier(feature),
        });
        return;
      }

      // If it's a limit-based feature, check usage
      if (typeof featureValue === 'number' && featureValue > 0) {
        // Check current usage via canPerformAction
        const actionRes = await fetch(`/api/subscriptions/can-action?feature=${feature}`);
        if (actionRes.ok) {
          const actionData = await actionRes.json();
          setHasAccess(actionData.allowed);
          setCheckResult(actionData);
        } else {
          setHasAccess(true); // Default to allowing if check fails
        }
      } else {
        // Feature is available (true or -1)
        setHasAccess(true);
      }
    } catch (error) {
      console.error('Subscription check error:', error);
      setHasAccess(false);
    }
  };

  const getRequiredTier = (featureName: string): string => {
    // Map features to required tiers
    const featureTierMap: { [key: string]: string } = {
      maxPrivateProjects: 'pro',
      canSell: 'pro',
      canPostForums: 'pro',
      canSaveQuotes: 'pro',
      maxFolders: 'pro', // After limit
      maxTeamMembers: 'pro',
      maxConversations: 'pro', // After limit
      analytics: 'pro',
      storefrontCustomization: 'creator',
      fileVersioning: 'creator',
      apiAccess: 'creator',
      whiteLabel: 'enterprise',
    };
    return featureTierMap[featureName] || 'pro';
  };

  const handleUpgrade = () => {
    if (showUpgradeModal) {
      setShowModal(true);
    } else {
      router.push('/subscription');
    }
  };

  if (hasAccess === null) {
    // Loading state
    return fallback || <div>Loading...</div>;
  }

  if (!hasAccess) {
    if (fallback) {
      return <>{fallback}</>;
    }

    return (
      <>
        {showModal && (
          <UpgradeModal
            isOpen={showModal}
            onClose={() => setShowModal(false)}
            requiredTier={checkResult?.requiredTier || requiredTier || 'pro'}
            feature={feature}
            reason={checkResult?.reason}
          />
        )}
        <div onClick={handleUpgrade} style={{ cursor: 'pointer' }}>
          {children}
        </div>
      </>
    );
  }

  return <>{children}</>;
}

