/**
 * Public Storefront Page
 * Route: /[username]/store
 * Displays a user's public storefront with products, about section, reviews
 */

'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
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
import { mapProjectsToDesigns, type Design } from '@/frontend/lib/mapProjectsToDesigns';
import { ExploreDesignGrid } from '@/frontend/components/ExploreDesignGrid';
import ShareLinkModal from '@/frontend/components/ShareLinkModal';
import { industryLabel } from '@/frontend/lib/storefront-industries';
import {
  Store,
  Star,
  DollarSign,
  UserPlus,
  UserMinus,
  MessageCircle,
  TrendingUp,
  Calendar,
  CheckCircle,
  Grid3x3,
  List,
  Github,
  Twitter,
  Instagram,
  Youtube,
  Globe,
  Clock,
  Download,
  Factory,
} from 'lucide-react';

interface Storefront {
  id: number;
  store_name: string;
  tagline: string;
  description: string;
  banner_image: string | null;
  logo: string | null;
  primary_color: string;
  secondary_color: string;
  accent_color: string;
  bio: string | null;
  skills: string[] | null;
  social_links: {
    github?: string;
    twitter?: string;
    instagram?: string;
    youtube?: string;
    website?: string;
  } | null;
  refund_policy: string | null;
  license_summary: string | null;
  pinned_products: number[] | null;
  featured_projects: number[] | null;
  focused_industry?: string | null;
}

interface Review {
  id: number;
  rating: number;
  review_text: string | null;
  reviewer: {
    username: string;
    profile_picture: string | null;
  };
  is_verified_buyer: boolean;
  created_at: string;
  product_title: string;
}

interface StorefrontOwner {
  id: number;
  username: string;
  profile_picture: string | null;
  created_at: string;
  is_verified: boolean;
}

