/**
 * TierBadge Component
 * Displays subscription tier badges for users
 * Free → grey badge with "Free" (no crown)
 * Creator → blue badge with crown
 * Studio → purple badge with crown
 */

'use client';

import React from 'react';
import { Crown } from 'lucide-react';
import { DesignSystem as DS } from '@/backend/lib/ui/design-system';

interface TierBadgeProps {
  tier: string | null | undefined;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export default function TierBadge({ tier, size = 'sm', className = '' }: TierBadgeProps) {
  // Normalize tier name
  const normalizedTier = tier?.toLowerCase() || 'free';
  
  // Determine badge style and label
  let badgeStyle: React.CSSProperties;
  let label: string;
  let showCrown: boolean = false;
  
  if (normalizedTier === 'free') {
    // Free tier → grey badge, no crown
    badgeStyle = {
      backgroundColor: DS.colors.background.elevated,
      color: DS.colors.text.secondary,
      border: `1px solid ${DS.colors.border.default}`,
    };
    label = 'Free';
    showCrown = false;
  } else if (normalizedTier === 'creator') {
    // Creator → blue badge with crown
    badgeStyle = {
      backgroundColor: DS.colors.primary.blue,
      color: '#ffffff',
    };
    label = 'Creator';
    showCrown = true;
  } else if (normalizedTier === 'studio') {
    // Studio → purple badge with crown
    badgeStyle = {
      backgroundColor: '#9333ea', // Purple
      color: '#ffffff',
    };
    label = 'Studio';
    showCrown = true;
  } else {
    // Legacy tiers or unknown → map to closest
    if (normalizedTier === 'premium' || normalizedTier === 'pro') {
      badgeStyle = {
        backgroundColor: DS.colors.primary.blue,
        color: '#ffffff',
      };
      label = 'Creator';
      showCrown = true;
    } else if (normalizedTier === 'enterprise') {
      badgeStyle = {
        backgroundColor: '#9333ea',
        color: '#ffffff',
      };
      label = 'Studio';
      showCrown = true;
    } else {
      // Unknown tier → show as free
      badgeStyle = {
        backgroundColor: DS.colors.background.elevated,
        color: DS.colors.text.secondary,
        border: `1px solid ${DS.colors.border.default}`,
      };
      label = 'Free';
      showCrown = false;
    }
  }

  // Size classes
  const sizeClasses = {
    sm: 'text-xs px-2 py-0.5',
    md: 'text-sm px-2.5 py-1',
    lg: 'text-base px-3 py-1.5',
  };

  const iconSizes = {
    sm: 12,
    md: 14,
    lg: 16,
  };

  return (
    <span
      className={`inline-flex items-center gap-1 font-semibold rounded-full ${sizeClasses[size]} ${className}`}
      style={badgeStyle}
      title={`${label} tier`}
    >
      {showCrown && (
        <Crown 
          size={iconSizes[size]} 
          style={{ 
            color: badgeStyle.color, 
            fill: 'none', 
            stroke: badgeStyle.color,
            strokeWidth: 2 
          }}
        />
      )}
      {label}
    </span>
  );
}

