/**
 * Explore Page - MakerWorld/Thingiverse Style
 * Grid of CAD designs with filters and contextual detail panel
 */

'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  ThreePanelLayout,
  CenterPanel,
  PanelHeader,
  PanelContent,
} from '@/components/ui/ThreePanelLayout';
import { GlobalNavSidebar } from '@/components/ui/GlobalNavSidebar';
import { Button, Card, Badge, SearchBar, EmptyState } from '@/components/ui/UIComponents';
import { DesignSystem as DS } from '@/backend/lib/ui/design-system';
import SubscriptionGate from '@/frontend/components/SubscriptionGate';
import UpgradeModal from '@/frontend/components/UpgradeModal';
import TierBadge from '@/frontend/components/TierBadge';
import ShareLinkModal from '@/frontend/components/ShareLinkModal';
import { mapProjectsToDesigns, type Design } from '@/frontend/lib/mapProjectsToDesigns';
import { ExploreDesignGrid } from '@/frontend/components/ExploreDesignGrid';
import {
  Download,
  Star,
  DollarSign,
  TrendingUp,
  Clock,
  Grid3x3,
  List,
  User,
  Users,
} from 'lucide-react';

interface UserResult {
  id: number;
  username: string;
  bio: string | null;
  created_at: string;
  profile_picture?: string | null;
  subscription_tier?: string | null;
}

