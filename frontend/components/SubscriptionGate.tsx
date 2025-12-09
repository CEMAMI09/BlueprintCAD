'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import UpgradeModal from './UpgradeModal';

interface SubscriptionGateProps {
  feature: string;
  requiredTier?: 'creator' | 'studio';
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
      maxPrivateProjects: 'creator', // Free has 1-2, Creator+ has unlimited
      canSell: 'free', // Free can sell with 15% fee
      canPostForums: 'free',
      canSaveQuotes: 'free',
      maxFolders: 'creator', // After free limit
      maxTeamMembers: 'studio',
      maxConversations: 'free', // Free has unlimited
      analytics: 'creator', // Sales analytics
      storefrontCustomization: 'creator',
      fileVersioning: 'creator',
      apiAccess: 'studio',
      manufacturingOrders: 'creator',
      teamCollaboration: 'studio',
      featuredListing: 'creator',
      licensingControls: 'creator',
      salesAnalytics: 'creator',
      sharedStorefront: 'studio',
      roleBasedPermissions: 'studio',
      priorityQuoting: 'studio',
    };
    return featureTierMap[featureName] || 'creator';
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
            requiredTier={checkResult?.requiredTier || requiredTier || 'creator'}
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

