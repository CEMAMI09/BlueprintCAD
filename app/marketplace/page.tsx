/**
 * Marketplace Page - Steam/Itch.io Style
 * Browse and purchase hardware designs with filters and detailed listings
 */

'use client';

import { useState } from 'react';
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
import { DesignSystem as DS } from '@/lib/ui/design-system';
import {
  DollarSign,
  Star,
  Download,
  Eye,
  ShoppingCart,
  Filter,
  Grid,
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
  seller: {
    username: string;
    avatar: string;
    verified: boolean;
    rating: number;
  };
  category: string;
  tags: string[];
  rating: number;
  reviews: number;
  downloads: number;
  versions: { version: string; date: string; notes: string }[];
  license: string;
  featured: boolean;
}

export default function MarketplacePage() {
  const [selectedListing, setSelectedListing] = useState<Listing | null>(null);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [priceRange, setPriceRange] = useState<[number, number]>([0, 1000]);
  const [sortBy, setSortBy] = useState('popular');

  const categories = ['All Categories', 'Electronics', 'Mechanical', '3D Printing', 'Robotics', 'IoT', 'Automotive'];
  
  const listings: Listing[] = [];

  const filteredListings = listings.filter(listing => {
    const matchesSearch = listing.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         listing.description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === 'all' || listing.category === selectedCategory;
    const matchesPrice = listing.price >= priceRange[0] && listing.price <= priceRange[1];
    return matchesSearch && matchesCategory && matchesPrice;
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
                <Button
                  variant={viewMode === 'grid' ? 'primary' : 'secondary'}
                  size="sm"
                  icon={<Grid size={16} />}
                  onClick={() => setViewMode('grid')}
                />
                <Button
                  variant={viewMode === 'list' ? 'primary' : 'secondary'}
                  size="sm"
                  icon={<List size={16} />}
                  onClick={() => setViewMode('list')}
                />
              </div>
            }
          />
          
          <PanelContent>
            <div className="max-w-7xl mx-auto px-6 py-6">
              <div className="flex gap-6">
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
                          onClick={() => setSelectedCategory(category.toLowerCase().replace(' ', '_'))}
                          className="w-full text-left px-3 py-2 rounded-lg transition-colors"
                          style={{
                            backgroundColor: selectedCategory === category.toLowerCase().replace(' ', '_')
                              ? DS.colors.primary.blue + '20'
                              : 'transparent',
                            color: selectedCategory === category.toLowerCase().replace(' ', '_')
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
                        type="range"
                        min="0"
                        max="1000"
                        value={priceRange[1]}
                        onChange={(e) => setPriceRange([0, parseInt(e.target.value)])}
                        className="w-full"
                      />
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
                                <span className="text-lg font-bold" style={{ color: DS.colors.primary.blue }}>
                                  ${listing.price}
                                </span>
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
                      <Card
                        key={listing.id}
                        hover
                        padding="none"
                        onClick={() => setSelectedListing(listing)}
                        style={{
                          cursor: 'pointer',
                          borderColor: selectedListing?.id === listing.id ? DS.colors.primary.blue : DS.colors.border.default,
                        }}
                      >
                        <div className="aspect-video rounded-t-lg" style={{ backgroundColor: DS.colors.background.panelHover }} />
                        <div className="p-4">
                          <h3 className="font-semibold mb-2 truncate" style={{ color: DS.colors.text.primary }}>
                            {listing.title}
                          </h3>
                          <div className="flex items-center justify-between mb-3">
                            <span className="text-xl font-bold" style={{ color: DS.colors.primary.blue }}>
                              ${listing.price}
                            </span>
                            <Badge variant="default" size="sm">{listing.category}</Badge>
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
                          <div className="w-24 h-24 rounded-lg flex-shrink-0" style={{ backgroundColor: DS.colors.background.panelHover }} />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between mb-2">
                              <h3 className="font-semibold" style={{ color: DS.colors.text.primary }}>
                                {listing.title}
                              </h3>
                              <span className="text-xl font-bold ml-4" style={{ color: DS.colors.primary.blue }}>
                                ${listing.price}
                              </span>
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
                <div className="aspect-video rounded-lg" style={{ backgroundColor: DS.colors.background.panelHover }} />

                {/* Title & Price */}
                <div>
                  <h2 className="text-2xl font-bold mb-2" style={{ color: DS.colors.text.primary }}>
                    {selectedListing.title}
                  </h2>
                  <div className="flex items-center gap-3 mb-4">
                    <span className="text-3xl font-bold" style={{ color: DS.colors.primary.blue }}>
                      ${selectedListing.price}
                    </span>
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
                    <div className="w-12 h-12 rounded-full" style={{ backgroundColor: DS.colors.background.panelHover }} />
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