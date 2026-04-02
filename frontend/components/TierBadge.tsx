/**
 * TierBadge — paid tiers only (Creator, Studio). Free users get no badge.
 * Tier strings are normalized like the API (enterprise → studio, pro/premium → creator).
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

/** Match backend/lib/subscriptionFeatures.js normalizeTier */
function normalizeTier(
  raw: string | null | undefined
): 'free' | 'creator' | 'studio' {
  if (raw == null || raw === '') return 'free';
  const r = String(raw).toLowerCase().trim();
  const legacy: Record<string, 'creator' | 'studio'> = {
    enterprise: 'studio',
    pro: 'creator',
    premium: 'creator',
    team: 'studio',
  };
  if (legacy[r]) return legacy[r];
  if (r === 'creator' || r === 'studio' || r === 'free') return r;
  return 'free';
}

export default function TierBadge({
  tier,
  size = 'sm',
  className = '',
}: TierBadgeProps) {
  const t = normalizeTier(tier);
  if (t === 'free') return null;

  let badgeStyle: React.CSSProperties;
  let label: string;

  if (t === 'creator') {
    badgeStyle = {
      backgroundColor: DS.colors.primary.blue,
      color: '#ffffff',
    };
    label = 'Creator';
  } else {
    badgeStyle = {
      backgroundColor: '#9333ea',
      color: '#ffffff',
    };
    label = 'Studio';
  }

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
      <Crown
        size={iconSizes[size]}
        style={{
          color: badgeStyle.color,
          fill: 'none',
          stroke: badgeStyle.color,
          strokeWidth: 2,
        }}
      />
      {label}
    </span>
  );
}
