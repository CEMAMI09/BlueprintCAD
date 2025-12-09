/**
 * Marketplace Page - Steam/Itch.io Style
 * Browse and purchase hardware designs with filters and detailed listings
 */

'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  ThreePanelLayout,
  CenterPanel,
  RightPanel,
  PanelHeader,
  PanelContent,
} from '@/components/ui/ThreePanelLayout';
import { GlobalNavSidebar } from '@/components/ui/GlobalNavSidebar';
import { Button, Card, Badge, SearchBar, EmptyState } from '@/components/ui/UIComponents';
import { DesignSystem as DS } from '@/backend/lib/ui/design-system';
import SubscriptionGate from '@/frontend/components/SubscriptionGate';
import UpgradeModal from '@/frontend/components/UpgradeModal';
import TierBadge from '@/frontend/components/TierBadge';
import {
  DollarSign,
  Star,
  Download,
  Eye,
  ShoppingCart,
  Filter,
  Grid3x3,
  List,
  TrendingUp,
  Award,
  Search,
  User,
  MessageCircle,
  GitBranch,
  Calendar,
} from 'lucide-react';

interface Listing {
  id: string;
  title: string;
  description: string;
  price: number;
  currency: string;
  thumbnail: string;
  thumbnailUrl?: string | null;
  seller: {
    username: string;
    avatar: string;
    verified: boolean;
    rating: number;
    subscription_tier?: string;
  };
  category: string;
  tags: string[];
  rating: number;
  reviews: number;
  downloads: number;
  versions: { version: string; date: string; notes: string }[];
  license: string;
  featured: boolean;
  createdAt: string;
  fileUrl?: string | null;
  fileType?: string | null;
}

