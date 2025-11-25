/**
 * Profile Page - GitHub/Twitter Style Profile
 * User profile with projects grid, followers/following, and stats
 */

'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import {
  ThreePanelLayout,
  CenterPanel,
  PanelHeader,
  PanelContent,
} from '@/components/ui/ThreePanelLayout';
import { GlobalNavSidebar } from '@/components/ui/GlobalNavSidebar';
import { Button, Card, Badge, Tabs, EmptyState } from '@/components/ui/UIComponents';
import { DesignSystem as DS } from '@/backend/lib/ui/design-system';
import {
  User,
  MapPin,
  Calendar,
  Link as LinkIcon,
  Star,
  Download,
  Eye,
  MessageCircle,
  Settings,
  UserPlus,
  UserMinus,
  Grid,
  Users,
  Heart,
  Github,
  X,
  Instagram,
  Youtube,
  ShoppingBag,
} from 'lucide-react';

export default function ProfilePage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const username = (params?.username || '') as string;
  const [profile, setProfile] = useState<any>(null);
  const [projects, setProjects] = useState<any[]>([]);
  const [starredProjects, setStarredProjects] = useState<any[]>([]);
  const [orders, setOrders] = useState<any>({ purchases: [], sales: [], manufacturingOrders: [] });
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [following, setFollowing] = useState(false);
  const [pending, setPending] = useState(false);
  const [isPrivate, setIsPrivate] = useState(false);
  const [activeTab, setActiveTab] = useState(searchParams.get('tab') || 'projects');

  useEffect(() => {
    const userData = localStorage.getItem('user');
    if (userData) {
      setCurrentUser(JSON.parse(userData));
    }
  }, []);

  const isOwnProfile = currentUser?.username === username;

  // Helper function to format social media URLs
  const formatSocialUrl = (platform: string, value: string) => {
    if (!value) return '#';
    
    // Remove any existing protocol or domain
    const cleanValue = value
      .replace(/^https?:\/\//, '')
      .replace(/^www\./, '')
      .replace(/^github\.com\//, '')
      .replace(/^x\.com\//, '')
      .replace(/^twitter\.com\//, '')
      .replace(/^instagram\.com\//, '')
      .replace(/^youtube\.com\//, '')
      .replace(/^youtube\.com\/@/, '')
      .replace(/^@/, '')
      .trim();

    switch (platform) {
      case 'github':
        return `https://github.com/${cleanValue}`;
      case 'twitter':
        return `https://x.com/${cleanValue}`;
      case 'instagram':
        return `https://instagram.com/${cleanValue}`;
      case 'youtube':
        // Handle both @username and channel ID formats
        if (cleanValue.startsWith('@')) {
          return `https://youtube.com/${cleanValue}`;
        }
        return `https://youtube.com/@${cleanValue}`;
      default:
        return value.startsWith('http') ? value : `https://${value}`;
    }
  };

  useEffect(() => {
    if (username) {
      fetchProfile();
      fetchUserProjects();
    }
  }, [username]);

  useEffect(() => {
    if (username && currentUser) {
      checkFollowStatus();
    }
  }, [username, currentUser]);

  useEffect(() => {
    if (currentUser?.username === username) {
      fetchStarredProjects();
      fetchOrders();
    }
  }, [currentUser, username]);

  useEffect(() => {
    const tab = searchParams.get('tab');
    if (tab && (tab === 'projects' || tab === 'starred' || tab === 'orders')) {
      setActiveTab(tab);
    }
  }, [searchParams]);

  useEffect(() => {
    if (activeTab === 'orders' && isOwnProfile) {
      fetchOrders();
    }
  }, [activeTab, isOwnProfile]);

  const fetchProfile = async () => {
    try {
      const token = localStorage.getItem('token');
      const headers: HeadersInit = {};
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
      
      const res = await fetch(`/api/users/${username}`, { 
        headers,
        cache: 'no-store'
      });
      if (res.ok) {
        const data = await res.json();
        setProfile(data);
      } else if (res.status === 404) {
        setProfile(null);
      }
    } catch (error) {
      console.error('Error fetching profile:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchUserProjects = async () => {
    try {
      const token = localStorage.getItem('token');
      const headers: HeadersInit = {};
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
      
      const res = await fetch(`/api/projects?username=${username}`, { 
        headers,
        cache: 'no-store' 
      });
      if (res.ok) {
        const data = await res.json();
        setProjects(data);
        // Calculate and log total stars
        const totalStars = data.reduce((sum: number, p: any) => sum + (p.likes || 0), 0);
        console.log(`[Profile] Total stars received: ${totalStars} (from ${data.length} projects)`);
        console.log(`[Profile] Projects with likes:`, data.map((p: any) => ({ id: p.id, title: p.title, likes: p.likes || 0 })));
      }
    } catch (error) {
      console.error('Error fetching projects:', error);
    }
  };

  const checkFollowStatus = async () => {
    if (!currentUser) {
      console.log('[Profile] No current user, skipping follow status check');
      return;
    }
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`/api/users/${username}/following-status`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        console.log('[Profile] Follow status:', data);
        setFollowing(data.following);
        setPending(data.pending);
        setIsPrivate(data.isPrivate);
      } else {
        console.error('[Profile] Failed to fetch follow status:', res.status);
      }
    } catch (error) {
      console.error('Error checking follow status:', error);
    }
  };

  const handleFollowToggle = async () => {
    if (!currentUser) {
      router.push('/login');
      return;
    }

    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`/api/users/follow?username=${encodeURIComponent(username)}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (res.ok) {
        const data = await res.json();
        console.log('[Profile] Follow toggle response:', data);
        setFollowing(data.following);
        setPending(data.pending);
        // Refresh profile to update follower count
        fetchProfile();
        // Refresh follow status to ensure it's up to date
        setTimeout(() => checkFollowStatus(), 500);
      } else {
        const errorData = await res.json();
        if (errorData.pending) {
          setPending(true);
        }
      }
    } catch (error) {
      console.error('Error toggling follow:', error);
    }
  };

  const fetchStarredProjects = async () => {
    if (!currentUser) return;
    try {
      const token = localStorage.getItem('token');
      const res = await fetch('/api/projects/starred', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (res.ok) {
        const data = await res.json();
        console.log('[Profile] Starred projects fetched:', data.length, data);
        setStarredProjects(data || []);
      } else {
        console.error('[Profile] Failed to fetch starred projects:', res.status);
        setStarredProjects([]);
      }
    } catch (error) {
      console.error('Error fetching starred projects:', error);
      setStarredProjects([]);
    }
  };

  const fetchOrders = async () => {
    if (!currentUser || !isOwnProfile) return;
    try {
      const token = localStorage.getItem('token');
      const res = await fetch('/api/orders/my-orders?type=all', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (res.ok) {
        const data = await res.json();
        console.log('[Profile] Orders fetched:', {
          purchases: data.purchases?.length || 0,
          sales: data.sales?.length || 0,
          manufacturingOrders: data.manufacturingOrders?.length || 0,
          manufacturingOrdersData: data.manufacturingOrders
        });
        setOrders({
          purchases: data.purchases || [],
          sales: data.sales || [],
          manufacturingOrders: data.manufacturingOrders || []
        });
      } else {
        console.error('[Profile] Failed to fetch orders:', res.status);
        setOrders({ purchases: [], sales: [], manufacturingOrders: [] });
      }
    } catch (error) {
      console.error('Error fetching orders:', error);
      setOrders({ purchases: [], sales: [], manufacturingOrders: [] });
    }
  };

  if (loading) {
    return (
      <ThreePanelLayout
        leftPanel={<GlobalNavSidebar />}
        centerPanel={
          <CenterPanel>
            <PanelContent>
              <div className="flex items-center justify-center py-20">
                <div className="animate-spin w-8 h-8 border-2 border-blue-400 border-t-transparent rounded-full"></div>
              </div>
            </PanelContent>
          </CenterPanel>
        }
      />
    );
  }

  if (!profile) {
    return (
      <ThreePanelLayout
        leftPanel={<GlobalNavSidebar />}
        centerPanel={
          <CenterPanel>
            <PanelContent>
              <div className="max-w-7xl mx-auto px-6 py-20">
                <EmptyState
                  icon={<User size={48} />}
                  title="User not found"
                  description="This user doesn't exist or their profile is private."
                />
              </div>
            </PanelContent>
          </CenterPanel>
        }
      />
    );
  }

  return (
    <ThreePanelLayout
      leftPanel={<GlobalNavSidebar />}
      centerPanel={
        <CenterPanel>
          <PanelContent>
            <div className="max-w-7xl mx-auto px-6 py-6">
              {/* Profile Header */}
              <Card padding={profile.banner ? "none" : "lg"} className="mb-6 overflow-hidden">
                {/* Banner - Only show if banner exists */}
                {profile.banner && (
                  <div className="w-full h-48 relative overflow-hidden">
                    <img
                      src={`/api/users/banner/${profile.banner}`}
                      alt="Profile Banner"
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        e.currentTarget.style.display = 'none';
                      }}
                    />
                  </div>
                )}
                
                <div className={profile.banner ? "px-6" : ""} style={{ paddingTop: profile.banner ? '40px' : '0', paddingBottom: profile.banner ? '16px' : '0' }}>
                  <div className="flex items-start gap-6">
                    {/* Avatar */}
                    <div 
                      className="w-24 h-24 rounded-full flex items-center justify-center text-3xl font-bold flex-shrink-0 border-4 relative z-10"
                      style={{ 
                        backgroundColor: profile.profile_picture ? 'transparent' : DS.colors.primary.blue, 
                        color: '#ffffff',
                        borderColor: DS.colors.background.panel,
                        marginTop: profile.banner ? '-16px' : '0'
                      }}
                    >
                      {profile.profile_picture ? (
                        <img
                          src={`/api/users/profile-picture/${profile.profile_picture}`}
                          alt={username}
                          className="w-full h-full rounded-full object-cover"
                          onError={(e) => {
                            e.currentTarget.style.display = 'none';
                            const parent = e.currentTarget.parentElement;
                            if (parent) {
                              parent.style.backgroundColor = DS.colors.primary.blue;
                              parent.textContent = username.substring(0, 2).toUpperCase();
                            }
                          }}
                        />
                      ) : (
                        username.substring(0, 2).toUpperCase()
                      )}
                    </div>

                  {/* Info */}
                  <div className="flex-1" style={{ paddingTop: '0px' }}>
                    <div className="flex items-center justify-between mb-2">
                      <div>
                        <h1 className="text-2xl font-bold" style={{ color: DS.colors.text.primary, marginTop: '-8px' }}>
                          {profile.display_name || username}
                        </h1>
                        <p className="text-base" style={{ color: DS.colors.text.secondary }}>
                          @{username}
                        </p>
                      </div>

                      <div className="flex items-center gap-2">
                        {isOwnProfile ? (
                          <Button variant="secondary" icon={<Settings size={18} />} onClick={() => router.push('/settings')}>
                            Edit Profile
                          </Button>
                        ) : (
                          <>
                            <Button 
                              variant={pending ? "secondary" : following ? "secondary" : "primary"}
                              icon={pending ? null : following ? <UserMinus size={18} /> : <UserPlus size={18} />}
                              onClick={handleFollowToggle}
                              disabled={pending}
                            >
                              {pending ? 'Pending' : following ? 'Unfollow' : isPrivate ? 'Request to Follow' : 'Follow'}
                            </Button>
                            {following && (
                              <Button 
                                variant="secondary"
                                icon={<MessageCircle size={18} />}
                                onClick={() => router.push(`/messages?with=${username}`)}
                              >
                                Message
                              </Button>
                            )}
                          </>
                        )}
                      </div>
                    </div>

                    {profile.bio && (
                      <p className="text-base mb-4" style={{ color: DS.colors.text.primary }}>
                        {profile.bio}
                      </p>
                    )}

                    <div className="flex items-center gap-6 text-sm" style={{ color: DS.colors.text.tertiary }}>
                      {profile.location && (
                        <div className="flex items-center gap-1">
                          <MapPin size={16} />
                          {profile.location}
                        </div>
                      )}
                      {profile.website && (
                        <a 
                          href={profile.website} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="flex items-center gap-1 hover:underline"
                          style={{ color: DS.colors.primary.blue }}
                        >
                          <LinkIcon size={16} />
                          {profile.website.replace(/^https?:\/\//, '')}
                        </a>
                      )}
                      <div className="flex items-center gap-1">
                        <Calendar size={16} />
                        Joined {new Date(profile.created_at).toLocaleDateString()}
                      </div>
                    </div>

                    {/* Social Links */}
                    {profile.social_links && Object.keys(profile.social_links).some(key => profile.social_links[key]) && (
                      <div className="flex items-center gap-3 mt-4">
                        {profile.social_links.github && (
                          <a
                            href={formatSocialUrl('github', profile.social_links.github)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-2 rounded-lg transition-all hover:scale-110"
                            style={{
                              backgroundColor: DS.colors.background.elevated,
                              color: DS.colors.text.secondary,
                            }}
                            onMouseEnter={(e) => {
                              e.currentTarget.style.backgroundColor = DS.colors.background.panelHover;
                              e.currentTarget.style.color = DS.colors.text.primary;
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.backgroundColor = DS.colors.background.elevated;
                              e.currentTarget.style.color = DS.colors.text.secondary;
                            }}
                            title="GitHub"
                          >
                            <Github size={20} />
                          </a>
                        )}
                        {profile.social_links.twitter && (
                          <a
                            href={formatSocialUrl('twitter', profile.social_links.twitter)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-2 rounded-lg transition-all hover:scale-110"
                            style={{
                              backgroundColor: DS.colors.background.elevated,
                              color: DS.colors.text.secondary,
                            }}
                            onMouseEnter={(e) => {
                              e.currentTarget.style.backgroundColor = DS.colors.background.panelHover;
                              e.currentTarget.style.color = DS.colors.text.primary;
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.backgroundColor = DS.colors.background.elevated;
                              e.currentTarget.style.color = DS.colors.text.secondary;
                            }}
                            title="X (Twitter)"
                          >
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" style={{ color: 'inherit' }}>
                              <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
                            </svg>
                          </a>
                        )}
                        {profile.social_links.instagram && (
                          <a
                            href={formatSocialUrl('instagram', profile.social_links.instagram)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-2 rounded-lg transition-all hover:scale-110"
                            style={{
                              backgroundColor: DS.colors.background.elevated,
                              color: DS.colors.text.secondary,
                            }}
                            onMouseEnter={(e) => {
                              e.currentTarget.style.backgroundColor = DS.colors.background.panelHover;
                              e.currentTarget.style.color = DS.colors.text.primary;
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.backgroundColor = DS.colors.background.elevated;
                              e.currentTarget.style.color = DS.colors.text.secondary;
                            }}
                            title="Instagram"
                          >
                            <Instagram size={20} />
                          </a>
                        )}
                        {profile.social_links.youtube && (
                          <a
                            href={formatSocialUrl('youtube', profile.social_links.youtube)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-2 rounded-lg transition-all hover:scale-110"
                            style={{
                              backgroundColor: DS.colors.background.elevated,
                              color: DS.colors.text.secondary,
                            }}
                            onMouseEnter={(e) => {
                              e.currentTarget.style.backgroundColor = DS.colors.background.panelHover;
                              e.currentTarget.style.color = DS.colors.text.primary;
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.backgroundColor = DS.colors.background.elevated;
                              e.currentTarget.style.color = DS.colors.text.secondary;
                            }}
                            title="YouTube"
                          >
                            <Youtube size={20} />
                          </a>
                        )}
                      </div>
                    )}

                    <div className="flex items-center gap-6 mt-4 text-base">
                      <Link href={`/profile/${username}/following`} className="hover:underline">
                        <span className="font-semibold" style={{ color: DS.colors.text.primary }}>
                          {profile.following_count || 0}
                        </span>
                        {' '}
                        <span style={{ color: DS.colors.text.secondary }}>Following</span>
                      </Link>
                      <Link href={`/profile/${username}/followers`} className="hover:underline">
                        <span className="font-semibold" style={{ color: DS.colors.text.primary }}>
                          {profile.followers_count || 0}
                        </span>
                        {' '}
                        <span style={{ color: DS.colors.text.secondary }}>Followers</span>
                      </Link>
                    </div>
                  </div>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-4 gap-4 mt-5 pt-5 border-t" style={{ borderColor: DS.colors.border.default }}>
                  <div className="text-center">
                    <div className="text-2xl font-bold" style={{ color: DS.colors.text.primary }}>
                      {projects.length}
                    </div>
                    <div className="text-sm" style={{ color: DS.colors.text.secondary }}>Projects</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold" style={{ color: DS.colors.text.primary }}>
                      {projects.reduce((sum, p) => sum + (p.likes || 0), 0)}
                    </div>
                    <div className="text-sm" style={{ color: DS.colors.text.secondary }}>Stars</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold" style={{ color: DS.colors.text.primary }}>
                      {projects.reduce((sum, p) => sum + (p.downloads || 0), 0)}
                    </div>
                    <div className="text-sm" style={{ color: DS.colors.text.secondary }}>Downloads</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold" style={{ color: DS.colors.text.primary }}>
                      {projects.reduce((sum, p) => sum + (p.views || 0), 0)}
                    </div>
                    <div className="text-sm" style={{ color: DS.colors.text.secondary }}>Views</div>
                  </div>
                </div>
                </div>
              </Card>

              {/* Tabs */}
              <Tabs
                tabs={[
                  { id: 'projects', label: 'Projects', icon: <Grid size={16} />, badge: projects.length },
                  ...(isOwnProfile ? [
                    { id: 'starred', label: 'Starred', icon: <Star size={16} />, badge: starredProjects.length },
                    { id: 'orders', label: 'Orders', icon: <ShoppingBag size={16} />, badge: orders.purchases.length + orders.sales.length + orders.manufacturingOrders.length }
                  ] : []),
                ]}
                activeTab={activeTab}
                onTabChange={setActiveTab}
              />

              {/* Projects Grid */}
              <div className="mt-6">
                {activeTab === 'projects' && (
                  <>
                    {projects.length === 0 ? (
                      <EmptyState
                        icon={<Grid size={48} />}
                        title="No projects yet"
                        description={isOwnProfile ? "Upload your first project to get started!" : `${username} hasn't uploaded any projects yet.`}
                      />
                    ) : (
                      <div className="grid grid-cols-3 gap-4">
                        {projects.map((project) => (
                          <Card
                            key={project.id}
                            hover
                            padding="none"
                            onClick={() => router.push(`/project/${project.id}`)}
                            style={{ cursor: 'pointer' }}
                          >
                            {/* Thumbnail */}
                            <div 
                              className="w-full h-48 rounded-t-lg overflow-hidden relative"
                              style={{ backgroundColor: DS.colors.background.panel }}
                            >
                              {project.thumbnail_path ? (
                                <img
                                  src={(() => {
                                    const thumbnailPath = String(project.thumbnail_path);
                                    const filename = thumbnailPath.includes('/') 
                                      ? thumbnailPath.split('/').pop() || thumbnailPath
                                      : thumbnailPath;
                                    // Add cache-busting query parameter to ensure fresh images
                                    return `/api/thumbnails/${encodeURIComponent(filename)}?t=${Date.now()}`;
                                  })()}
                                  alt={project.title || project.name}
                                  className="w-full h-full object-cover"
                                  loading="lazy"
                                  onError={(e) => {
                                    e.currentTarget.style.display = 'none';
                                    const container = e.currentTarget.parentElement;
                                    if (container) {
                                      container.innerHTML = '<div class="w-full h-full flex items-center justify-center text-5xl">📦</div>';
                                    }
                                  }}
                                />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center text-5xl">📦</div>
                              )}
                            </div>

                            {/* Content */}
                            <div className="p-4">
                              <h3 className="font-semibold mb-2 line-clamp-1" style={{ color: DS.colors.text.primary }}>
                                {project.name || project.title}
                              </h3>
                              
                              {project.description && (
                                <p className="text-sm mb-3 line-clamp-2" style={{ color: DS.colors.text.secondary }}>
                                  {project.description}
                                </p>
                              )}

                              <div className="flex items-center gap-4 text-sm" style={{ color: DS.colors.text.tertiary }}>
                                <div className="flex items-center gap-1">
                                  <Star size={14} />
                                  {project.stars || 0}
                                </div>
                                <div className="flex items-center gap-1">
                                  <Download size={14} />
                                  {project.downloads || 0}
                                </div>
                                <div className="flex items-center gap-1">
                                  <Eye size={14} />
                                  {project.views || 0}
                                </div>
                              </div>
                            </div>
                          </Card>
                        ))}
                      </div>
                    )}
                  </>
                )}

                {activeTab === 'starred' && (
                  <>
                    {starredProjects.length === 0 ? (
                      <EmptyState
                        icon={<Star size={48} />}
                        title="No starred projects"
                        description="Projects you star will appear here."
                      />
                    ) : (
                      <div className="grid grid-cols-3 gap-4">
                        {starredProjects.map((project) => (
                          <Card
                            key={project.id}
                            hover
                            padding="none"
                            onClick={() => router.push(`/project/${project.id}`)}
                            style={{ cursor: 'pointer' }}
                          >
                            {/* Thumbnail */}
                            <div 
                              className="aspect-video rounded-t-lg overflow-hidden relative"
                              style={{ backgroundColor: DS.colors.background.panel }}
                            >
                              {project.thumbnail_path ? (
                                <img
                                  src={(() => {
                                    const thumbnailPath = String(project.thumbnail_path);
                                    const filename = thumbnailPath.includes('/') 
                                      ? thumbnailPath.split('/').pop() || thumbnailPath
                                      : thumbnailPath;
                                    // Add cache-busting query parameter to ensure fresh images
                                    return `/api/thumbnails/${encodeURIComponent(filename)}?t=${Date.now()}`;
                                  })()}
                                  alt={project.title || project.name}
                                  className="w-full h-full object-cover"
                                  loading="lazy"
                                  onError={(e) => {
                                    e.currentTarget.style.display = 'none';
                                    const container = e.currentTarget.parentElement;
                                    if (container) {
                                      container.innerHTML = '<div class="w-full h-full flex items-center justify-center text-5xl">📦</div>';
                                    }
                                  }}
                                />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center text-5xl">📦</div>
                              )}
                            </div>

                            {/* Content */}
                            <div className="p-4">
                              <h3 className="font-semibold mb-2 line-clamp-1" style={{ color: DS.colors.text.primary }}>
                                {project.name || project.title}
                              </h3>
                              
                              {project.description && (
                                <p className="text-sm mb-3 line-clamp-2" style={{ color: DS.colors.text.secondary }}>
                                  {project.description}
                                </p>
                              )}

                              <div className="flex items-center gap-4 text-sm" style={{ color: DS.colors.text.tertiary }}>
                                <div className="flex items-center gap-1">
                                  <Star size={14} />
                                  {project.likes || 0}
                                </div>
                                <div className="flex items-center gap-1">
                                  <Download size={14} />
                                  {project.downloads || 0}
                                </div>
                                <div className="flex items-center gap-1">
                                  <Eye size={14} />
                                  {project.views || 0}
                                </div>
                              </div>
                            </div>
                          </Card>
                        ))}
                      </div>
                    )}
                  </>
                )}

                {activeTab === 'orders' && isOwnProfile && (
                  <>
                    {orders.purchases.length === 0 && orders.sales.length === 0 && orders.manufacturingOrders.length === 0 ? (
                      <EmptyState
                        icon={<ShoppingBag size={48} />}
                        title="No orders yet"
                        description="Your purchases, sales, and manufacturing orders will appear here."
                      />
                    ) : (
                      <div className="space-y-6">
                        {/* Purchases */}
                        {orders.purchases.length > 0 && (
                          <div>
                            <h3 className="text-lg font-semibold mb-4" style={{ color: DS.colors.text.primary }}>
                              Purchases ({orders.purchases.length})
                            </h3>
                            <div className="grid gap-4">
                              {orders.purchases.map((order: any) => (
                                <Card key={order.id} padding="md" hover>
                                  <div className="flex items-center justify-between">
                                    <div>
                                      <h4 className="font-semibold" style={{ color: DS.colors.text.primary }}>
                                        {order.project_title}
                                      </h4>
                                      <p className="text-sm" style={{ color: DS.colors.text.secondary }}>
                                        Order #{order.order_number} • {new Date(order.created_at).toLocaleDateString()}
                                      </p>
                                    </div>
                                    <div className="text-right">
                                      <p className="font-bold" style={{ color: DS.colors.accent.success }}>
                                        ${order.amount}
                                      </p>
                                      <Badge variant={order.payment_status === 'succeeded' ? 'success' : 'secondary'} size="sm">
                                        {order.status}
                                      </Badge>
                                    </div>
                                  </div>
                                </Card>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Sales */}
                        {orders.sales.length > 0 && (
                          <div>
                            <h3 className="text-lg font-semibold mb-4" style={{ color: DS.colors.text.primary }}>
                              Sales ({orders.sales.length})
                            </h3>
                            <div className="grid gap-4">
                              {orders.sales.map((order: any) => (
                                <Card key={order.id} padding="md" hover>
                                  <div className="flex items-center justify-between">
                                    <div>
                                      <h4 className="font-semibold" style={{ color: DS.colors.text.primary }}>
                                        {order.project_title}
                                      </h4>
                                      <p className="text-sm" style={{ color: DS.colors.text.secondary }}>
                                        Order #{order.order_number} • {new Date(order.created_at).toLocaleDateString()}
                                      </p>
                                    </div>
                                    <div className="text-right">
                                      <p className="font-bold" style={{ color: DS.colors.accent.success }}>
                                        ${order.amount}
                                      </p>
                                      <Badge variant={order.payment_status === 'succeeded' ? 'success' : 'secondary'} size="sm">
                                        {order.status}
                                      </Badge>
                                    </div>
                                  </div>
                                </Card>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Manufacturing Orders */}
                        {orders.manufacturingOrders.length > 0 && (
                          <div>
                            <h3 className="text-lg font-semibold mb-4" style={{ color: DS.colors.text.primary }}>
                              Manufacturing Orders ({orders.manufacturingOrders.length})
                            </h3>
                            <div className="grid gap-4">
                              {orders.manufacturingOrders.map((order: any) => (
                                <Card key={order.id} padding="md" hover>
                                  <div className="flex items-center">
                                    <div className="flex-1">
                                      <h4 className="font-semibold" style={{ color: DS.colors.text.primary }}>
                                        {order.file_name}
                                      </h4>
                                      <p className="text-sm" style={{ color: DS.colors.text.secondary }}>
                                        Order #{order.order_number} • {new Date(order.created_at).toLocaleDateString()}
                                      </p>
                                    </div>
                                    <div style={{ marginLeft: '32px', marginRight: '32px', flexShrink: 0 }}>
                                      <Badge variant={order.status === 'completed' ? 'success' : 'secondary'} size="md" style={{ paddingLeft: '16px', paddingRight: '16px', paddingTop: '8px', paddingBottom: '8px' }}>
                                        Status: {order.status}
                                      </Badge>
                                    </div>
                                    <div className="flex-1 text-right">
                                      <p className="font-bold" style={{ color: DS.colors.accent.success }}>
                                        {order.estimated_cost}
                                      </p>
                                    </div>
                                  </div>
                                </Card>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>
          </PanelContent>
        </CenterPanel>
      }
    />
  );
}
