/**
 * Explore Page - MakerWorld/Thingiverse Style
 * Grid of CAD designs with filters and contextual detail panel
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
import { DesignSystem as DS } from '@/lib/ui/design-system';
import ThreePreview from '@/components/ThreePreview';
import {
  Filter,
  Download,
  Star,
  Eye,
  Heart,
  MessageCircle,
  Share2,
  DollarSign,
  User,
  Calendar,
  Tag,
  TrendingUp,
  Clock,
  Grid3x3,
  List,
} from 'lucide-react';

interface Design {
  id: string;
  title: string;
  author: string;
  authorAvatar: string;
  thumbnail: string;
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
}

export default function ExplorePage() {
  const [selectedDesign, setSelectedDesign] = useState<Design | null>(null);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [activeFilter, setActiveFilter] = useState('trending');
  const [searchQuery, setSearchQuery] = useState('');
  const [designs, setDesigns] = useState<Design[]>([]);
  const [loading, setLoading] = useState(true);

  // Fetch real projects from API
  useEffect(() => {
    const fetchProjects = async () => {
      try {
        setLoading(true);
        const response = await fetch('/api/projects');
        if (response.ok) {
          const projects = await response.json();
          // Map API data to Design format
          const mappedDesigns: Design[] = projects.map((p: any) => ({
            id: p.id.toString(),
            title: p.name || p.title,
            author: p.username,
            authorAvatar: p.username?.substring(0, 2).toUpperCase() || 'UN',
            thumbnail: '📦', // Default thumbnail
            stars: p.stars || 0,
            downloads: p.downloads || 0,
            views: p.views || 0,
            price: p.for_sale ? (p.price || 0) : null,
            tags: p.tags ? p.tags.split(',') : [],
            createdAt: p.created_at,
            description: p.description || '',
            files: p.file_count || 0,
            comments: p.comment_count || 0,
            liked: false,
          }));
          setDesigns(mappedDesigns);
        }
      } catch (error) {
        console.error('Failed to fetch projects:', error);
        setDesigns([]); // Empty state on error
      } finally {
        setLoading(false);
      }
    };
    fetchProjects();
  }, []);

  const mockDesigns: Design[] = [
    {
      id: '1',
      title: 'Parametric Gear System',
      author: 'Sarah Chen',
      authorAvatar: 'SC',
      thumbnail: '⚙️',
      stars: 342,
      downloads: 1284,
      views: 5420,
      price: null,
      tags: ['Mechanical', 'Gears', 'Assembly'],
      createdAt: '2025-01-15',
      description: 'Fully parametric gear system with configurable tooth count, pressure angle, and module. Perfect for mechanical assemblies.',
      files: 8,
      comments: 24,
      liked: false,
    },
    {
      id: '2',
      title: 'Modern Chair Design',
      author: 'Mike Johnson',
      authorAvatar: 'MJ',
      thumbnail: '🪑',
      stars: 567,
      downloads: 2150,
      views: 8920,
      price: 25.00,
      tags: ['Furniture', 'Design', 'Premium'],
      createdAt: '2025-01-14',
      description: 'Ergonomic chair design with curved surfaces and sustainable materials. Includes assembly instructions.',
      files: 12,
      comments: 45,
      liked: true,
    },
    {
      id: '3',
      title: 'Drone Frame v3',
      author: 'Alex Rivera',
      authorAvatar: 'AR',
      thumbnail: '🚁',
      stars: 892,
      downloads: 3420,
      views: 12500,
      price: null,
      tags: ['Drone', 'Racing', 'FPV'],
      createdAt: '2025-01-13',
      description: 'Lightweight drone frame optimized for FPV racing. Carbon fiber compatible. Multiple motor mounts included.',
      files: 15,
      comments: 78,
      liked: true,
    },
    {
      id: '4',
      title: 'Modular Toolbox',
      author: 'Lisa Wang',
      authorAvatar: 'LW',
      thumbnail: '🧰',
      stars: 234,
      downloads: 890,
      views: 3210,
      price: 15.00,
      tags: ['Organization', 'Tools', 'Modular'],
      createdAt: '2025-01-12',
      description: 'Customizable toolbox system with interchangeable dividers. Stack them vertically or arrange horizontally.',
      files: 6,
      comments: 19,
      liked: false,
    },
    {
      id: '5',
      title: 'Articulated Robot Arm',
      author: 'Tom Bradley',
      authorAvatar: 'TB',
      thumbnail: '🦾',
      stars: 1024,
      downloads: 4580,
      views: 15200,
      price: null,
      tags: ['Robotics', 'Arduino', 'Education'],
      createdAt: '2025-01-11',
      description: '6-axis articulated robot arm with servo mounts. Educational project with full assembly guide and Arduino code.',
      files: 22,
      comments: 134,
      liked: true,
    },
    {
      id: '6',
      title: 'Phone Stand Pro',
      author: 'Emma Davis',
      authorAvatar: 'ED',
      thumbnail: '📱',
      stars: 445,
      downloads: 1920,
      views: 6780,
      price: 5.00,
      tags: ['Accessory', 'Phone', 'Minimal'],
      createdAt: '2025-01-10',
      description: 'Adjustable phone stand with cable management. Fits all phone sizes. Minimal and modern aesthetic.',
      files: 4,
      comments: 31,
      liked: false,
    },
  ];

  const filters = [
    { id: 'trending', label: 'Trending', icon: TrendingUp },
    { id: 'recent', label: 'Recent', icon: Clock },
    { id: 'popular', label: 'Popular', icon: Star },
    { id: 'free', label: 'Free', icon: Download },
    { id: 'premium', label: 'Premium', icon: DollarSign },
  ];

  const popularTags = [
    'Mechanical', 'Furniture', 'Electronics', 'Tools', 'Robotics',
    'Drone', 'Enclosure', 'Bracket', 'Organizer', 'Art',
  ];

  const spotlightCreators = [
    { name: 'Sarah Chen', avatar: 'SC', designs: 45, followers: 892 },
    { name: 'Alex Rivera', avatar: 'AR', designs: 38, followers: 756 },
    { name: 'Mike Johnson', avatar: 'MJ', designs: 32, followers: 623 },
  ];

  const trendingCollections = [
    { name: 'Workshop Essentials', count: 24, icon: '🔧' },
    { name: 'Home Automation', count: 18, icon: '🏠' },
    { name: 'Robotics Projects', count: 31, icon: '🤖' },
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
                <Button
                  variant={viewMode === 'grid' ? 'primary' : 'ghost'}
                  size="sm"
                  icon={<Grid3x3 size={16} />}
                  onClick={() => setViewMode('grid')}
                />
                <Button
                  variant={viewMode === 'list' ? 'primary' : 'ghost'}
                  size="sm"
                  icon={<List size={16} />}
                  onClick={() => setViewMode('list')}
                />
              </div>
            }
          />
          <PanelContent>
            <div className="max-w-7xl mx-auto px-6 py-6">
              {/* Search & Filters */}
              <div className="mb-6">
              <SearchBar
                placeholder="Search designs..."
                onSearch={(query) => {
                  setSearchQuery(query);
                  // Re-fetch with search query
                  fetch(`/api/projects?search=${encodeURIComponent(query)}`)
                    .then(res => res.json())
                    .then(projects => {
                      const mapped = projects.map((p: any) => ({
                        id: p.id?.toString(),
                        title: p.name || p.title,
                        author: p.username,
                        authorAvatar: p.username?.substring(0, 2).toUpperCase() || 'UN',
                        thumbnail: '📦',
                        stars: p.stars || 0,
                        downloads: p.downloads || 0,
                        views: p.views || 0,
                        price: p.for_sale ? (p.price || 0) : null,
                        tags: p.tags ? p.tags.split(',') : [],
                        createdAt: p.created_at,
                        description: p.description || '',
                        files: p.file_count || 0,
                        comments: p.comment_count || 0,
                        liked: false,
                      }));
                      setDesigns(mapped);
                    });
                }}
                fullWidth
              />
              
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
                        // Fetch filtered data
                        let url = '/api/projects';
                        if (filter.id === 'free') url += '?for_sale=false';
                        if (filter.id === 'premium') url += '?for_sale=true';
                        if (filter.id === 'recent') url += '?sort=recent';
                        if (filter.id === 'popular') url += '?sort=popular';
                        if (filter.id === 'trending') url += '?sort=trending';
                        
                        fetch(url)
                          .then(res => res.json())
                          .then(projects => {
                            const mapped = projects.map((p: any) => ({
                              id: p.id?.toString(),
                              title: p.name || p.title,
                              author: p.username,
                              authorAvatar: p.username?.substring(0, 2).toUpperCase() || 'UN',
                              thumbnail: '📦',
                              stars: p.stars || 0,
                              downloads: p.downloads || 0,
                              views: p.views || 0,
                              price: p.for_sale ? (p.price || 0) : null,
                              tags: p.tags ? p.tags.split(',') : [],
                              createdAt: p.created_at,
                              description: p.description || '',
                              files: p.file_count || 0,
                              comments: p.comment_count || 0,
                              liked: false,
                            }));
                            setDesigns(mapped);
                          });
                      }}
                    >
                      <Icon size={16} />
                      {filter.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Trending Collections */}
            <div className="mb-6">
              <h3 className="text-sm font-semibold mb-3" style={{ color: DS.colors.text.primary }}>
                Trending Collections
              </h3>
              <div className="grid grid-cols-3 gap-3">
                {trendingCollections.map((collection) => (
                  <Card
                    key={collection.name}
                    hover
                    padding="md"
                    style={{ cursor: 'pointer' }}
                  >
                    <div className="text-3xl mb-2">{collection.icon}</div>
                    <h4 className="font-medium text-sm mb-1" style={{ color: DS.colors.text.primary }}>
                      {collection.name}
                    </h4>
                    <p className="text-xs" style={{ color: DS.colors.text.tertiary }}>
                      {collection.count} designs
                    </p>
                  </Card>
                ))}
              </div>
            </div>

            {/* Designs Grid */}
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
              <div className={viewMode === 'grid' ? 'grid grid-cols-3 gap-4' : 'space-y-3'}>
                {designs.map((design) => (
                <Card
                  key={design.id}
                  hover
                  padding="none"
                  onClick={() => setSelectedDesign(design)}
                  style={{
                    cursor: 'pointer',
                    borderColor: selectedDesign?.id === design.id ? DS.colors.primary.blue : DS.colors.border.default,
                  }}
                >
                  {/* Thumbnail */}
                  <div
                    className="w-full h-48 relative overflow-hidden flex items-center justify-center text-7xl"
                    style={{ backgroundColor: DS.colors.background.panel }}
                  >
                    {design.thumbnail}
                  </div>

                  {/* Content */}
                  <div className="p-4">
                    <div className="flex items-start justify-between mb-2">
                      <h3
                        className="font-semibold text-base line-clamp-1"
                        style={{ color: DS.colors.text.primary }}
                      >
                        {design.title}
                      </h3>
                      {design.liked && <Heart size={16} fill={DS.colors.accent.error} style={{ color: DS.colors.accent.error }} />}
                    </div>

                    <div className="flex items-center gap-2 mb-3">
                      <div
                        className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold"
                        style={{ backgroundColor: DS.colors.primary.blue, color: '#ffffff' }}
                      >
                        {design.authorAvatar}
                      </div>
                      <span className="text-sm" style={{ color: DS.colors.text.secondary }}>
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
                  </div>
                </Card>
              ))}
              </div>
            )}
            </div>
          </PanelContent>
        </CenterPanel>
      }
      rightPanel={
        <RightPanel>
          {selectedDesign ? (
            <>
              <PanelHeader title="Design Details" />
              <PanelContent>
                {/* Thumbnail */}
                <div
                  className="w-full h-48 rounded-lg flex items-center justify-center text-8xl mb-4"
                  style={{ backgroundColor: DS.colors.background.panel }}
                >
                  {selectedDesign.thumbnail}
                </div>

                {/* Title & Author */}
                <h3 className="text-xl font-bold mb-2" style={{ color: DS.colors.text.primary }}>
                  {selectedDesign.title}
                </h3>
                <Link href={`/profile/${selectedDesign.author}`} className="flex items-center gap-2 mb-4">
                  <div
                    className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold"
                    style={{ backgroundColor: DS.colors.primary.blue, color: '#ffffff' }}
                  >
                    {selectedDesign.authorAvatar}
                  </div>
                  <span className="text-sm font-medium" style={{ color: DS.colors.primary.blue }}>
                    {selectedDesign.author}
                  </span>
                </Link>

                {/* Stats */}
                <div className="grid grid-cols-3 gap-3 mb-4">
                  <div className="text-center">
                    <div className="text-2xl font-bold" style={{ color: DS.colors.text.primary }}>
                      {selectedDesign.stars}
                    </div>
                    <div className="text-xs" style={{ color: DS.colors.text.tertiary }}>
                      Stars
                    </div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold" style={{ color: DS.colors.text.primary }}>
                      {selectedDesign.downloads}
                    </div>
                    <div className="text-xs" style={{ color: DS.colors.text.tertiary }}>
                      Downloads
                    </div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold" style={{ color: DS.colors.text.primary }}>
                      {selectedDesign.comments}
                    </div>
                    <div className="text-xs" style={{ color: DS.colors.text.tertiary }}>
                      Comments
                    </div>
                  </div>
                </div>

                {/* Description */}
                <div className="mb-4">
                  <h4 className="text-sm font-semibold mb-2" style={{ color: DS.colors.text.primary }}>
                    Description
                  </h4>
                  <p className="text-sm leading-relaxed" style={{ color: DS.colors.text.secondary }}>
                    {selectedDesign.description}
                  </p>
                </div>

                {/* Tags */}
                <div className="mb-4">
                  <h4 className="text-sm font-semibold mb-2" style={{ color: DS.colors.text.primary }}>
                    Tags
                  </h4>
                  <div className="flex flex-wrap gap-2">
                    {selectedDesign.tags.map((tag) => (
                      <Badge key={tag} variant="default" size="sm">
                        <Tag size={12} className="mr-1" />
                        {tag}
                      </Badge>
                    ))}
                  </div>
                </div>

                {/* Metadata */}
                <div className="space-y-2 mb-6 text-sm" style={{ color: DS.colors.text.secondary }}>
                  <div className="flex items-center gap-2">
                    <Calendar size={14} />
                    <span>Created {selectedDesign.createdAt}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Download size={14} />
                    <span>{selectedDesign.files} files included</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <MessageCircle size={14} />
                    <span>{selectedDesign.comments} comments</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Eye size={14} />
                    <span>{selectedDesign.views} views</span>
                  </div>
                  {selectedDesign.price !== null && (
                    <div className="flex items-center gap-2">
                      <DollarSign size={14} />
                      <span className="font-semibold" style={{ color: DS.colors.accent.cyan }}>
                        ${selectedDesign.price}
                      </span>
                    </div>
                  )}
                </div>

                {/* Actions */}
                <div className="space-y-2">
                  <Button
                    variant="primary"
                    fullWidth
                    icon={<Download size={16} />}
                    iconPosition="left"
                  >
                    {selectedDesign.price ? `Buy for $${selectedDesign.price}` : 'Download Free'}
                  </Button>
                  <div className="grid grid-cols-3 gap-2">
                    <Button variant="ghost" size="sm" icon={<Heart size={16} />} />
                    <Button variant="ghost" size="sm" icon={<MessageCircle size={16} />} />
                    <Button variant="ghost" size="sm" icon={<Share2 size={16} />} />
                  </div>
                </div>
              </PanelContent>
            </>
          ) : (
            <>
              <PanelHeader title="Spotlight Creators" />
              <PanelContent>
                <div className="space-y-3 mb-6">
                  {spotlightCreators.map((creator) => (
                    <Link key={creator.name} href={`/profile/${creator.name}`}>
                      <Card hover padding="md" style={{ cursor: 'pointer' }}>
                        <div className="flex items-center gap-3">
                          <div
                            className="w-12 h-12 rounded-full flex items-center justify-center font-bold"
                            style={{ backgroundColor: DS.colors.primary.blue, color: '#ffffff' }}
                          >
                            {creator.avatar}
                          </div>
                          <div className="flex-1">
                            <h4 className="font-medium text-sm" style={{ color: DS.colors.text.primary }}>
                              {creator.name}
                            </h4>
                            <p className="text-xs" style={{ color: DS.colors.text.tertiary }}>
                              {creator.designs} designs • {creator.followers} followers
                            </p>
                          </div>
                        </div>
                      </Card>
                    </Link>
                  ))}
                </div>

                <h4 className="text-sm font-semibold mb-3" style={{ color: DS.colors.text.primary }}>
                  Popular Tags
                </h4>
                <div className="flex flex-wrap gap-2">
                  {popularTags.map((tag) => (
                    <button
                      key={tag}
                      className="px-3 py-1.5 rounded-lg text-sm font-medium transition-colors"
                      style={{
                        backgroundColor: DS.colors.background.elevated,
                        color: DS.colors.text.secondary,
                      }}
                    >
                      {tag}
                    </button>
                  ))}
                </div>

                <div className="text-center py-8 mt-6">
                  <EmptyState
                    icon={<Filter />}
                    title="No design selected"
                    description="Click on a design to view details"
                  />
                </div>
              </PanelContent>
            </>
          )}
        </RightPanel>
      }
    />
  );
}