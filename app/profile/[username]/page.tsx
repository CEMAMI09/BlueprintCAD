/**
 * Profile Page - GitHub/Twitter Style Profile
 * User profile with projects grid, followers/following, and stats
 */

'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
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
} from 'lucide-react';

export default function ProfilePage() {
  const params = useParams();
  const router = useRouter();
  const username = (params?.username || '') as string;
  const [profile, setProfile] = useState<any>(null);
  const [projects, setProjects] = useState<any[]>([]);
  const [starredProjects, setStarredProjects] = useState<any[]>([]);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [following, setFollowing] = useState(false);
  const [activeTab, setActiveTab] = useState('projects');

  useEffect(() => {
    const userData = localStorage.getItem('user');
    if (userData) {
      setCurrentUser(JSON.parse(userData));
    }
  }, []);

  const isOwnProfile = currentUser?.username === username;

  useEffect(() => {
    if (username) {
      fetchProfile();
      fetchUserProjects();
      checkFollowStatus();
      if (currentUser?.username === username) {
        fetchStarredProjects();
      }
    }
  }, [username, currentUser]);

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
      const res = await fetch(`/api/projects?username=${username}`, { cache: 'no-store' });
      if (res.ok) {
        const data = await res.json();
        setProjects(data);
      }
    } catch (error) {
      console.error('Error fetching projects:', error);
    }
  };

  const checkFollowStatus = async () => {
    if (!currentUser) return;
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`/api/users/${username}/following-status`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setFollowing(data.following);
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
      const res = await fetch('/api/users/follow', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ username })
      });

      if (res.ok) {
        setFollowing(!following);
        // Refresh profile to update follower count
        fetchProfile();
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
        setStarredProjects(data);
      }
    } catch (error) {
      console.error('Error fetching starred projects:', error);
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
              <Card padding="lg" className="mb-6">
                <div className="flex items-start gap-6">
                  {/* Avatar */}
                  <div 
                    className="w-24 h-24 rounded-full flex items-center justify-center text-3xl font-bold flex-shrink-0"
                    style={{ backgroundColor: DS.colors.primary.blue, color: '#ffffff' }}
                  >
                    {username.substring(0, 2).toUpperCase()}
                  </div>

                  {/* Info */}
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-2">
                      <div>
                        <h1 className="text-2xl font-bold" style={{ color: DS.colors.text.primary }}>
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
                          <Button 
                            variant={following ? "secondary" : "primary"}
                            icon={following ? <UserMinus size={18} /> : <UserPlus size={18} />}
                            onClick={handleFollowToggle}
                          >
                            {following ? 'Unfollow' : 'Follow'}
                          </Button>
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
                <div className="grid grid-cols-4 gap-4 mt-6 pt-6 border-t" style={{ borderColor: DS.colors.border.default }}>
                  <div className="text-center">
                    <div className="text-2xl font-bold" style={{ color: DS.colors.text.primary }}>
                      {projects.length}
                    </div>
                    <div className="text-sm" style={{ color: DS.colors.text.secondary }}>Projects</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold" style={{ color: DS.colors.text.primary }}>
                      {projects.reduce((sum, p) => sum + (p.stars || 0), 0)}
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
              </Card>

              {/* Tabs */}
              <Tabs
                tabs={[
                  { id: 'projects', label: 'Projects', icon: <Grid size={16} />, badge: projects.length },
                  ...(isOwnProfile ? [{ id: 'starred', label: 'Starred', icon: <Star size={16} />, badge: starredProjects.length }] : []),
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
                              className="w-full h-48 flex items-center justify-center text-5xl"
                              style={{ backgroundColor: DS.colors.background.panel }}
                            >
                              📦
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
                              className="w-full h-48 flex items-center justify-center text-5xl"
                              style={{ backgroundColor: DS.colors.background.panel }}
                            >
                              📦
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
              </div>
            </div>
          </PanelContent>
        </CenterPanel>
      }
    />
  );
}
