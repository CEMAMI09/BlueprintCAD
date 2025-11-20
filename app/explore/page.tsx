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
  PanelHeader,
  PanelContent,
} from '@/components/ui/ThreePanelLayout';
import { GlobalNavSidebar } from '@/components/ui/GlobalNavSidebar';
import { Button, Card, Badge, SearchBar, EmptyState } from '@/components/ui/UIComponents';
import { DesignSystem as DS } from '@/lib/ui/design-system';
import ThreeDViewer from '@/components/ThreeDViewer';
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
            // Ensure file_path and file_type are correct and extension has dot
            fileUrl: p.file_path && p.file_type && ['stl','obj','fbx','gltf','glb','ply','dae','collada'].includes(p.file_type.toLowerCase().replace('.', ''))
              ? `/api/files/${String(p.file_path).replace(/^[^\w/]+/, '').replace(/[^\w.\-/]+/g, '')}`
              : null,
            fileType: p.file_type ? (p.file_type.startsWith('.') ? p.file_type : `.${p.file_type}`) : null,
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
                <Button
                  variant={viewMode === 'grid' ? 'primary' : 'ghost'}
                  size="sm"
                  icon={<Grid3x3 size={16} />}
                  onClick={() => setViewMode('grid')}
                  aria-label="Grid View"
                />
                <Button
                  variant={viewMode === 'list' ? 'primary' : 'ghost'}
                  size="sm"
                  icon={<List size={16} />}
                  onClick={() => setViewMode('list')}
                  aria-label="List View"
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
                        fileUrl: p.file_path && p.file_type && ['stl','obj','fbx','gltf','glb','ply','dae','collada'].includes(p.file_type.toLowerCase().replace('.', ''))
                          ? `/api/files/${p.file_path}`
                          : null,
                        fileType: p.file_type ? (p.file_type.startsWith('.') ? p.file_type : `.${p.file_type}`) : null,
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
                <Link href={`/project/${design.id}`} key={design.id} style={{ textDecoration: 'none' }}>
                  <Card
                    hover
                    padding="none"
                    style={{ cursor: 'pointer' }}
                  >
                    {/* 3D Preview */}
                    <div className="w-full h-48 relative overflow-hidden flex items-center justify-center bg-[#181818]">
                      {design.fileUrl ? (
                        <ThreeDViewer
                          fileUrl={design.fileUrl}
                          fileName={design.title}
                          fileType={design.fileType}
                          preset="card"
                        />
                      ) : (
                        <span className="text-7xl">{design.thumbnail}</span>
                      )}
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
                </Link>
              ))}
              </div>
            )}
            </div>
          </PanelContent>
        </CenterPanel>
      }
    />
  );
}