export default function ExplorePage() {
  const router = useRouter();
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [activeFilter, setActiveFilter] = useState('trending');
  const [searchQuery, setSearchQuery] = useState('');
  const [designs, setDesigns] = useState<Design[]>([]);
  const [users, setUsers] = useState<UserResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchMode, setSearchMode] = useState<'all' | 'designs' | 'users'>('all');
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [upgradeTier, setUpgradeTier] = useState<'pro' | 'creator' | 'enterprise'>('pro');
  const [showShareModal, setShowShareModal] = useState(false);
  const [selectedDesignForShare, setSelectedDesignForShare] = useState<Design | null>(null);

  // Fetch users based on search query
  const fetchUsers = async (search: string) => {
    if (!search || !search.trim()) {
      setUsers([]);
      return;
    }

    try {
      const response = await fetch(`/api/users/search?q=${encodeURIComponent(search.trim())}`);
      if (response.ok) {
        const userResults = await response.json();
        setUsers(userResults);
      } else {
        console.error('Failed to fetch users');
        setUsers([]);
      }
    } catch (error) {
      console.error('Failed to fetch users:', error);
      setUsers([]);
    }
  };

  // Fetch projects based on active filter and search
  const fetchProjects = async (filterId: string = activeFilter, search: string = searchQuery) => {
    try {
      setLoading(true);
      let url = '/api/projects?';
      const params = new URLSearchParams();

      // Add filter parameters
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

      // Add search parameter
      if (search && search.trim()) {
        params.append('search', search.trim());
      }

      url += params.toString();

      // Use the full API URL if available
      const apiUrl = url.startsWith('/api/') 
        ? `${process.env.NEXT_PUBLIC_API_URL || ''}${url}`
        : url;

      const response = await fetch(apiUrl);
      if (response.ok) {
        const projects = await response.json();
        const mappedDesigns = mapProjectsToDesigns(projects);
        setDesigns(mappedDesigns);
      } else {
        console.error('Failed to fetch projects');
        setDesigns([]);
      }
    } catch (error) {
      console.error('Failed to fetch projects:', error);
      setDesigns([]);
    } finally {
      setLoading(false);
    }
  };

  // Fetch projects on mount and when filter changes
  useEffect(() => {
    if (!searchQuery) {
      fetchProjects(activeFilter, '');
      setUsers([]);
      setSearchMode('all');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeFilter]);

  // Debounced search for both designs and users
  useEffect(() => {
    if (searchQuery === '') {
      // If search is cleared, refetch with current filter
      fetchProjects(activeFilter, '');
      setUsers([]);
      setSearchMode('all');
      return;
    }
    const timeoutId = setTimeout(() => {
      // Search both designs and users
      fetchProjects(activeFilter, searchQuery);
      fetchUsers(searchQuery);
      setSearchMode('all');
    }, 300);
    return () => clearTimeout(timeoutId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchQuery]);

  const filters = [
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
          <PanelHeader
            title="Explore Designs"
            actions={
              <div className="flex items-center gap-2">
                <SubscriptionGate
                  feature="maxProjects"
                  requiredTier="creator"
                  showUpgradeModal={false}
                >
                  <Button
                    variant="ghost"
                    size="md"
                    icon={<svg xmlns='http://www.w3.org/2000/svg' className='h-5 w-5' fill='none' viewBox='0 0 24 24' stroke='currentColor'><path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M4 16v2a2 2 0 002 2h12a2 2 0 002-2v-2M7 10l5-5m0 0l5 5m-5-5v12' /></svg>}
                    iconPosition="left"
                    className="btn-ghost-themed"
                    onClick={async (e) => {
                      e.preventDefault();
                      const token = localStorage.getItem('token');
                      if (!token) {
                        router.push('/login');
                        return;
                      }
                      try {
                        const res = await fetch(`/api/subscriptions/can-action?feature=maxProjects`, {
                          headers: { 'Authorization': `Bearer ${token}` }
                        });
                        const data = await res.json();
                        if (data.allowed) {
                          router.push('/upload');
                        } else {
                          setShowUpgradeModal(true);
                          setUpgradeTier(data.requiredTier || 'pro');
                        }
                      } catch (err) {
                        router.push('/upload');
                      }
                    }}
                  >
                    Upload Design
                  </Button>
                </SubscriptionGate>
                <button
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    console.log('[Explore] Clicked grid button, current viewMode:', viewMode);
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
                    console.log('[Explore] Clicked list button, current viewMode:', viewMode);
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
            <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
              {/* Search & Filters */}
              <div className="mb-6">
              <SearchBar
                placeholder="Search designs and users..."
                onSearch={(query) => {
                  setSearchQuery(query);
                }}
                fullWidth
              />
              
              {!searchQuery && (
                <div className="mt-4 flex items-center gap-2">
                  {filters.map((filter) => {
                    const Icon = filter.icon;
                    return (
                      <button
                        key={filter.id}
                        className="px-4 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2"
                        style={{
                          backgroundColor: activeFilter === filter.id ? DS.colors.primary.blue : DS.colors.background.elevated,
                          color: activeFilter === filter.id ? '#ffffff' : DS.colors.text.secondary,
                        }}
                        onClick={() => {
                          setActiveFilter(filter.id);
                          fetchProjects(filter.id, searchQuery);
                        }}
                      >
                        <Icon size={16} />
                        {filter.label}
                      </button>
                    );
                  })}
                </div>
              )}

              {searchQuery && (
                <div className="mt-4 flex items-center gap-2">
                  <button
                    className="px-4 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2"
                    style={{
                      backgroundColor: searchMode === 'all' ? DS.colors.primary.blue : DS.colors.background.elevated,
                      color: searchMode === 'all' ? '#ffffff' : DS.colors.text.secondary,
                    }}
                    onClick={() => setSearchMode('all')}
                  >
                    All Results
                  </button>
                  <button
                    className="px-4 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2"
                    style={{
                      backgroundColor: searchMode === 'designs' ? DS.colors.primary.blue : DS.colors.background.elevated,
                      color: searchMode === 'designs' ? '#ffffff' : DS.colors.text.secondary,
                    }}
                    onClick={() => setSearchMode('designs')}
                  >
                    <Grid3x3 size={16} />
                    Designs ({designs.length})
                  </button>
                  <button
                    className="px-4 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2"
                    style={{
                      backgroundColor: searchMode === 'users' ? DS.colors.primary.blue : DS.colors.background.elevated,
                      color: searchMode === 'users' ? '#ffffff' : DS.colors.text.secondary,
                    }}
                    onClick={() => setSearchMode('users')}
                  >
                    <Users size={16} />
                    Users ({users.length})
                  </button>
                </div>
              )}
            </div>

            {/* Search Results */}
            {searchQuery ? (
              <>
                {/* Users Results */}
                {(searchMode === 'all' || searchMode === 'users') && users.length > 0 && (
                  <div className="mb-8">
                    <h3 className="text-lg font-semibold mb-4 flex items-center gap-2" style={{ color: DS.colors.text.primary }}>
                      <Users size={20} />
                      Users
                    </h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                      {users.map((user) => (
                        <Card
                          key={user.id}
                          hover
                          padding="md"
                          onClick={() => router.push(`/profile/${user.username}`)}
                          style={{ cursor: 'pointer' }}
                        >
                          <div className="flex items-center gap-4">
                            {user.profile_picture ? (
                              <img
                                src={`/api/users/profile-picture/${user.profile_picture}`}
                                alt={user.username}
                                className="w-16 h-16 rounded-full object-cover flex-shrink-0"
                                onError={(e) => {
                                  e.currentTarget.style.display = 'none';
                                  const fallback = e.currentTarget.nextElementSibling as HTMLElement;
                                  if (fallback) fallback.style.display = 'flex';
                                }}
                              />
                            ) : null}
                            <div
                              className="w-16 h-16 rounded-full flex items-center justify-center text-xl font-bold flex-shrink-0"
                              style={{ 
                                backgroundColor: DS.colors.primary.blue, 
                                color: '#ffffff',
                                display: user.profile_picture ? 'none' : 'flex'
                              }}
                            >
                              {user.username.substring(0, 2).toUpperCase()}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1">
                                <h4 className="font-semibold truncate" style={{ color: DS.colors.text.primary }}>
                                  @{user.username}
                                </h4>
                                <TierBadge tier={user.subscription_tier} size="sm" />
                              </div>
                              {user.bio && (
                                <p className="text-sm line-clamp-2" style={{ color: DS.colors.text.secondary }}>
                                  {user.bio}
                                </p>
                              )}
                            </div>
                          </div>
                        </Card>
                      ))}
                    </div>
                  </div>
                )}

                {/* Designs Results */}
                {(searchMode === 'all' || searchMode === 'designs') && (
                  <div>
                    <h3 className="text-lg font-semibold mb-4 flex items-center gap-2" style={{ color: DS.colors.text.primary }}>
                      <Grid3x3 size={20} />
                      Designs
                    </h3>
                    {loading ? (
                      <div className="flex items-center justify-center py-12">
                        <div className="text-center">
                          <div className="animate-spin w-8 h-8 border-2 border-blue-400 border-t-transparent rounded-full mx-auto mb-3"></div>
                          <p style={{ color: DS.colors.text.secondary }}>Loading designs...</p>
                        </div>
                      </div>
                    ) : designs.length === 0 ? (
                      <EmptyState
                        icon={<Grid3x3 size={48} />}
                        title="No designs found"
                        description={`No designs match "${searchQuery}"`}
                      />
                    ) : (
                      <ExploreDesignGrid
                        designs={designs}
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
                )}

                {/* No Results */}
                {searchQuery && searchMode === 'all' && designs.length === 0 && users.length === 0 && !loading && (
                  <EmptyState
                    icon={<Grid3x3 size={48} />}
                    title="No results found"
                    description={`No designs or users match "${searchQuery}"`}
                  />
                )}
              </>
            ) : (
              /* Regular Designs Grid (no search) */
              <>
                <h3 className="text-sm font-semibold mb-3" style={{ color: DS.colors.text.primary }}>
                  All Designs
                </h3>
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <div className="text-center">
                  <div className="animate-spin w-8 h-8 border-2 border-blue-400 border-t-transparent rounded-full mx-auto mb-3"></div>
                  <p style={{ color: DS.colors.text.secondary }}>Loading designs...</p>
                </div>
              </div>
            ) : designs.length === 0 ? (
              <EmptyState
                icon={<Download size={48} />}
                title="No designs found"
                description="Be the first to upload a design to the community!"
              />
            ) : (
              <ExploreDesignGrid
                designs={designs}
                viewMode={viewMode}
                showShareButton={false}
                showAuthorTierBadge={false}
              />
            )}
              </>
            )}
            </div>
          </PanelContent>
        </CenterPanel>
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
        isPublic={true} // Designs on explore page are always public
      />
    )}
  </>
  );
}