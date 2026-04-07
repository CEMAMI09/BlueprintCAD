'use client';

import type { LucideIcon } from 'lucide-react';
import { DesignSystem as DS } from '@/backend/lib/ui/design-system';

/** Default Lucide stroke for app UI (nav, dashboard, analytics) — crisp, consistent weight. */
export const LUCIDE_STROKE = 1.5;

/** Unified KPI stat icon size (site palette: primary blue on tinted blue, no rainbow accents). */
export const KPI_ICON_SIZE = 24;

const KPI_BLUE = DS.colors.primary.blue;

/**
 * Lucide `Download` + default row alignment sit the KPI tile a bit high next to the text block.
 * Apply to `StatKpiIcon` for the downloads metric only (`className={DOWNLOAD_KPI_TILE_CLASS}`).
 */
export const DOWNLOAD_KPI_TILE_CLASS = 'translate-y-2';

export function StatKpiIcon({
  icon: Icon,
  className = '',
  iconClassName = '',
}: {
  icon: LucideIcon;
  className?: string;
  /** Optional class on the SVG (e.g. optical nudge for asymmetric icons). */
  iconClassName?: string;
}) {
  return (
    <div
      className={`grid h-12 w-12 shrink-0 place-items-center rounded-lg leading-[0] ${className}`}
      style={{ backgroundColor: `${KPI_BLUE}22` }}
      aria-hidden
    >
      <Icon
        size={KPI_ICON_SIZE}
        strokeWidth={LUCIDE_STROKE}
        className={`block shrink-0 overflow-visible ${iconClassName}`}
        style={{ color: KPI_BLUE, display: 'block' }}
      />
    </div>
  );
}
