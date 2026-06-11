'use client';

import Link from 'next/link';
import { Card, Badge } from '@/components/ui/UIComponents';
import { DesignSystem as DS } from '@/backend/lib/ui/design-system';
import TierBadge from '@/frontend/components/TierBadge';
import type { Design } from '@/frontend/lib/mapProjectsToDesigns';
import {
  Download,
  Star,
  Eye,
  Heart,
  Share2,
} from 'lucide-react';

function thumbSrc(thumbnailUrl: string | null | undefined) {
  if (!thumbnailUrl) return '';
  return thumbnailUrl.startsWith('/api/')
    ? `${process.env.NEXT_PUBLIC_API_URL || ''}${thumbnailUrl}`
    : thumbnailUrl;
}

export interface ExploreDesignGridProps {
  designs: Design[];
  viewMode: 'grid' | 'list';
  showShareButton?: boolean;
  onShare?: (design: Design) => void;
  /** When false, hides tier badge on author row (Explore “All Designs” legacy behavior). */
  showAuthorTierBadge?: boolean;
}

export function ExploreDesignGrid({
  designs,
  viewMode,
  showShareButton = false,
  onShare,
  showAuthorTierBadge = true,
}: ExploreDesignGridProps) {
  if (viewMode === 'grid') {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4 min-w-0 w-full">
        {designs.map((design) => (
          <Link href={`/project/${design.id}`} key={design.id} style={{ textDecoration: 'none' }} className="min-w-0 w-full">
            <Card hover padding="none" style={{ cursor: 'pointer' }} className="h-full flex flex-col min-w-0 w-full overflow-hidden">
              <div
                className="design-thumbnail-container rounded-t-lg flex-shrink-0"
                style={{ backgroundColor: DS.colors.background.panel }}
              >
                {design.thumbnailUrl ? (
                  <img
                    key={`thumb-${design.id}-${design.thumbnailUrl}`}
                    src={thumbSrc(design.thumbnailUrl)}
                    alt={design.title}
                    className="design-thumbnail"
                    loading="lazy"
                    onError={(e) => {
                      const img = e.currentTarget;
                      img.style.display = 'none';
                      const container = img.parentElement;
                      if (container) {
                        let fallback = container.querySelector('.thumbnail-fallback') as HTMLElement;
                        if (!fallback) {
                          fallback = document.createElement('div');
                          fallback.className =
                            'thumbnail-fallback flex flex-col items-center justify-center w-full h-full absolute inset-0';
                          fallback.style.zIndex = '1';
                          fallback.innerHTML = `<span class="text-5xl mb-2">${design.thumbnail}</span><span class="text-xs">No thumbnail available</span>`;
                          container.appendChild(fallback);
                        }
                        fallback.style.display = 'flex';
                      }
                    }}
                  />
                ) : (
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className="text-5xl mb-2">{design.thumbnail}</span>
                    <span className="text-xs" style={{ color: DS.colors.text.tertiary }}>
                      No thumbnail available
                    </span>
                  </div>
                )}
              </div>
              <div className="p-4 flex flex-col flex-grow min-h-[140px]">
                <div className="flex items-start justify-between mb-2">
                  <h3
                    className="font-semibold text-base line-clamp-1 flex-1"
                    style={{ color: DS.colors.text.primary }}
                  >
                    {design.title}
                  </h3>
                  {design.liked && (
                    <Heart
                      size={16}
                      fill={DS.colors.accent.error}
                      style={{ color: DS.colors.accent.error }}
                      className="flex-shrink-0 ml-2"
                    />
                  )}
                </div>
                <div className="flex items-center gap-2 mb-3">
                  <div
                    className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0"
                    style={{
                      backgroundColor: design.authorProfilePicture ? 'transparent' : DS.colors.primary.blue,
                      color: '#ffffff',
                    }}
                  >
                    {design.authorProfilePicture ? (
                      <img
                        src={`/api/users/profile-picture/${design.authorProfilePicture}`}
                        alt={design.author}
                        className="w-full h-full rounded-full object-cover"
                        onError={(e) => {
                          e.currentTarget.style.display = 'none';
                          const parent = e.currentTarget.parentElement;
                          if (parent) {
                            parent.style.backgroundColor = DS.colors.primary.blue;
                            parent.textContent = design.authorAvatar;
                          }
                        }}
                      />
                    ) : (
                      design.authorAvatar
                    )}
                  </div>
                  <span className="text-sm truncate" style={{ color: DS.colors.text.secondary }}>
                    {design.author}
                  </span>
                  {showAuthorTierBadge && <TierBadge tier={design.authorSubscriptionTier} size="sm" />}
                </div>
                <div className="flex items-center gap-4 text-sm mb-3" style={{ color: DS.colors.text.tertiary }}>
                  <div className="flex items-center gap-1">
                    <Star size={14} />
                    {design.stars}
                  </div>
                  <div className="flex items-center gap-1">
                    <Download size={14} />
                    {design.downloads}
                  </div>
                  <div className="flex items-center gap-1">
                    <Eye size={14} />
                    {design.views}
                  </div>
                </div>
                <div className="flex items-center justify-between mt-auto">
                  <div className="flex flex-wrap gap-2">
                    {design.tags.slice(0, 2).map((tag) => (
                      <Badge key={tag} variant="default" size="sm">
                        {tag}
                      </Badge>
                    ))}
                    {design.price !== null && (
                      <Badge variant="primary" size="sm">
                        ${design.price}
                      </Badge>
                    )}
                  </div>
                  {showShareButton && onShare && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        onShare(design);
                      }}
                      className="p-2 rounded-lg hover:bg-gray-800 transition"
                      style={{ color: DS.colors.text.secondary }}
                      title="Share design"
                    >
                      <Share2 size={16} />
                    </button>
                  )}
                </div>
              </div>
            </Card>
          </Link>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {designs.map((design) => (
        <Link
          href={`/project/${design.id}`}
          key={design.id}
          style={{ textDecoration: 'none', display: 'block' }}
        >
          <Card hover padding="md" style={{ cursor: 'pointer' }}>
            <div className="flex items-center gap-4">
              <div
                className="w-24 h-24 rounded-lg flex-shrink-0 overflow-hidden"
                style={{ backgroundColor: DS.colors.background.panelHover }}
              >
                {design.thumbnailUrl ? (
                  <img
                    src={thumbSrc(design.thumbnailUrl)}
                    alt={design.title}
                    className="w-full h-full object-cover"
                    loading="lazy"
                    onError={(e) => {
                      e.currentTarget.style.display = 'none';
                    }}
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-2xl">{design.thumbnail}</div>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between mb-2">
                  <h3 className="font-semibold" style={{ color: DS.colors.text.primary }}>
                    {design.title}
                  </h3>
                  {design.price !== null && (
                    <span className="text-xl font-bold ml-4" style={{ color: DS.colors.primary.blue }}>
                      ${design.price}
                    </span>
                  )}
                </div>
                <p className="text-sm mb-3 line-clamp-2" style={{ color: DS.colors.text.secondary }}>
                  {design.description}
                </p>
                <div className="flex items-center gap-4 text-sm flex-wrap" style={{ color: DS.colors.text.secondary }}>
                  {design.tags.slice(0, 2).map((tag) => (
                    <Badge key={tag} variant="default" size="sm">
                      {tag}
                    </Badge>
                  ))}
                  <span className="flex items-center gap-1">
                    <Star size={14} style={{ color: DS.colors.accent.warning }} />
                    {design.stars}
                  </span>
                  <span className="flex items-center gap-1">
                    <Download size={14} />
                    {design.downloads} downloads
                  </span>
                  <span className="flex items-center gap-1">
                    <Eye size={14} />
                    {design.views} views
                  </span>
                  {showAuthorTierBadge && (
                    <TierBadge tier={design.authorSubscriptionTier} size="sm" />
                  )}
                </div>
              </div>
            </div>
          </Card>
        </Link>
      ))}
    </div>
  );
}