export default function PublicStorefrontPage() {
  const params = useParams();
  const router = useRouter();
  const username = params?.username as string;
  
  const [storefront, setStorefront] = useState<Storefront | null>(null);
  const [owner, setOwner] = useState<StorefrontOwner | null>(null);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [following, setFollowing] = useState(false);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [designSearchQuery, setDesignSearchQuery] = useState('');
  const [designFilter, setDesignFilter] = useState('trending');
  const [designs, setDesigns] = useState<Design[]>([]);
  const [designsLoading, setDesignsLoading] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [selectedDesignForShare, setSelectedDesignForShare] = useState<Design | null>(null);
  const [activeSection, setActiveSection] = useState<'products' | 'about' | 'reviews'>('products');

  useEffect(() => {
    const userData = localStorage.getItem('user');
    if (userData) {
      setCurrentUser(JSON.parse(userData));
    }
    fetchStorefront();
  }, [username]);

  const fetchStorefront = async () => {
    try {
      const res = await fetch(`/api/storefront/${encodeURIComponent(username)}`);
      if (res.ok) {
        const data = await res.json();
        setStorefront(data.storefront);
        setOwner(data.owner);
        setReviews(data.reviews || []);
        setFollowing(data.following || false);
      } else if (res.status === 404) {
        // Storefront doesn't exist
        setStorefront(null);
      }
    } catch (error) {
      console.error('Error fetching storefront:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleFollow = async () => {
    if (!currentUser) {
      router.push('/login');
      return;
    }

    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/users/${username}/follow`, {
        method: following ? 'DELETE' : 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (res.ok) {
        setFollowing(!following);
      }
    } catch (error) {
      console.error('Error toggling follow:', error);
    }
  };

  const handleContact = async () => {
    if (!currentUser) {
      router.push('/login');
      return;
    }

    router.push(`/messages?with=${username}&storefront=true`);
  };

  const fetchDesigns = async (filterId: string = designFilter, search: string = designSearchQuery) => {
    if (!username) return;
    try {
      setDesignsLoading(true);
      const params = new URLSearchParams();
      params.append('username', username);
      if (filterId === 'free') {
        params.append('for_sale', 'false');
      } else if (filterId === 'premium') {
        params.append('for_sale', 'true');
      } else if (filterId === 'recent') {
        params.append('sort', 'recent');
      } else if (filterId === 'popular') {
        params.append('sort', 'popular');
      } else if (filterId === 'trending') {
        params.append('sort', 'trending');
      }
      if (search.trim()) {
        params.append('search', search.trim());
      }
      const url = `/api/projects?${params.toString()}`;
      const apiUrl = url.startsWith('/api/')
        ? `${process.env.NEXT_PUBLIC_API_URL || ''}${url}`
        : url;
      const response = await fetch(apiUrl);
      if (response.ok) {
        const projects = await response.json();
        setDesigns(mapProjectsToDesigns(projects));
      } else {
        setDesigns([]);
      }
    } catch (e) {
      console.error('Storefront designs fetch failed:', e);
      setDesigns([]);
    } finally {
      setDesignsLoading(false);
    }
  };

  useEffect(() => {
    if (!storefront || !username) return;
    const delay = designSearchQuery.trim() === '' ? 0 : 300;
    const t = setTimeout(() => {
      fetchDesigns(designFilter, designSearchQuery);
    }, delay);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [storefront, username, designFilter, designSearchQuery]);

  if (loading) {
    return (
      <ThreePanelLayout
        leftPanel={<GlobalNavSidebar />}
        centerPanel={
          <CenterPanel>
            <PanelContent>
              <div className="flex items-center justify-center py-12">
                <div className="w-8 h-8 border-4 border-blue-500/20 border-t-blue-500 rounded-full animate-spin"></div>
              </div>
            </PanelContent>
          </CenterPanel>
        }
      />
    );
  }

  if (!storefront) {
    // If it's the user's own storefront, show configuration option
    const isOwnStorefront = currentUser?.username === username;
    if (isOwnStorefront) {
      return (
        <ThreePanelLayout
          leftPanel={<GlobalNavSidebar />}
          centerPanel={
            <CenterPanel>
              <PanelHeader title="Configure Your Storefront" />
              <PanelContent className="!pt-24 !pb-24">
                <div 
                  className="text-center max-w-2xl mx-auto px-8" 
                  style={{ 
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'center',
                    minHeight: '100%'
                  }}
                >
                  <div className="mb-12">
                    <Store size={64} className="mx-auto mb-8" style={{ color: DS.colors.text.tertiary }} />
                    <h2 className="text-2xl font-bold mb-6" style={{ color: DS.colors.text.primary }}>
                      Your Storefront Isn't Set Up Yet
                    </h2>
                    <p className="text-lg leading-relaxed" style={{ color: DS.colors.text.secondary }}>
                      Create a custom storefront to showcase and sell your designs. Customize your store name, banner, colors, and more.
                    </p>
                  </div>
                  <div className="flex items-center justify-center gap-4 mt-12">
                    <Button 
                      variant="primary" 
                      icon={<Store size={18} />}
                      onClick={() => router.push('/storefront')}
                    >
                      Configure Storefront
                    </Button>
                    <Link href={`/profile/${username}`}>
                      <Button variant="secondary">
                        Back to Profile
                      </Button>
                    </Link>
                  </div>
                </div>
              </PanelContent>
            </CenterPanel>
          }
        />
      );
    }
    
    // If it's someone else's storefront, show not found message
    return (
      <ThreePanelLayout
        leftPanel={<GlobalNavSidebar />}
        centerPanel={
          <CenterPanel>
            <PanelHeader title="Storefront Not Found" />
            <PanelContent>
              <div className="text-center py-12">
                <p style={{ color: DS.colors.text.secondary }}>
                  This user hasn't set up a storefront yet.
                </p>
                <Link href={`/profile/${username}`}>
                  <Button variant="secondary" className="mt-4">
                    View Profile
                  </Button>
                </Link>
              </div>
            </PanelContent>
          </CenterPanel>
        }
      />
    );
  }

  const pinnedIds = storefront.pinned_products ?? [];
  const pinnedIdSet = new Set(pinnedIds.map((id) => String(id)));
  const pinnedDesigns = pinnedIds
    .map((id) => designs.find((d) => d.id === String(id)))
    .filter((d): d is Design => !!d);
  const restDesigns = designs.filter((d) => !pinnedIdSet.has(d.id));

  const designFilters = [
    { id: 'trending', label: 'Trending', icon: TrendingUp },
    { id: 'recent', label: 'Recent', icon: Clock },
    { id: 'popular', label: 'Popular', icon: Star },
    { id: 'free', label: 'Free', icon: Download },
    { id: 'premium', label: 'Premium', icon: DollarSign },
  ];

  return (
    <>
    <ThreePanelLayout
      leftPanel={<GlobalNavSidebar />}
      centerPanel={
        <CenterPanel>
          {/* Banner */}
          <div
            className="w-full h-64 relative"
            style={{
              backgroundColor: storefront.primary_color,
            }}
          >
            {storefront.banner_image && (
              <img
                src={storefront.banner_image}
                alt="Banner"
                className="w-full h-full object-cover"
              />
            )}
            <div className="absolute bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-black/80 to-transparent">
              <div className="flex items-end gap-4">
                {storefront.logo && (
                  <img
                    src={storefront.logo}
                    alt="Logo"
                    className="w-24 h-24 rounded-full border-4 border-white object-cover"
                  />
                )}
                <div className="flex-1">
                  <h1 className="text-3xl font-bold text-white mb-1">
                    {storefront.store_name}
                  </h1>
                  {storefront.tagline && (
                    <p className="text-white/90 text-lg">{storefront.tagline}</p>
                  )}
                  {industryLabel(storefront.focused_industry) && (
                    <div className="mt-2 inline-flex items-center gap-2 rounded-full px-3 py-1 text-sm text-white/95 bg-white/15 backdrop-blur-sm">
                      <Factory size={14} className="opacity-90" />
                      <span>{industryLabel(storefront.focused_industry)}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Navigation Tabs */}
          <div className="border-b" style={{ borderColor: DS.colors.border.subtle }}>
            <div className="flex gap-6 px-6">
              <button
                onClick={() => setActiveSection('products')}
                className="py-4 px-2 border-b-2 font-medium transition-colors"
                style={{
                  borderColor: activeSection === 'products' ? storefront.primary_color : 'transparent',
                  color: activeSection === 'products' ? DS.colors.text.primary : DS.colors.text.secondary,
                }}
              >
                Designs
              </button>
              <button
                onClick={() => setActiveSection('about')}
                className="py-4 px-2 border-b-2 font-medium transition-colors"
                style={{
                  borderColor: activeSection === 'about' ? storefront.primary_color : 'transparent',
                  color: activeSection === 'about' ? DS.colors.text.primary : DS.colors.text.secondary,
                }}
              >
                About
              </button>
              <button
                onClick={() => setActiveSection('reviews')}
                className="py-4 px-2 border-b-2 font-medium transition-colors"
                style={{
                  borderColor: activeSection === 'reviews' ? storefront.primary_color : 'transparent',
                  color: activeSection === 'reviews' ? DS.colors.text.primary : DS.colors.text.secondary,
                }}
              >
                Reviews ({reviews.length})
              </button>
            </div>
          </div>

          <PanelContent className="p-6">
            {activeSection === 'products' && (
              <>
                <div className="flex flex-col gap-4 mb-6">
                  <div className="flex flex-col sm:flex-row gap-4 sm:items-center">
                    <div className="flex-1 min-w-0">
                      <SearchBar
                        placeholder="Search designs..."
                        onSearch={(q) => setDesignSearchQuery(q)}
                        fullWidth
                      />
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <button
                        type="button"
                        onClick={() => setViewMode('grid')}
                        className="inline-flex items-center justify-center gap-2 px-3 py-1.5 text-sm font-medium rounded-lg transition-all duration-200"
                        style={{
                          backgroundColor: viewMode === 'grid' ? storefront.primary_color : DS.colors.background.elevated,
                          color: viewMode === 'grid' ? '#ffffff' : DS.colors.text.primary,
                          border:
                            viewMode === 'grid' ? 'none' : `1px solid ${DS.colors.border.default}`,
                        }}
                        aria-label="Grid view"
                      >
                        <Grid3x3 size={16} />
                      </button>
                      <button
                        type="button"
                        onClick={() => setViewMode('list')}
                        className="inline-flex items-center justify-center gap-2 px-3 py-1.5 text-sm font-medium rounded-lg transition-all duration-200"
                        style={{
                          backgroundColor: viewMode === 'list' ? storefront.primary_color : DS.colors.background.elevated,
                          color: viewMode === 'list' ? '#ffffff' : DS.colors.text.primary,
                          border:
                            viewMode === 'list' ? 'none' : `1px solid ${DS.colors.border.default}`,
                        }}
                        aria-label="List view"
                      >
                        <List size={16} />
                      </button>
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    {designFilters.map((f) => {
                      const Icon = f.icon;
                      const active = designFilter === f.id;
                      return (
                        <button
                          key={f.id}
                          type="button"
                          className="px-4 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2"
                          style={{
                            backgroundColor: active ? storefront.primary_color : DS.colors.background.elevated,
                            color: active ? '#ffffff' : DS.colors.text.secondary,
                          }}
                          onClick={() => setDesignFilter(f.id)}
                        >
                          <Icon size={16} />
                          {f.label}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {pinnedDesigns.length > 0 && (
                  <div className="mb-10">
                    <h2 className="text-lg font-semibold mb-4" style={{ color: DS.colors.text.primary }}>
                      Featured
                    </h2>
                    <ExploreDesignGrid
                      designs={pinnedDesigns}
                      viewMode={viewMode}
                      showShareButton
                      showAuthorTierBadge
                      onShare={(d) => {
                        setSelectedDesignForShare(d);
                        setShowShareModal(true);
                      }}
                    />
                  </div>
                )}

                <div>
                  {pinnedDesigns.length > 0 && restDesigns.length > 0 && (
                    <h2 className="text-lg font-semibold mb-4" style={{ color: DS.colors.text.primary }}>
                      {designSearchQuery.trim() ? 'Matching designs' : 'All designs'}
                    </h2>
                  )}
                  {designsLoading ? (
                    <div className="flex items-center justify-center py-12">
                      <div className="text-center">
                        <div className="animate-spin w-8 h-8 border-2 border-blue-400 border-t-transparent rounded-full mx-auto mb-3" />
                        <p style={{ color: DS.colors.text.secondary }}>Loading designs...</p>
                      </div>
                    </div>
                  ) : restDesigns.length === 0 && pinnedDesigns.length === 0 ? (
                    <EmptyState
                      icon={<Grid3x3 size={48} />}
                      title="No designs yet"
                      description={
                        designSearchQuery.trim()
                          ? `No designs match "${designSearchQuery}"`
                          : 'This creator has not published any public designs yet.'
                      }
                    />
                  ) : restDesigns.length === 0 && pinnedDesigns.length > 0 ? null : (
                    <ExploreDesignGrid
                      designs={restDesigns}
                      viewMode={viewMode}
                      showShareButton
                      showAuthorTierBadge
                      onShare={(d) => {
                        setSelectedDesignForShare(d);
                        setShowShareModal(true);
                      }}
                    />
                  )}
                </div>
              </>
            )}

            {activeSection === 'about' && (
              <div className="space-y-6">
                {industryLabel(storefront.focused_industry) && (
                  <Card padding="lg">
                    <h3 className="text-lg font-semibold mb-3" style={{ color: DS.colors.text.primary }}>
                      Store focus
                    </h3>
                    <div className="flex items-center gap-2">
                      <Factory size={18} style={{ color: storefront.primary_color }} />
                      <span style={{ color: DS.colors.text.secondary }}>
                        {industryLabel(storefront.focused_industry)}
                      </span>
                    </div>
                  </Card>
                )}

                {storefront.description && (
                  <Card padding="lg">
                    <h3 className="text-lg font-semibold mb-3" style={{ color: DS.colors.text.primary }}>
                      About
                    </h3>
                    <p style={{ color: DS.colors.text.secondary }}>{storefront.description}</p>
                  </Card>
                )}

                {storefront.bio && (
                  <Card padding="lg">
                    <h3 className="text-lg font-semibold mb-3" style={{ color: DS.colors.text.primary }}>
                      Bio
                    </h3>
                    <p style={{ color: DS.colors.text.secondary }}>{storefront.bio}</p>
                  </Card>
                )}

                {storefront.skills && storefront.skills.length > 0 && (
                  <Card padding="lg">
                    <h3 className="text-lg font-semibold mb-3" style={{ color: DS.colors.text.primary }}>
                      Skills
                    </h3>
                    <div className="flex flex-wrap gap-2">
                      {storefront.skills.map((skill, idx) => (
                        <Badge key={idx} variant="secondary">{skill}</Badge>
                      ))}
                    </div>
                  </Card>
                )}

                {owner && (
                  <Card padding="lg">
                    <h3 className="text-lg font-semibold mb-3" style={{ color: DS.colors.text.primary }}>
                      Seller Information
                    </h3>
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <Calendar size={16} style={{ color: DS.colors.text.tertiary }} />
                        <span style={{ color: DS.colors.text.secondary }}>
                          Active since {new Date(owner.created_at).getFullYear()}
                        </span>
                      </div>
                      {owner.is_verified && (
                        <div className="flex items-center gap-2">
                          <CheckCircle size={16} style={{ color: DS.colors.accent.success }} />
                          <span style={{ color: DS.colors.text.secondary }}>Verified Seller</span>
                        </div>
                      )}
                    </div>
                  </Card>
                )}

                {storefront.social_links && (
                  <Card padding="lg">
                    <h3 className="text-lg font-semibold mb-3" style={{ color: DS.colors.text.primary }}>
                      Social Links
                    </h3>
                    <div className="flex gap-4">
                      {storefront.social_links.github && (
                        <a
                          href={storefront.social_links.github}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-2"
                          style={{ color: DS.colors.text.secondary }}
                        >
                          <Github size={20} />
                          <span>GitHub</span>
                        </a>
                      )}
                      {storefront.social_links.twitter && (
                        <a
                          href={storefront.social_links.twitter}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-2"
                          style={{ color: DS.colors.text.secondary }}
                        >
                          <Twitter size={20} />
                          <span>Twitter</span>
                        </a>
                      )}
                      {storefront.social_links.instagram && (
                        <a
                          href={storefront.social_links.instagram}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-2"
                          style={{ color: DS.colors.text.secondary }}
                        >
                          <Instagram size={20} />
                          <span>Instagram</span>
                        </a>
                      )}
                      {storefront.social_links.youtube && (
                        <a
                          href={storefront.social_links.youtube}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-2"
                          style={{ color: DS.colors.text.secondary }}
                        >
                          <Youtube size={20} />
                          <span>YouTube</span>
                        </a>
                      )}
                      {storefront.social_links.website && (
                        <a
                          href={storefront.social_links.website}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-2"
                          style={{ color: DS.colors.text.secondary }}
                        >
                          <Globe size={20} />
                          <span>Website</span>
                        </a>
                      )}
                    </div>
                  </Card>
                )}

                {storefront.refund_policy && (
                  <Card padding="lg">
                    <h3 className="text-lg font-semibold mb-3" style={{ color: DS.colors.text.primary }}>
                      Refund Policy
                    </h3>
                    <p style={{ color: DS.colors.text.secondary }}>{storefront.refund_policy}</p>
                  </Card>
                )}

                {storefront.license_summary && (
                  <Card padding="lg">
                    <h3 className="text-lg font-semibold mb-3" style={{ color: DS.colors.text.primary }}>
                      License Summary
                    </h3>
                    <p style={{ color: DS.colors.text.secondary }}>{storefront.license_summary}</p>
                  </Card>
                )}
              </div>
            )}

            {activeSection === 'reviews' && (
              <div className="space-y-4">
                {reviews.length === 0 ? (
                  <div className="text-center py-12" style={{ color: DS.colors.text.secondary }}>
                    No reviews yet
                  </div>
                ) : (
                  reviews.map((review) => (
                    <Card key={review.id} padding="lg">
                      <div className="flex items-start gap-4">
                        <div className="flex-shrink-0">
                          {review.reviewer.profile_picture ? (
                            <img
                              src={`/api/users/profile-picture/${review.reviewer.profile_picture}`}
                              alt={review.reviewer.username}
                              className="w-12 h-12 rounded-full object-cover"
                            />
                          ) : (
                            <div
                              className="w-12 h-12 rounded-full flex items-center justify-center text-lg font-bold"
                              style={{ backgroundColor: DS.colors.primary.blue, color: '#fff' }}
                            >
                              {review.reviewer.username[0].toUpperCase()}
                            </div>
                          )}
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <span className="font-semibold" style={{ color: DS.colors.text.primary }}>
                              {review.reviewer.username}
                            </span>
                            {review.is_verified_buyer && (
                              <Badge variant="success" size="sm">
                                <CheckCircle size={12} className="mr-1" />
                                Verified Buyer
                              </Badge>
                            )}
                            <div className="flex items-center gap-1">
                              {[...Array(5)].map((_, i) => (
                                <Star
                                  key={i}
                                  size={14}
                                  fill={i < review.rating ? '#fbbf24' : 'none'}
                                  style={{ color: i < review.rating ? '#fbbf24' : DS.colors.text.tertiary }}
                                />
                              ))}
                            </div>
                          </div>
                          <p className="text-sm mb-1" style={{ color: DS.colors.text.secondary }}>
                            {review.product_title}
                          </p>
                          {review.review_text && (
                            <p style={{ color: DS.colors.text.primary }}>{review.review_text}</p>
                          )}
                          <p className="text-xs mt-2" style={{ color: DS.colors.text.tertiary }}>
                            {new Date(review.created_at).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                    </Card>
                  ))
                )}
              </div>
            )}
          </PanelContent>
        </CenterPanel>
      }
      rightPanel={
        <RightPanel>
          <PanelHeader title="Actions" />
          <PanelContent className="p-6 space-y-4">
            <Button
              variant={following ? "secondary" : "primary"}
              fullWidth
              onClick={handleFollow}
              icon={following ? <UserMinus size={18} /> : <UserPlus size={18} />}
            >
              {following ? 'Unfollow' : 'Follow'}
            </Button>
            <Button
              variant="secondary"
              fullWidth
              onClick={handleContact}
              icon={<MessageCircle size={18} />}
            >
              Contact Seller
            </Button>
            <Link href={`/profile/${username}`}>
              <Button variant="ghost" fullWidth>
                View Profile
              </Button>
            </Link>
          </PanelContent>
        </RightPanel>
      }
    />
    {selectedDesignForShare && (
      <ShareLinkModal
        isOpen={showShareModal}
        onClose={() => {
          setShowShareModal(false);
          setSelectedDesignForShare(null);
        }}
        entityType="project"
        entityId={Number(selectedDesignForShare.id)}
        entityName={selectedDesignForShare.title}
        isPublic={true}
      />
    )}
    </>
  );
}
