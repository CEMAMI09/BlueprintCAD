/**
 * Explore Page - MakerWorld/Thingiverse Style
 * Grid of CAD designs with filters and contextual detail panel
 */

'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  ThreePanelLayout,
  CenterPanel,
  PanelHeader,
  PanelContent,
} from '@/components/ui/ThreePanelLayout';
import { GlobalNavSidebar } from '@/components/ui/GlobalNavSidebar';
import { Button, Card, Badge, SearchBar, EmptyState } from '@/components/ui/UIComponents';
import { DesignSystem as DS } from '@/backend/lib/ui/design-system';
import {
  Download,
  Star,
  Eye,
  Heart,
  DollarSign,
  TrendingUp,
  Clock,
  Grid3x3,
  List,
  User,
  Users,
} from 'lucide-react';

interface Design {
  id: string;
  title: string;
  author: string;
  authorAvatar: string;
  authorProfilePicture?: string | null;
  thumbnail: string;
  thumbnailUrl?: string | null;
  stars: number;
  downloads: number;
  views: number;
  price: number | null;
  tags: string[];
  createdAt: string;
  description: string;
  files: number;
  comments: number;
  liked: boolean;
  fileUrl?: string | null;
  fileType?: string | null;
}

interface UserResult {
  id: number;
  username: string;
  bio: string | null;
  created_at: string;
  profile_picture?: string | null;
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

  // Helper function to map projects to designs
  const mapProjectsToDesigns = (projects: any[]): Design[] => {
    return projects.map((p: any) => {
      let thumbnailUrl = null;
      if (p.thumbnail_path) {
        // Extract just the filename from thumbnail_path (remove "thumbnails/" prefix)
        const thumbnailPath = String(p.thumbnail_path);
        const filename = thumbnailPath.includes('/') 
          ? (thumbnailPath.split('/').pop() || thumbnailPath)
          : thumbnailPath;
        // Add cache-busting query parameter to ensure fresh images
        thumbnailUrl = `/api/thumbnails/${encodeURIComponent(filename)}?t=${Date.now()}`;
      }
      return {
        id: p.id.toString(),
        title: p.title || p.name,
        author: p.username,
        authorAvatar: p.username?.substring(0, 2).toUpperCase() || 'UN',
        authorProfilePicture: p.profile_picture || null,
        thumbnail: '📦', // Default thumbnail emoji
        thumbnailUrl,
        stars: p.likes || 0,
        downloads: p.downloads || 0,
        views: p.views || 0,
        price: p.for_sale ? (p.price || 0) : null,
        tags: p.tags ? (typeof p.tags === 'string' ? p.tags.split(',') : p.tags) : [],
        createdAt: p.created_at,
        description: p.description || '',
        files: p.file_count || 0,
        comments: p.comment_count || 0,
        liked: false,
        fileUrl: p.file_path && p.file_type && ['stl','obj','fbx','gltf','glb','ply','dae','collada'].includes(p.file_type.toLowerCase().replace('.', ''))
          ? `/api/files/${encodeURIComponent(String(p.file_path))}`
          : null,
        fileType: p.file_type ? (p.file_type.startsWith('.') ? p.file_type : `.${p.file_type}`) : null,
      };
    });
  };

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

