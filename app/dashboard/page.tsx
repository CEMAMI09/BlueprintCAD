/**
 * Dashboard Page - GitHub-style Dashboard
 * Widgets showing recent activity, earnings, recommendations
 */

'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  ThreePanelLayout,
  CenterPanel,
  RightPanel,
  PanelHeader,
  PanelContent,
} from '@/components/ui/ThreePanelLayout';
import { GlobalNavSidebar } from '@/components/ui/GlobalNavSidebar';
import { Card, Button, Badge } from '@/components/ui/UIComponents';
import { DesignSystem as DS } from '@/backend/lib/ui/design-system';
import {
  TrendingUp,
  Folder,
  GitBranch,
  DollarSign,
  Eye,
  Download,
  Star,
  Clock,
  Users,
  HardDrive,
  Crown,
  Upload,
  BarChart3,
} from 'lucide-react';
import Link from 'next/link';
import TierBadge from '@/frontend/components/TierBadge';

export default function DashboardPage() {
  const router = useRouter();
  const [selectedActivity, setSelectedActivity] = useState<any>(null);
  const [stats, setStats] = useState<any>(null);
  const [recentActivity, setRecentActivity] = useState<any[]>([]);
  const [trending, setTrending] = useState<any[]>([]);
  const [userInfo, setUserInfo] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [storage, setStorage] = useState<{ used: number; max: number; percentage: number } | null>(null);
  const [subscriptionTier, setSubscriptionTier] = useState<string>('free');

  useEffect(() => {
    fetchDashboardData();
    fetchSubscriptionTier();
  }, []);

  const fetchSubscriptionTier = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) return;
      
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/subscriptions/check`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setSubscriptionTier(data.tier || 'free');
      }
    } catch (error) {
      console.error('Error fetching subscription:', error);
    }
  };

  const fetchDashboardData = async () => {
    try {
      const token = localStorage.getItem('token');
      const headers: HeadersInit = {};
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      // Fetch stats
      const statsRes = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/dashboard/stats`, { headers });
      if (statsRes.ok) {
        const statsData = await statsRes.json();
        setStats(statsData);
        setUserInfo(statsData.user);
      }

      // Fetch recent activity
      const activityRes = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/dashboard/activity`, { headers });
      if (activityRes.ok) {
        const activityData = await activityRes.json();
        setRecentActivity(activityData);
      }

      // Fetch trending designs
      const trendingRes = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/dashboard/trending`);
      if (trendingRes.ok) {
        const trendingData = await trendingRes.json();
        setTrending(trendingData);
      }

      // Fetch storage usage
      const storageRes = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/dashboard/storage`, { headers });
      if (storageRes.ok) {
        const storageData = await storageRes.json();
        setStorage(storageData);
      }
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatNumber = (num: number) => {
    if (num >= 1000) {
      return (num / 1000).toFixed(1) + 'k';
    }
    return num.toString();
  };

  const formatEarnings = (amount: string) => {
    const num = parseFloat(amount);
    if (num >= 1000) {
      return '$' + (num / 1000).toFixed(1) + 'k';
    }
    return '$' + num.toFixed(2);
  };

  const formatStorage = (bytes: number) => {
    if (bytes === -1) return 'Unlimited';
    if (bytes >= 1024 * 1024 * 1024) {
      return (bytes / (1024 * 1024 * 1024)).toFixed(2) + ' GB';
    } else if (bytes >= 1024 * 1024) {
      return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
    } else if (bytes >= 1024) {
      return (bytes / 1024).toFixed(2) + ' KB';
    }
    return bytes + ' B';
  };

  const getInitials = (username: string) => {
    if (!username) return 'U';
    const parts = username.split(' ');
    if (parts.length > 1) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return username.substring(0, 2).toUpperCase();
  };

  // Default stats while loading
  const displayStats = stats ? [
    { label: 'Total Projects', value: stats.totalProjects.toString(), icon: Folder, color: DS.colors.primary.blue },
    { label: 'Active Versions', value: stats.activeVersions.toString(), icon: GitBranch, color: DS.colors.accent.success },
    { label: 'Total Earnings', value: formatEarnings(stats.totalEarnings), icon: DollarSign, color: DS.colors.accent.cyan },
    { label: 'Total Views', value: formatNumber(stats.totalViews), icon: Eye, color: DS.colors.accent.purple },
  ] : [
    { label: 'Total Projects', value: '0', icon: Folder, color: DS.colors.primary.blue },
    { label: 'Active Versions', value: '0', icon: GitBranch, color: DS.colors.accent.success },
    { label: 'Total Earnings', value: '$0', icon: DollarSign, color: DS.colors.accent.cyan },
    { label: 'Total Views', value: '0', icon: Eye, color: DS.colors.accent.purple },
  ];

  return (
    <ThreePanelLayout
      leftPanel={<GlobalNavSidebar />}
      centerPanel={
        <CenterPanel>
          <PanelHeader>
            <div className="flex items-center justify-between w-full">
              <div>
                <h1 className="text-2xl font-bold" style={{ color: DS.colors.text.primary }}>
                  Dashboard
                </h1>
                <p className="text-sm mt-1" style={{ color: DS.colors.text.secondary }}>
                  Welcome back! Here's what's happening.
                </p>
              </div>
              <div className="flex items-center gap-3">
                <Link href="/dashboard/analytics">
                  <Button 
                    variant="ghost" 
                    icon={<BarChart3 size={18} />} 
                    className="font-bold border border-[#2A2A2A] bg-transparent text-[#A0A0A0] rounded-full px-5 py-2 hover:bg-[#181818] hover:border-[#333333] hover:text-[#E0E0E0] hover:scale-105 transition-transform"
                  >
                    Analytics
                  </Button>
                </Link>
                <Button 
                  variant="ghost" 
                  icon={<Upload size={18} />} 
                  onClick={() => router.push('/upload')}
                  className="font-bold border border-[#2A2A2A] bg-transparent text-[#A0A0A0] rounded-full px-5 py-2 hover:bg-[#181818] hover:border-[#333333] hover:text-[#E0E0E0] hover:scale-105 transition-transform"
                >
                  Upload Design
                </Button>
              </div>
            </div>
          </PanelHeader>

          <PanelContent className="p-6">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <div className="w-8 h-8 border-4 border-blue-500/20 border-t-blue-500 rounded-full animate-spin"></div>
              </div>
            ) : (
              <>
                {/* Stats Grid */}
                <div className="grid grid-cols-4 gap-4 mb-8">
                  {displayStats.map((stat, index) => {
                const Icon = stat.icon;
                return (
                  <Card key={index} hover padding="md">
                    <div className="flex items-center gap-4">
                      <div
                        className="w-12 h-12 rounded-lg flex items-center justify-center"
                        style={{ backgroundColor: `${stat.color}22` }}
                      >
                        <Icon size={24} style={{ color: stat.color }} />
                      </div>
                      <div>
                        <p className="text-2xl font-bold" style={{ color: DS.colors.text.primary }}>
                          {stat.value}
                        </p>
                        <p className="text-sm" style={{ color: DS.colors.text.secondary }}>
                          {stat.label}
                        </p>
                      </div>
                    </div>
                  </Card>
                );
              })}
            </div>

                {/* Recent Activity */}
                <div className="mb-8">
                  <h2 className="text-lg font-semibold mb-4" style={{ color: DS.colors.text.primary }}>
                    Recent Activity
                  </h2>
                  <Card padding="none">
                    {recentActivity.length === 0 ? (
                      <div className="p-8 text-center" style={{ color: DS.colors.text.secondary }}>
                        No recent activity
                      </div>
                    ) : (
                      <div className="divide-y" style={{ borderColor: DS.colors.border.subtle }}>
                        {recentActivity.map((activity) => (
                    <div
                      key={activity.id}
                      className="p-4 hover:bg-opacity-50 cursor-pointer transition-colors"
                      onClick={() => setSelectedActivity(activity)}
                      style={{
                        backgroundColor: selectedActivity?.id === activity.id ? DS.colors.background.panelHover : 'transparent',
                      }}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <p className="font-medium" style={{ color: DS.colors.text.primary }}>
                            {activity.project}
                          </p>
                          <p className="text-sm mt-1" style={{ color: DS.colors.text.secondary }}>
                            {activity.action}
                          </p>
                          <div className="flex items-center gap-2 mt-2">
                            <Clock size={14} style={{ color: DS.colors.text.tertiary }} />
                            <span className="text-xs" style={{ color: DS.colors.text.tertiary }}>
                              {activity.time}
                            </span>
                          </div>
                        </div>
                        {activity.amount && (
                          <Badge variant="success">{activity.amount}</Badge>
                        )}
                      </div>
                        </div>
                      ))}
                      </div>
                    )}
                  </Card>
                </div>

                {/* Trending Designs */}
                <div>
                  <h2 className="text-lg font-semibold mb-4" style={{ color: DS.colors.text.primary }}>
                    Trending Designs
                  </h2>
                  {trending.length === 0 ? (
                    <div className="p-8 text-center" style={{ color: DS.colors.text.secondary }}>
                      No trending designs
                    </div>
                  ) : (
                    <div className="grid grid-cols-3 gap-4">
                      {trending.map((design) => (
                  <Card 
                        key={design.id} 
                        hover 
                        padding="none"
                        className="cursor-pointer"
                        onClick={() => router.push(`/project/${design.id}`)}
                      >
                        {/* Thumbnail */}
                        <div className="aspect-video rounded-t-lg overflow-hidden relative" style={{ backgroundColor: DS.colors.background.panel, minHeight: '180px' }}>
                          {design.thumbnail ? (
                            <img 
                              src={(() => {
                                const thumbnailPath = String(design.thumbnail);
                                const filename = thumbnailPath.includes('/') 
                                  ? thumbnailPath.split('/').pop() || thumbnailPath
                                  : thumbnailPath;
                                // Add cache-busting query parameter to ensure fresh images
                                const url = `/api/thumbnails/${encodeURIComponent(filename)}?t=${Date.now()}`;
                                console.log(`[Dashboard] Loading thumbnail for ${design.id}: ${url}`);
                                return url;
                              })()}
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
                                console.error(`[Dashboard] Failed to load thumbnail for ${design.id}:`, e);
                                e.currentTarget.style.display = 'none';
                                const container = e.currentTarget.parentElement;
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
                                console.log(`[Dashboard] Successfully loaded thumbnail for ${design.id}`);
                              }}
                            />
                          ) : (
                            <div className="flex flex-col items-center justify-center w-full h-full">
                              <span className="text-5xl mb-2">📦</span>
                              <span className="text-xs" style={{ color: DS.colors.text.tertiary }}>No thumbnail available</span>
                            </div>
                          )}
                        </div>
                        {/* Content */}
                        <div className="p-4">
                          <h3 className="font-semibold mb-1" style={{ color: DS.colors.text.primary }}>
                            {design.title}
                          </h3>
                          <p className="text-sm mb-3" style={{ color: DS.colors.text.secondary }}>
                            by {design.author}
                          </p>
                          <div className="flex items-center gap-4 text-sm" style={{ color: DS.colors.text.tertiary }}>
                            <div className="flex items-center gap-1">
                              <Star size={14} />
                              {design.stars}
                            </div>
                            <div className="flex items-center gap-1">
                              <Eye size={14} />
                              {formatNumber(design.views || 0)}
                            </div>
                          </div>
                        </div>
                      </Card>
                    ))}
                    </div>
                  )}
                </div>
              </>
            )}
          </PanelContent>
        </CenterPanel>
      }
      rightPanel={
        <RightPanel>
          <PanelHeader title="Your Profile" />
          <PanelContent className="p-6">
            {/* User Quick Profile */}
            <div className="text-center mb-6">
              {userInfo?.profile_picture ? (
                <img
                  src={`/api/users/profile-picture/${userInfo.profile_picture}`}
                  alt={userInfo.username}
                  className="w-20 h-20 rounded-full mx-auto mb-4 object-cover"
                  onError={(e) => {
                    e.currentTarget.style.display = 'none';
                    const fallback = e.currentTarget.nextElementSibling as HTMLElement;
                    if (fallback) fallback.style.display = 'flex';
                  }}
                />
              ) : null}
              <div
                className="w-20 h-20 rounded-full mx-auto mb-4 flex items-center justify-center text-2xl font-bold"
                style={{ 
                  backgroundColor: DS.colors.primary.blue, 
                  color: '#ffffff',
                  display: userInfo?.profile_picture ? 'none' : 'flex'
                }}
              >
                {userInfo ? getInitials(userInfo.username) : 'U'}
              </div>
              <h3 className="font-semibold" style={{ color: DS.colors.text.primary }}>
                {userInfo?.username || 'Loading...'}
              </h3>
              <p className="text-sm" style={{ color: DS.colors.text.secondary }}>
                @{userInfo?.username || 'user'}
              </p>
              <div className="flex items-center justify-center mt-2">
                <TierBadge tier={subscriptionTier} size="sm" />
              </div>
            </div>

            {/* Storage Usage */}
            <div className="mb-6">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium" style={{ color: DS.colors.text.primary }}>
                  Storage
                </span>
                <span className="text-sm" style={{ color: DS.colors.text.secondary }}>
                  {storage ? `${formatStorage(storage.used)} / ${formatStorage(storage.max)}` : 'Loading...'}
                </span>
              </div>
              <div
                className="h-2 rounded-full overflow-hidden"
                style={{ backgroundColor: DS.colors.background.elevated }}
              >
                <div
                  className="h-full rounded-full transition-all"
                  style={{ 
                    width: storage ? `${Math.min(storage.percentage, 100)}%` : '0%', 
                    backgroundColor: storage && storage.percentage > 90 ? DS.colors.accent.error : DS.colors.primary.blue 
                  }}
                />
              </div>
            </div>

            {/* Quick Stats */}
            {stats && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Folder size={16} style={{ color: DS.colors.text.tertiary }} />
                    <span className="text-sm" style={{ color: DS.colors.text.secondary }}>
                      Projects
                    </span>
                  </div>
                  <span className="font-semibold" style={{ color: DS.colors.text.primary }}>
                    {stats.totalProjects}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Users size={16} style={{ color: DS.colors.text.tertiary }} />
                    <span className="text-sm" style={{ color: DS.colors.text.secondary }}>
                      Followers
                    </span>
                  </div>
                  <span className="font-semibold" style={{ color: DS.colors.text.primary }}>
                    {stats.followers}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Star size={16} style={{ color: DS.colors.text.tertiary }} />
                    <span className="text-sm" style={{ color: DS.colors.text.secondary }}>
                      Total Stars
                    </span>
                  </div>
                  <span className="font-semibold" style={{ color: DS.colors.text.primary }}>
                    {stats.totalStars}
                  </span>
                </div>
              </div>
            )}

            {userInfo && (
              <Button 
                variant="secondary" 
                fullWidth 
                className="mt-6"
                onClick={() => router.push(`/profile/${userInfo.username}`)}
              >
                View Full Profile
              </Button>
            )}
          </PanelContent>
        </RightPanel>
      }
    />
  );
}