export default function MarketplacePage() {
  const [selectedListing, setSelectedListing] = useState<Listing | null>(null);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All Categories');
  const [priceRange, setPriceRange] = useState<[number, number]>([0, 1000]);
  const [sortBy, setSortBy] = useState('popular');
  const [sliderRef, setSliderRef] = useState<HTMLInputElement | null>(null);

  const categories = ['All Categories', 'Electronics', 'Mechanical', '3D Printing', 'Robotics', 'IoT', 'Automotive', 'Other'];
  

  const [listings, setListings] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState('');
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [upgradeTier, setUpgradeTier] = useState<'pro' | 'creator' | 'enterprise'>('pro');

  useEffect(() => {
    const fetchListings = async () => {
      setLoading(true);
      setFetchError('');
      try {
        const res = await fetch('/api/projects?for_sale=true');
        if (res.ok) {
          const projects = await res.json();
          // Map API data to Listing format
          const mappedListings: Listing[] = projects.map((p: any) => ({
            id: p.id.toString(),
            title: p.name || p.title,
            description: p.description || '',
            price: p.price || 0,
            currency: 'USD',
            thumbnail: p.thumbnail_path || '',
            thumbnailUrl: p.thumbnail_path ? (() => {
              const thumbnailPath = String(p.thumbnail_path);
              const filename = thumbnailPath.includes('/') 
                ? thumbnailPath.split('/').pop() 
                : thumbnailPath;
              // Add cache-busting query parameter to ensure fresh images
              return `/api/thumbnails/${encodeURIComponent(filename || "fallback")}?t=${Date.now()}`;
            })() : null,
            seller: {
              username: p.username,
              avatar: p.profile_picture || '',
              verified: !!p.seller_verified,
              rating: p.seller_rating || 0,
              subscription_tier: p.subscription_tier || null,
            },
            category: p.category || 'Other',
            tags: p.tags ? p.tags.split(',') : [],
            rating: p.rating || 0,
            reviews: p.review_count || 0,
            downloads: p.downloads || 0,
            createdAt: p.created_at || p.createdAt || new Date().toISOString(),
            versions: p.versions || [],
            license: p.license || '',
            featured: !!p.featured,
            fileUrl: p.file_path && p.file_type && ['stl','obj','fbx','gltf','glb','ply','dae','collada'].includes(p.file_type.toLowerCase().replace('.', ''))
              ? `/api/files/${encodeURIComponent(String(p.file_path))}`
              : null,
            fileType: p.file_type ? (p.file_type.startsWith('.') ? p.file_type : `.${p.file_type}`) : null,
          }));
          setListings(mappedListings);
          // Debug: log mapped listings to confirm file URLs/types
          // eslint-disable-next-line no-console
          console.log('Marketplace: mapped listings ->', mappedListings.map(l => ({ id: l.id, title: l.title, fileUrl: l.fileUrl, fileType: l.fileType })));
        } else {
          setFetchError('Failed to load marketplace listings.');
        }
      } catch (err) {
        setFetchError('Network error while loading listings.');
      } finally {
        setLoading(false);
      }
    };
    fetchListings();
  }, []);

  // Filter listings
  let filteredListings = listings.filter(listing => {
    const matchesSearch = listing.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         listing.description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === 'All Categories' || 
                           listing.category === selectedCategory ||
                           (selectedCategory === 'Other' && !categories.slice(1, -1).includes(listing.category));
    const matchesPrice = listing.price >= priceRange[0] && listing.price <= priceRange[1];
    return matchesSearch && matchesCategory && matchesPrice;
  });

  // Sort listings
  filteredListings = [...filteredListings].sort((a, b) => {
    switch (sortBy) {
      case 'popular':
        // Sort by downloads + reviews (popularity)
        const popularityA = (a.downloads || 0) + (a.reviews || 0) * 10;
        const popularityB = (b.downloads || 0) + (b.reviews || 0) * 10;
        return popularityB - popularityA;
      case 'recent':
        // Sort by creation date (most recent first)
        const dateA = new Date(a.createdAt || 0).getTime();
        const dateB = new Date(b.createdAt || 0).getTime();
        return dateB - dateA;
      case 'price_low':
        return a.price - b.price;
      case 'price_high':
        return b.price - a.price;
      case 'rating':
        return (b.rating || 0) - (a.rating || 0);
      default:
        return 0;
    }
  });

  return (
    <ThreePanelLayout
      leftPanel={<GlobalNavSidebar />}
      centerPanel={
        <CenterPanel>
          <PanelHeader 
            title="Hardware Marketplace"
            actions={
              <div className="flex items-center gap-3">
                <Link href="/upload" title="Upload a new design">
                  <Button
                    variant="ghost"
                    size="md"
                    icon={<svg xmlns='http://www.w3.org/2000/svg' className='h-5 w-5' fill='none' viewBox='0 0 24 24' stroke='currentColor'><path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M4 16v2a2 2 0 002 2h12a2 2 0 002-2v-2M7 10l5-5m0 0l5 5m-5-5v12' /></svg>}
                    iconPosition="left"
                    className="font-bold border border-[#2A2A2A] bg-transparent text-[#A0A0A0] rounded-full px-5 py-2 hover:bg-[#181818] hover:border-[#333333] hover:text-[#E0E0E0] hover:scale-105 transition-transform"
                  >
                    Upload Design
                  </Button>
                </Link>
                <button
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    console.log('[Marketplace] Clicked grid button, current viewMode:', viewMode);
                    setViewMode('grid');
                  }}
                  className="inline-flex items-center justify-center gap-2 px-3 py-1.5 text-sm font-medium rounded-lg transition-all duration-200"
                  style={{
                    backgroundColor: viewMode === 'grid' ? DS.colors.primary.blue : DS.colors.background.elevated,
                    color: viewMode === 'grid' ? '#ffffff' : DS.colors.text.primary,
                    border: viewMode === 'grid' ? 'none' : `1px solid ${DS.colors.border.default}`,
                  }}
                  onMouseEnter={(e) => {
                    if (viewMode !== 'grid') {
                      e.currentTarget.style.backgroundColor = DS.colors.background.panelHover;
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (viewMode !== 'grid') {
                      e.currentTarget.style.backgroundColor = DS.colors.background.elevated;
                    }
                  }}
                  aria-label="Grid View"
                >
                  <Grid3x3 size={16} />
                </button>
                <button
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    console.log('[Marketplace] Clicked list button, current viewMode:', viewMode);
                    setViewMode('list');
                  }}
                  className="inline-flex items-center justify-center gap-2 px-3 py-1.5 text-sm font-medium rounded-lg transition-all duration-200"
                  style={{
                    backgroundColor: viewMode === 'list' ? DS.colors.primary.blue : DS.colors.background.elevated,
                    color: viewMode === 'list' ? '#ffffff' : DS.colors.text.primary,
                    border: viewMode === 'list' ? 'none' : `1px solid ${DS.colors.border.default}`,
                  }}
                  onMouseEnter={(e) => {
                    if (viewMode !== 'list') {
                      e.currentTarget.style.backgroundColor = DS.colors.background.panelHover;
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (viewMode !== 'list') {
                      e.currentTarget.style.backgroundColor = DS.colors.background.elevated;
                    }
                  }}
                  aria-label="List View"
                >
                  <List size={16} />
                </button>
              </div>
            }
          />
          
          <PanelContent>
            <div className="py-6 pl-4 md:pl-8 pr-0">
              <div className="flex gap-4">
              {/* Filters Sidebar - INSIDE center panel */}
              <div className="w-64 flex-shrink-0">
                <div className="sticky top-0 space-y-6">
                  {/* Search */}
                  <div>
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2" size={20} style={{ color: DS.colors.text.tertiary }} />
                      <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Search marketplace..."
                        className="w-full pl-10 pr-4 py-2.5 rounded-lg border"
                        style={{
                          backgroundColor: DS.colors.background.panel,
                          borderColor: DS.colors.border.default,
                          color: DS.colors.text.primary
                        }}
                      />
                    </div>
                  </div>

                  {/* Categories */}
                  <Card padding="md">
                    <h3 className="font-semibold mb-3" style={{ color: DS.colors.text.primary }}>
                      Categories
                    </h3>
                    <div className="space-y-2">
                      {categories.map((category) => (
                        <button
                          key={category}
                          onClick={() => setSelectedCategory(category)}
                          className="w-full text-left px-3 py-2 rounded-lg transition-colors"
                          style={{
                            backgroundColor: selectedCategory === category
                              ? DS.colors.primary.blue + '20'
                              : 'transparent',
                            color: selectedCategory === category
                              ? DS.colors.primary.blue
                              : DS.colors.text.primary,
                          }}
                        >
                          {category}
                        </button>
                      ))}
                    </div>
                  </Card>

                  {/* Price Range */}
                  <Card padding="md">
                    <h3 className="font-semibold mb-3" style={{ color: DS.colors.text.primary }}>
                      Price Range
                    </h3>
                    <div className="space-y-3">
                      <input
                        ref={(el) => {
                          if (el && !sliderRef) {
                            setSliderRef(el);
                            const value = parseInt(el.value);
                            const percentage = (value / 1000) * 100;
                            el.style.background = `linear-gradient(to right, ${DS.colors.primary.blue} 0%, ${DS.colors.primary.blue} ${percentage}%, ${DS.colors.background.elevated} ${percentage}%, ${DS.colors.background.elevated} 100%)`;
                          }
                        }}
                        type="range"
                        min="0"
                        max="1000"
                        value={priceRange[1]}
                        onChange={(e) => {
                          const value = parseInt(e.target.value);
                          setPriceRange([0, value]);
                          const target = e.target as HTMLInputElement;
                          const percentage = (value / 1000) * 100;
                          target.style.background = `linear-gradient(to right, ${DS.colors.primary.blue} 0%, ${DS.colors.primary.blue} ${percentage}%, ${DS.colors.background.elevated} ${percentage}%, ${DS.colors.background.elevated} 100%)`;
                        }}
                        className="w-full"
                        style={{
                          accentColor: DS.colors.primary.blue,
                          WebkitAppearance: 'none',
                          appearance: 'none',
                          height: '6px',
                          borderRadius: '3px',
                          background: `linear-gradient(to right, ${DS.colors.primary.blue} 0%, ${DS.colors.primary.blue} ${(priceRange[1] / 1000) * 100}%, ${DS.colors.background.elevated} ${(priceRange[1] / 1000) * 100}%, ${DS.colors.background.elevated} 100%)`,
                          outline: 'none',
                        }}
                      />
                      <style dangerouslySetInnerHTML={{__html: `
                        input[type="range"]::-webkit-slider-thumb {
                          -webkit-appearance: none;
                          appearance: none;
                          width: 18px;
                          height: 18px;
                          border-radius: 50%;
                          background: ${DS.colors.primary.blue};
                          cursor: pointer;
                          border: 2px solid ${DS.colors.background.panel};
                          margin-top: -6px;
                          transform: translateY(-0.25px);
                        }
                        input[type="range"]::-moz-range-thumb {
                          width: 18px;
                          height: 18px;
                          border-radius: 50%;
                          background: ${DS.colors.primary.blue};
                          cursor: pointer;
                          border: 2px solid ${DS.colors.background.panel};
                        }
                        input[type="range"]::-webkit-slider-runnable-track {
                          height: 6px;
                          border-radius: 3px;
                        }
                        input[type="range"]::-moz-range-track {
                          height: 6px;
                          border-radius: 3px;
                          background: ${DS.colors.background.elevated};
                        }
                      `}} />
                      <div className="flex justify-between text-sm" style={{ color: DS.colors.text.secondary }}>
                        <span>${priceRange[0]}</span>
                        <span>${priceRange[1]}</span>
                      </div>
                    </div>
                  </Card>

                  {/* Sort By */}
                  <Card padding="md">
                    <h3 className="font-semibold mb-3" style={{ color: DS.colors.text.primary }}>
                      Sort By
                    </h3>
                    <select
                      value={sortBy}
                      onChange={(e) => setSortBy(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg border"
                      style={{
                        backgroundColor: DS.colors.background.card,
                        borderColor: DS.colors.border.default,
                        color: DS.colors.text.primary,
                      }}
                    >
                      <option value="popular">Most Popular</option>
                      <option value="recent">Recently Added</option>
                      <option value="price_low">Price: Low to High</option>
                      <option value="price_high">Price: High to Low</option>
                      <option value="rating">Highest Rated</option>
                    </select>
                  </Card>
                </div>
              </div>

              {/* Listings Grid */}
              <div className="flex-1 min-w-0">
                {/* Featured Banner */}
                {filteredListings.some(l => l.featured) && (
                  <Card padding="lg" className="mb-6">
                    <div className="flex items-center gap-2 mb-6">
                      <Award size={24} style={{ color: DS.colors.accent.warning }} />
                      <h3 className="text-lg font-semibold" style={{ color: DS.colors.text.primary }}>
                        Featured Listings
                      </h3>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {filteredListings.filter(l => l.featured).map((listing) => (
                        <Card
                          key={listing.id}
                          hover
                          padding="md"
                          onClick={() => setSelectedListing(listing)}
                          style={{
                            cursor: 'pointer',
                            borderColor: selectedListing?.id === listing.id ? DS.colors.primary.blue : DS.colors.border.default,
                          }}
                        >
                          <div className="flex items-start gap-4">
                            <div className="w-20 h-20 rounded-lg flex-shrink-0" style={{ backgroundColor: DS.colors.background.panelHover }} />
                            <div className="flex-1 min-w-0">
                              <h3 className="font-semibold mb-1 truncate" style={{ color: DS.colors.text.primary }}>
                                {listing.title}
                              </h3>
                              <div className="flex items-center gap-2 mb-2">
                                <Badge variant="primary" size="sm">Featured</Badge>
                                <Badge variant="primary" size="sm">
                                  ${listing.price}
                                </Badge>
                              </div>
                              <div className="flex items-center gap-2 mb-2">
                                <div 
                                  className="w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0"
                                  style={{ 
                                    backgroundColor: listing.seller.avatar ? 'transparent' : DS.colors.primary.blue,
                                    color: '#ffffff'
                                  }}
                                >
                                  {listing.seller.avatar ? (
                                    <img
                                      src={`/api/users/profile-picture/${listing.seller.avatar}`}
                                      alt={listing.seller.username}
                                      className="w-full h-full rounded-full object-cover"
                                      onError={(e) => {
                                        e.currentTarget.style.display = 'none';
                                        const parent = e.currentTarget.parentElement;
                                        if (parent) {
                                          parent.style.backgroundColor = DS.colors.primary.blue;
                                          parent.textContent = listing.seller.username.substring(0, 2).toUpperCase();
                                        }
                                      }}
                                    />
                                  ) : (
                                    listing.seller.username.substring(0, 2).toUpperCase()
                                  )}
                                </div>
                                <span className="text-xs" style={{ color: DS.colors.text.secondary }}>
                                  @{listing.seller.username}
                                </span>
                                <TierBadge tier={listing.seller.subscription_tier} size="sm" />
                              </div>
                              <div className="flex items-center gap-3 text-sm" style={{ color: DS.colors.text.secondary }}>
                                <span className="flex items-center gap-1">
                                  <Star size={14} style={{ color: DS.colors.accent.warning }} />
                                  {listing.rating}
                                </span>
                                <span className="flex items-center gap-1">
                                  <Download size={14} />
                                  {listing.downloads}
                                </span>
                              </div>
                            </div>
                          </div>
                        </Card>
                      ))}
                    </div>
                  </Card>
                )}

                {/* All Listings */}
                {viewMode === 'grid' ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {filteredListings.map((listing) => (
                      <Link href={`/project/${listing.id}`} key={listing.id} style={{ textDecoration: 'none' }}>
                        <Card
                          hover
                          padding="none"
                          style={{
                            cursor: 'pointer',
                            borderColor: selectedListing?.id === listing.id ? DS.colors.primary.blue : DS.colors.border.default,
                          }}
                        >
                          <div className="aspect-video rounded-t-lg overflow-hidden relative" style={{ backgroundColor: DS.colors.background.panel, minHeight: '180px' }}>
                            {listing.thumbnailUrl ? (
                              <img
                                key={`thumb-${listing.id}-${listing.thumbnailUrl}`}
                                src={listing.thumbnailUrl}
                                alt={listing.title}
                                className="design-thumbnail"
                                loading="lazy"
                                style={{ 
                                  width: '100%',
                                  height: '100%',
                                  objectFit: 'cover',
                                  display: 'block'
                                }}
                                onError={(e) => {
                                  console.error(`[Marketplace] Failed to load thumbnail for ${listing.id}:`, listing.thumbnailUrl, e);
                                  const img = e.currentTarget;
                                  img.style.display = 'none';
                                  const container = img.parentElement;
                                  if (container) {
                                    let fallback = container.querySelector('.thumbnail-fallback') as HTMLElement;
                                    if (!fallback) {
                                      fallback = document.createElement('div');
                                      fallback.className = 'thumbnail-fallback flex flex-col items-center justify-center w-full h-full absolute inset-0';
                                      fallback.style.zIndex = '1';
                                      fallback.innerHTML = '<span class="text-5xl mb-2">📦</span><span class="text-xs">No thumbnail available</span>';
                                      container.appendChild(fallback);
                                    }
                                    fallback.style.display = 'flex';
                                  }
                                }}
                                onLoad={() => {
                                  console.log(`[Marketplace] Successfully loaded thumbnail for ${listing.id}:`, listing.thumbnailUrl);
                                }}
                              />
                            ) : (
                              <div className="flex flex-col items-center justify-center w-full h-full">
                                <span className="text-5xl mb-2">📦</span>
                                <span className="text-xs" style={{ color: DS.colors.text.tertiary }}>No thumbnail available</span>
                              </div>
                            )}
                          </div>
                          <div className="p-4">
                            <h3 className="font-semibold mb-2 truncate" style={{ color: DS.colors.text.primary }}>
                              {listing.title}
                            </h3>
                            <div className="flex items-center justify-between mb-3">
                              <Badge variant="primary" size="sm">
                                ${listing.price}
                              </Badge>
                              <Badge variant="default" size="sm">{listing.category}</Badge>
                            </div>
                            <div className="flex items-center gap-2 mb-2">
                              <div 
                                className="w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0"
                                style={{ 
                                  backgroundColor: listing.seller.avatar ? 'transparent' : DS.colors.primary.blue,
                                  color: '#ffffff'
                                }}
                              >
                                {listing.seller.avatar ? (
                                  <img
                                    src={`/api/users/profile-picture/${listing.seller.avatar}`}
                                    alt={listing.seller.username}
                                    className="w-full h-full rounded-full object-cover"
                                    onError={(e) => {
                                      e.currentTarget.style.display = 'none';
                                      const parent = e.currentTarget.parentElement;
                                      if (parent) {
                                        parent.style.backgroundColor = DS.colors.primary.blue;
                                        parent.textContent = listing.seller.username.substring(0, 2).toUpperCase();
                                      }
                                    }}
                                  />
                                ) : (
                                  listing.seller.username.substring(0, 2).toUpperCase()
                                )}
                              </div>
                              <span className="text-xs" style={{ color: DS.colors.text.secondary }}>
                                @{listing.seller.username}
                              </span>
                            </div>
                            <div className="flex items-center gap-4 text-sm" style={{ color: DS.colors.text.secondary }}>
                              <span className="flex items-center gap-1">
                                <Star size={14} style={{ color: DS.colors.accent.warning }} />
                                {listing.rating}
                              </span>
                              <span className="flex items-center gap-1">
                                <Download size={14} />
                                {listing.downloads}
                              </span>
                              <span className="flex items-center gap-1">
                                <MessageCircle size={14} />
                                {listing.reviews}
                              </span>
                            </div>
                          </div>
                        </Card>
                      </Link>
                    ))}
                  </div>
                ) : (
                  <div className="space-y-3">
                    {filteredListings.map((listing) => (
                      <Card
                        key={listing.id}
                        hover
                        padding="md"
                        onClick={() => setSelectedListing(listing)}
                        style={{
                          cursor: 'pointer',
                          borderColor: selectedListing?.id === listing.id ? DS.colors.primary.blue : DS.colors.border.default,
                        }}
                      >
                        <div className="flex items-center gap-4">
                          <div className="w-24 h-24 rounded-lg flex-shrink-0 overflow-hidden" style={{ backgroundColor: DS.colors.background.panelHover }}>
                            {listing.thumbnailUrl ? (
                              <img
                                src={listing.thumbnailUrl}
                                alt={listing.title}
                                className="w-full h-full object-cover"
                                loading="lazy"
                                onError={(e) => {
                                  e.currentTarget.style.display = 'none';
                                }}
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center text-2xl">
                                📦
                              </div>
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between mb-2">
                              <h3 className="font-semibold" style={{ color: DS.colors.text.primary }}>
                                {listing.title}
                              </h3>
                              <Badge variant="primary" size="sm" className="ml-4">
                                ${listing.price}
                              </Badge>
                            </div>
                            <p className="text-sm mb-3 line-clamp-2" style={{ color: DS.colors.text.secondary }}>
                              {listing.description}
                            </p>
                            <div className="flex items-center gap-4 text-sm" style={{ color: DS.colors.text.secondary }}>
                              <Badge variant="default" size="sm">{listing.category}</Badge>
                              <span className="flex items-center gap-1">
                                <Star size={14} style={{ color: DS.colors.accent.warning }} />
                                {listing.rating} ({listing.reviews} reviews)
                              </span>
                              <span className="flex items-center gap-1">
                                <Download size={14} />
                                {listing.downloads} downloads
                              </span>
                            </div>
                          </div>
                        </div>
                      </Card>
                    ))}
                  </div>
                )}

                {filteredListings.length === 0 && (
                  <EmptyState
                    icon={<ShoppingCart size={48} />}
                    title="No listings found"
                    description="Try adjusting your filters or search query"
                  />
                )}
              </div>
            </div>
            </div>
          </PanelContent>
        </CenterPanel>
      }
      rightPanel={
        selectedListing ? (
          <RightPanel>
            <PanelHeader 
              title="Listing Details"
              actions={
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setSelectedListing(null)}
                >
                  ✕
                </Button>
              }
            />
            <PanelContent>
              <div className="space-y-6">
                {/* Preview */}
                <div className="rounded-lg overflow-hidden" style={{ backgroundColor: DS.colors.background.panelHover }}>
                  {selectedListing.thumbnailUrl ? (
                    <img
                      src={selectedListing.thumbnailUrl}
                      alt={selectedListing.title}
                      className="design-thumbnail w-full h-full object-cover"
                      style={{ maxHeight: '400px' }}
                      loading="lazy"
                      onError={(e) => {
                        e.currentTarget.style.display = 'none';
                        const fallback = e.currentTarget.nextElementSibling;
                        if (fallback) (fallback as HTMLElement).style.display = 'flex';
                      }}
                    />
                  ) : null}
                  <div 
                    className="aspect-video flex items-center justify-center"
                    style={{ display: selectedListing.thumbnailUrl ? 'none' : 'flex' }}
                  >
                    <div className="flex flex-col items-center justify-center w-full h-full">
                      <span className="text-5xl mb-2">📦</span>
                      <span className="text-xs" style={{ color: DS.colors.text.tertiary }}>No thumbnail available</span>
                    </div>
                  </div>
                </div>

                {/* Title & Price */}
                <div>
                  <h2 className="text-2xl font-bold mb-2" style={{ color: DS.colors.text.primary }}>
                    {selectedListing.title}
                  </h2>
                  <div className="flex items-center gap-3 mb-4">
                    <Badge variant="primary" size="sm" className="text-lg">
                      ${selectedListing.price}
                    </Badge>
                    {selectedListing.featured && <Badge variant="primary">Featured</Badge>}
                  </div>
                  <Button variant="primary" icon={<ShoppingCart size={18} />} className="w-full mb-3">
                    Add to Cart
                  </Button>
                  <Button variant="secondary" icon={<Eye size={18} />} className="w-full">
                    Preview Files
                  </Button>
                </div>

                {/* Description */}
                <Card padding="md">
                  <h3 className="font-semibold mb-2" style={{ color: DS.colors.text.primary }}>
                    Description
                  </h3>
                  <p style={{ color: DS.colors.text.secondary }}>
                    {selectedListing.description}
                  </p>
                </Card>

                {/* Reviews */}
                <Card padding="md">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="font-semibold" style={{ color: DS.colors.text.primary }}>
                      Reviews
                    </h3>
                    <div className="flex items-center gap-2">
                      <Star size={18} style={{ color: DS.colors.accent.warning }} />
                      <span className="font-semibold" style={{ color: DS.colors.text.primary }}>
                        {selectedListing.rating}
                      </span>
                      <span className="text-sm" style={{ color: DS.colors.text.secondary }}>
                        ({selectedListing.reviews})
                      </span>
                    </div>
                  </div>
                  <Button variant="secondary" size="sm" className="w-full">
                    Read All Reviews
                  </Button>
                </Card>

                {/* Versions */}
                <Card padding="md">
                  <h3 className="font-semibold mb-3" style={{ color: DS.colors.text.primary }}>
                    Version History
                  </h3>
                  <div className="space-y-3">
                    {selectedListing.versions.map((version) => (
                      <div key={version.version} className="flex items-start gap-3">
                        <GitBranch size={16} style={{ color: DS.colors.primary.blue, marginTop: '4px' }} />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-mono text-sm font-semibold" style={{ color: DS.colors.text.primary }}>
                              v{version.version}
                            </span>
                            <span className="text-xs" style={{ color: DS.colors.text.secondary }}>
                              {version.date}
                            </span>
                          </div>
                          <p className="text-sm" style={{ color: DS.colors.text.secondary }}>
                            {version.notes}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </Card>

                {/* Seller Info */}
                <Card padding="md">
                  <h3 className="font-semibold mb-3" style={{ color: DS.colors.text.primary }}>
                    Seller Information
                  </h3>
                  <div className="flex items-center gap-3 mb-3">
                    <div 
                      className="w-12 h-12 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0"
                      style={{ 
                        backgroundColor: selectedListing.seller.avatar ? 'transparent' : DS.colors.primary.blue,
                        color: '#ffffff'
                      }}
                    >
                      {selectedListing.seller.avatar ? (
                        <img
                          src={`/api/users/profile-picture/${selectedListing.seller.avatar}`}
                          alt={selectedListing.seller.username}
                          className="w-full h-full rounded-full object-cover"
                          onError={(e) => {
                            e.currentTarget.style.display = 'none';
                            const parent = e.currentTarget.parentElement;
                            if (parent) {
                              parent.style.backgroundColor = DS.colors.primary.blue;
                              parent.textContent = selectedListing.seller.username.substring(0, 2).toUpperCase();
                            }
                          }}
                        />
                      ) : (
                        selectedListing.seller.username.substring(0, 2).toUpperCase()
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold" style={{ color: DS.colors.text.primary }}>
                          @{selectedListing.seller.username}
                        </span>
                        {selectedListing.seller.verified && (
                          <Badge variant="success" size="sm">Verified</Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-1">
                        <Star size={14} style={{ color: DS.colors.accent.warning }} />
                        <span className="text-sm" style={{ color: DS.colors.text.secondary }}>
                          {selectedListing.seller.rating} seller rating
                        </span>
                      </div>
                    </div>
                  </div>
                  <Button variant="secondary" icon={<User size={18} />} className="w-full">
                    View Seller Profile
                  </Button>
                </Card>

                {/* License */}
                <Card padding="md">
                  <h3 className="font-semibold mb-2" style={{ color: DS.colors.text.primary }}>
                    License
                  </h3>
                  <p className="text-sm" style={{ color: DS.colors.text.secondary }}>
                    {selectedListing.license}
                  </p>
                </Card>
              </div>
            </PanelContent>
          </RightPanel>
        ) : null
      }
    />
  );
}