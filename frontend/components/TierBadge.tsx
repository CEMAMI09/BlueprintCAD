/**
 * TierBadge Component
 * Displays subscription tier badges for users
 * Free → no badge
 * Premium → blue badge
 * Pro → purple badge
 */

'use client';

import React from 'react';
import { DesignSystem as DS } from '@/backend/lib/ui/design-system';

interface TierBadgeProps {
  tier: string | null | undefined;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export default function TierBadge({ tier, size = 'sm', className = '' }: TierBadgeProps) {
  // Debug logging
  console.log('[TierBadge] Rendering with tier:', tier, 'type:', typeof tier);
  
  // Normalize tier name
  const normalizedTier = tier?.toLowerCase() || 'free';
  
  console.log('[TierBadge] Normalized tier:', normalizedTier);
  
  // Free tier shows nothing
  if (normalizedTier === 'free' || !tier) {
    console.log('[TierBadge] Not showing badge - tier is free or null');
    return null;
  }

  // Determine badge style and label
  // Map backend tiers to frontend badges:
  // - Backend "pro" → Frontend "Premium" (blue badge)
  // - Backend "creator" or "enterprise" → Frontend "Pro" (purple badge)
  // - Frontend "premium" → Frontend "Premium" (blue badge)
  // - Frontend "pro" → Frontend "Pro" (purple badge)
  let badgeStyle: React.CSSProperties;
  let label: string;
  
  if (normalizedTier === 'premium' || normalizedTier === 'pro') {
    // Premium/Pro (backend "pro" tier) → blue badge
    badgeStyle = {
      backgroundColor: DS.colors.primary.blue,
      color: '#ffffff',
    };
    label = 'Premium';
  } else if (normalizedTier === 'creator' || normalizedTier === 'enterprise') {
    // Creator/Enterprise → purple badge
    badgeStyle = {
      backgroundColor: '#9333ea', // Purple
      color: '#ffffff',
    };
    label = 'Pro';
  } else {
    // Unknown tier → no badge
    return null;
  }

  // Size classes
  const sizeClasses = {
    sm: 'text-xs px-2 py-0.5',
    md: 'text-sm px-2.5 py-1',
    lg: 'text-base px-3 py-1.5',
  };

  return (
    <span
      className={`inline-flex items-center font-semibold rounded-full ${sizeClasses[size]} ${className}`}
      style={badgeStyle}
      title={`${tier.charAt(0).toUpperCase() + tier.slice(1)} tier`}
    >
      {label}
    </span>
  );
}