      const response = await fetch(url);
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
    <ThreePanelLayout
      leftPanel={<GlobalNavSidebar />}
      centerPanel={
        <CenterPanel>
          <PanelHeader
            title="Explore Designs"
            actions={
              <div className="flex items-center gap-2">
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
            <div className="max-w-7xl mx-auto px-6 py-6">
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
                    <div className="grid grid-cols-3 gap-4">
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
                              <h4 className="font-semibold mb-1 truncate" style={{ color: DS.colors.text.primary }}>
                                @{user.username}
                              </h4>
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
                    ) : viewMode === 'grid' ? (
                        <div className="grid grid-cols-3 gap-4">
                          {designs.map((design) => {
                            return (
                              <Link href={`/project/${design.id}`} key={design.id} style={{ textDecoration: 'none' }}>
                                <Card hover padding="none" style={{ cursor: 'pointer' }} className="h-full flex flex-col">
                                  {/* Thumbnail */}
                                  <div className="aspect-video rounded-t-lg overflow-hidden flex-shrink-0 relative" style={{ backgroundColor: DS.colors.background.panel, minHeight: '180px' }}>
                                    {design.thumbnailUrl ? (
                                      <img
                                        key={`thumb-${design.id}-${design.thumbnailUrl}`}
                                        src={design.thumbnailUrl}
                                        alt={design.title}
                                        className="design-thumbnail"
                                        loading="lazy"
                                        style={{ 
                                          width: '100%',
                                          height: '100%',
                                          objectFit: 'cover',
                                          display: 'block'
                                        }}
                                        onError={(e) => {
                                          console.error(`[Explore] Failed to load thumbnail for ${design.id}:`, design.thumbnailUrl, 'Error:', e);
                                          const img = e.currentTarget;
                                          img.style.display = 'none';
                                          const container = img.parentElement;
                                          if (container) {
                                            let fallback = container.querySelector('.thumbnail-fallback') as HTMLElement;
                                            if (!fallback) {
                                              fallback = document.createElement('div');
                                              fallback.className = 'thumbnail-fallback flex flex-col items-center justify-center w-full h-full absolute inset-0';
                                              fallback.style.zIndex = '1';
                                              fallback.innerHTML = `<span class="text-5xl mb-2">${design.thumbnail}</span><span class="text-xs">No thumbnail available</span>`;
                                              container.appendChild(fallback);
                                            }
                                            fallback.style.display = 'flex';
                                          }
                                        }}
                                        onLoad={() => {
                                          console.log(`[Explore] Successfully loaded thumbnail for ${design.id}:`, design.thumbnailUrl);
                                        }}
                                      />
                                    ) : (
                                      <div className="flex flex-col items-center justify-center w-full h-full">
                                        <span className="text-5xl mb-2">{design.thumbnail}</span>
                                        <span className="text-xs" style={{ color: DS.colors.text.tertiary }}>No thumbnail available</span>
                                      </div>
                                    )}
                                  </div>
                                  {/* Card Content */}
                                  <div className="p-4 flex flex-col flex-grow min-h-[140px]">
                                    <div className="flex items-start justify-between mb-2">
                                      <h3
                                        className="font-semibold text-base line-clamp-1 flex-1"
                                        style={{ color: DS.colors.text.primary }}
                                      >
                                        {design.title}
                                      </h3>
                                      {design.liked && <Heart size={16} fill={DS.colors.accent.error} style={{ color: DS.colors.accent.error }} className="flex-shrink-0 ml-2" />}
                                    </div>
                                    <div className="flex items-center gap-2 mb-3">
                                      <div
                                        className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0"
                                        style={{ 
                                          backgroundColor: design.authorProfilePicture ? 'transparent' : DS.colors.primary.blue, 
                                          color: '#ffffff' 
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
                                    <div className="flex flex-wrap gap-2 mt-auto">
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
                                  </div>
                                </Card>
                              </Link>
                            );
                          })}
                        </div>
                      ) : (
                        <div className="space-y-4">
                          {designs.map((design) => {
                            return (
                              <Link 
                                href={`/project/${design.id}`} 
                                key={design.id} 
                                style={{ textDecoration: 'none', display: 'block' }}
                              >
                                <Card
                                  hover
                                  padding="md"
                                  style={{ cursor: 'pointer' }}
                                >
                                  <div className="flex items-center gap-4">
                                    <div className="w-24 h-24 rounded-lg flex-shrink-0 overflow-hidden" style={{ backgroundColor: DS.colors.background.panelHover }}>
                                      {design.thumbnailUrl ? (
                                        <img
                                          src={design.thumbnailUrl}
                                          alt={design.title}
                                          className="w-full h-full object-cover"
                                          loading="lazy"
                                          onError={(e) => {
                                            e.currentTarget.style.display = 'none';
                                          }}
                                        />
                                      ) : (
                                        <div className="w-full h-full flex items-center justify-center text-2xl">
                                          {design.thumbnail}
                                        </div>
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
                                      <div className="flex items-center gap-4 text-sm" style={{ color: DS.colors.text.secondary }}>
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
                                      </div>
                                    </div>
                                  </div>
                                </Card>
                              </Link>
                            );
                          })}
                        </div>
                      )
                    }
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
            ) : viewMode === 'grid' ? (
                <div className="grid grid-cols-3 gap-4">
                  {designs.map((design) => {
                    return (
                      <Link href={`/project/${design.id}`} key={design.id} style={{ textDecoration: 'none' }}>
                        <Card hover padding="none" style={{ cursor: 'pointer' }} className="h-full flex flex-col">
                          {/* Thumbnail */}
                          <div className="aspect-video rounded-t-lg overflow-hidden flex-shrink-0 relative" style={{ backgroundColor: DS.colors.background.panel }}>
                            {design.thumbnailUrl ? (
                              <img
                                src={design.thumbnailUrl}
                                alt={design.title}
                                className="design-thumbnail w-full h-full object-cover"
                                loading="lazy"
                                onError={(e) => {
                                  e.currentTarget.style.display = 'none';
                                  const fallback = e.currentTarget.nextElementSibling;
                                  if (fallback) (fallback as HTMLElement).style.display = 'flex';
                                }}
                              />
                            ) : null}
                            <div 
                              className="flex flex-col items-center justify-center w-full h-full"
                              style={{ display: design.thumbnailUrl ? 'none' : 'flex' }}
                            >
                              <span className="text-5xl mb-2">{design.thumbnail}</span>
                              <span className="text-xs" style={{ color: DS.colors.text.tertiary }}>No thumbnail available</span>
                            </div>
                          </div>
                          {/* Card Content */}
                          <div className="p-4 flex flex-col flex-grow min-h-[140px]">
                            <div className="flex items-start justify-between mb-2">
                              <h3
                                className="font-semibold text-base line-clamp-1 flex-1"
                                style={{ color: DS.colors.text.primary }}
                              >
                                {design.title}
                              </h3>
                              {design.liked && <Heart size={16} fill={DS.colors.accent.error} style={{ color: DS.colors.accent.error }} className="flex-shrink-0 ml-2" />}
                            </div>
                            <div className="flex items-center gap-2 mb-3">
                              <div
                                className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0"
                                style={{ 
                                  backgroundColor: design.authorProfilePicture ? 'transparent' : DS.colors.primary.blue, 
                                  color: '#ffffff' 
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
                            <div className="flex flex-wrap gap-2 mt-auto">
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
                          </div>
                        </Card>
                      </Link>
                    );
                  })}
                </div>
              ) : (
                <div className="space-y-4">
                  {designs.map((design) => {
                    return (
                      <Link 
                        href={`/project/${design.id}`} 
                        key={design.id} 
                        style={{ textDecoration: 'none', display: 'block' }}
                      >
                        <Card
                          hover
                          padding="md"
                          style={{ cursor: 'pointer' }}
                        >
                          <div className="flex items-center gap-4">
                            <div className="w-24 h-24 rounded-lg flex-shrink-0 overflow-hidden" style={{ backgroundColor: DS.colors.background.panelHover }}>
                              {design.thumbnailUrl ? (
                                <img
                                  src={design.thumbnailUrl}
                                  alt={design.title}
                                  className="w-full h-full object-cover"
                                  loading="lazy"
                                  onError={(e) => {
                                    e.currentTarget.style.display = 'none';
                                  }}
                                />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center text-2xl">
                                  {design.thumbnail}
                                </div>
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
                              <div className="flex items-center gap-4 text-sm" style={{ color: DS.colors.text.secondary }}>
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
                              </div>
                            </div>
                          </div>
                        </Card>
                      </Link>
                    );
                  })}
                </div>
              )}
              </>
            )}
            </div>
          </PanelContent>
        </CenterPanel>
      }
    />
  );
}