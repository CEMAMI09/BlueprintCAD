'use client';

import { useState, useEffect } from 'react';
import {
  ThreePanelLayout,
  CenterPanel,
  PanelHeader,
  PanelContent,
} from '@/components/ui/ThreePanelLayout';
import { GlobalNavSidebar } from '@/components/ui/GlobalNavSidebar';
import { Card, Button, Badge, Tabs } from '@/components/ui/UIComponents';
import { DesignSystem as DS } from '@/backend/lib/ui/design-system';
import SubscriptionGate from '@/frontend/components/SubscriptionGate';
import UpgradeModal from '@/frontend/components/UpgradeModal';
import {
  TrendingUp,
  Eye,
  Download,
  DollarSign,
  Star,
  Users,
  Calendar,
  BarChart3,
  PieChart,
  ArrowUp,
  ArrowDown,
} from 'lucide-react';

export default function AnalyticsPage() {
  const [activeTab, setActiveTab] = useState('overview');
  const [analytics, setAnalytics] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState('30d');
  const [userSubscription, setUserSubscription] = useState<any>(null);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);

  useEffect(() => {
    fetchSubscriptionStatus();
    fetchAnalytics();
  }, [dateRange]);

  const fetchSubscriptionStatus = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) return;

      const res = await fetch('/api/subscriptions/check', {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (res.ok) {
        const data = await res.json();
        setUserSubscription(data);
      }
    } catch (error) {
      console.error('Error fetching subscription:', error);
    }
  };

  const fetchAnalytics = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        setLoading(false);
        return;
      }

      const res = await fetch(`/api/analytics?range=${dateRange}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (res.ok) {
        const data = await res.json();
        setAnalytics(data);
      }
    } catch (error) {
      console.error('Error fetching analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleUpgradePrompt = () => {
    setShowUpgradeModal(true);
  };

  if (loading) {
    return (
      <ThreePanelLayout
        leftPanel={<GlobalNavSidebar />}
        centerPanel={
          <CenterPanel>
            <PanelHeader title="Analytics" />
            <PanelContent>
              <div className="flex items-center justify-center py-12">
                <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
              </div>
            </PanelContent>
          </CenterPanel>
        }
      />
    );
  }

  return (
    <>
      <SubscriptionGate
        feature="analytics"
        requiredTier="pro"
        showUpgradeModal={true}
        message="Analytics dashboard requires Pro subscription or higher"
      >
        <ThreePanelLayout
          leftPanel={<GlobalNavSidebar />}
          centerPanel={
            <CenterPanel>
              <PanelHeader 
                title="Analytics Dashboard"
                actions={
                  <select
                    value={dateRange}
                    onChange={(e) => setDateRange(e.target.value)}
                    className="px-3 py-1 rounded-lg text-sm"
                    style={{
                      backgroundColor: DS.colors.background.card,
                      border: `1px solid ${DS.colors.border.default}`,
                      color: DS.colors.text.primary,
                    }}
                  >
                    <option value="7d">Last 7 days</option>
                    <option value="30d">Last 30 days</option>
                    <option value="90d">Last 90 days</option>
                    <option value="1y">Last year</option>
                  </select>
                }
              />
              <PanelContent>
                <div className="space-y-6">
                  {/* Overview Stats */}
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    <Card padding="lg">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm" style={{ color: DS.colors.text.secondary }}>Total Views</p>
                          <p className="text-2xl font-bold mt-1" style={{ color: DS.colors.text.primary }}>
                            {analytics?.overview?.totalViews?.toLocaleString() || '0'}
                          </p>
                          <div className="flex items-center gap-1 mt-2">
                            <ArrowUp size={14} style={{ color: DS.colors.accent.success }} />
                            <span className="text-xs" style={{ color: DS.colors.accent.success }}>
                              {analytics?.overview?.viewsChange || '0'}%
                            </span>
                          </div>
                        </div>
                        <div className="p-3 rounded-lg" style={{ backgroundColor: `${DS.colors.primary.blue}20` }}>
                          <Eye size={24} style={{ color: DS.colors.primary.blue }} />
                        </div>
                      </div>
                    </Card>

                    <Card padding="lg">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm" style={{ color: DS.colors.text.secondary }}>Downloads</p>
                          <p className="text-2xl font-bold mt-1" style={{ color: DS.colors.text.primary }}>
                            {analytics?.overview?.totalDownloads?.toLocaleString() || '0'}
                          </p>
                          <div className="flex items-center gap-1 mt-2">
                            <ArrowUp size={14} style={{ color: DS.colors.accent.success }} />
                            <span className="text-xs" style={{ color: DS.colors.accent.success }}>
                              {analytics?.overview?.downloadsChange || '0'}%
                            </span>
                          </div>
                        </div>
                        <div className="p-3 rounded-lg" style={{ backgroundColor: `${DS.colors.accent.success}20` }}>
                          <Download size={24} style={{ color: DS.colors.accent.success }} />
                        </div>
                      </div>
                    </Card>

                    <Card padding="lg">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm" style={{ color: DS.colors.text.secondary }}>Revenue</p>
                          <p className="text-2xl font-bold mt-1" style={{ color: DS.colors.text.primary }}>
                            ${analytics?.overview?.totalRevenue?.toFixed(2) || '0.00'}
                          </p>
                          <div className="flex items-center gap-1 mt-2">
                            <ArrowUp size={14} style={{ color: DS.colors.accent.success }} />
                            <span className="text-xs" style={{ color: DS.colors.accent.success }}>
                              {analytics?.overview?.revenueChange || '0'}%
                            </span>
                          </div>
                        </div>
                        <div className="p-3 rounded-lg" style={{ backgroundColor: `${DS.colors.accent.warning}20` }}>
                          <DollarSign size={24} style={{ color: DS.colors.accent.warning }} />
                        </div>
                      </div>
                    </Card>

                    <Card padding="lg">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm" style={{ color: DS.colors.text.secondary }}>Stars</p>
                          <p className="text-2xl font-bold mt-1" style={{ color: DS.colors.text.primary }}>
                            {analytics?.overview?.totalStars?.toLocaleString() || '0'}
                          </p>
                          <div className="flex items-center gap-1 mt-2">
                            <ArrowUp size={14} style={{ color: DS.colors.accent.success }} />
                            <span className="text-xs" style={{ color: DS.colors.accent.success }}>
                              {analytics?.overview?.starsChange || '0'}%
                            </span>
                          </div>
                        </div>
                        <div className="p-3 rounded-lg" style={{ backgroundColor: `${DS.colors.accent.warning}20` }}>
                          <Star size={24} style={{ color: DS.colors.accent.warning }} />
                        </div>
                      </div>
                    </Card>
                  </div>

                  {/* Tabs */}
                  <Tabs
                    tabs={[
                      { id: 'overview', label: 'Overview', icon: <BarChart3 size={16} /> },
                      { id: 'projects', label: 'Projects', icon: <TrendingUp size={16} /> },
                      { id: 'sales', label: 'Sales', icon: <DollarSign size={16} /> },
                      { id: 'audience', label: 'Audience', icon: <Users size={16} /> },
                    ]}
                    activeTab={activeTab}
                    onTabChange={setActiveTab}
                  />

                  {/* Tab Content */}
                  {activeTab === 'overview' && (
                    <div className="space-y-6">
                      <Card padding="lg">
                        <h3 className="text-lg font-semibold mb-4" style={{ color: DS.colors.text.primary }}>
                          Views Over Time
                        </h3>
                        <div className="h-64 flex items-center justify-center" style={{ backgroundColor: DS.colors.background.elevated, borderRadius: '8px' }}>
                          <p style={{ color: DS.colors.text.secondary }}>Chart visualization would go here</p>
                        </div>
                      </Card>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <Card padding="lg">
                          <h3 className="text-lg font-semibold mb-4" style={{ color: DS.colors.text.primary }}>
                            Top Projects
                          </h3>
                          <div className="space-y-3">
                            {analytics?.topProjects?.slice(0, 5).map((project: any, idx: number) => (
                              <div key={idx} className="flex items-center justify-between py-2 border-b" style={{ borderColor: DS.colors.border.default }}>
                                <div className="flex-1">
                                  <p className="text-sm font-medium" style={{ color: DS.colors.text.primary }}>
                                    {project.title}
                                  </p>
                                  <p className="text-xs" style={{ color: DS.colors.text.secondary }}>
                                    {project.views} views
                                  </p>
                                </div>
                                <Badge variant="secondary">{idx + 1}</Badge>
                              </div>
                            )) || (
                              <p className="text-sm" style={{ color: DS.colors.text.secondary }}>No data available</p>
                            )}
                          </div>
                        </Card>

                        <Card padding="lg">
                          <h3 className="text-lg font-semibold mb-4" style={{ color: DS.colors.text.primary }}>
                            Recent Activity
                          </h3>
                          <div className="space-y-3">
                            {analytics?.recentActivity?.slice(0, 5).map((activity: any, idx: number) => (
                              <div key={idx} className="flex items-center gap-3 py-2">
                                <div className="p-2 rounded" style={{ backgroundColor: DS.colors.background.elevated }}>
                                  <Calendar size={16} style={{ color: DS.colors.text.secondary }} />
                                </div>
                                <div className="flex-1">
                                  <p className="text-sm" style={{ color: DS.colors.text.primary }}>
                                    {activity.description}
                                  </p>
                                  <p className="text-xs" style={{ color: DS.colors.text.tertiary }}>
                                    {new Date(activity.timestamp).toLocaleDateString()}
                                  </p>
                                </div>
                              </div>
                            )) || (
                              <p className="text-sm" style={{ color: DS.colors.text.secondary }}>No recent activity</p>
                            )}
                          </div>
                        </Card>
                      </div>
                    </div>
                  )}

                  {activeTab === 'projects' && (
                    <Card padding="lg">
                      <h3 className="text-lg font-semibold mb-4" style={{ color: DS.colors.text.primary }}>
                        Project Performance
                      </h3>
                      <div className="space-y-4">
                        {analytics?.projects?.map((project: any, idx: number) => (
                          <div key={idx} className="p-4 rounded-lg border" style={{ borderColor: DS.colors.border.default, backgroundColor: DS.colors.background.card }}>
                            <div className="flex items-center justify-between mb-3">
                              <h4 className="font-semibold" style={{ color: DS.colors.text.primary }}>{project.title}</h4>
                              <Badge variant="secondary">{project.status}</Badge>
                            </div>
                            <div className="grid grid-cols-4 gap-4 text-sm">
                              <div>
                                <p style={{ color: DS.colors.text.secondary }}>Views</p>
                                <p className="font-semibold" style={{ color: DS.colors.text.primary }}>{project.views}</p>
                              </div>
                              <div>
                                <p style={{ color: DS.colors.text.secondary }}>Downloads</p>
                                <p className="font-semibold" style={{ color: DS.colors.text.primary }}>{project.downloads}</p>
                              </div>
                              <div>
                                <p style={{ color: DS.colors.text.secondary }}>Stars</p>
                                <p className="font-semibold" style={{ color: DS.colors.text.primary }}>{project.stars}</p>
                              </div>
                              <div>
                                <p style={{ color: DS.colors.text.secondary }}>Revenue</p>
                                <p className="font-semibold" style={{ color: DS.colors.text.primary }}>${project.revenue?.toFixed(2) || '0.00'}</p>
                              </div>
                            </div>
                          </div>
                        )) || (
                          <p className="text-sm" style={{ color: DS.colors.text.secondary }}>No project data available</p>
                        )}
                      </div>
                    </Card>
                  )}

                  {activeTab === 'sales' && (
                    <Card padding="lg">
                      <h3 className="text-lg font-semibold mb-4" style={{ color: DS.colors.text.primary }}>
                        Sales Analytics
                      </h3>
                      <div className="space-y-4">
                        <div className="grid grid-cols-3 gap-4">
                          <div className="p-4 rounded-lg" style={{ backgroundColor: DS.colors.background.elevated }}>
                            <p className="text-sm" style={{ color: DS.colors.text.secondary }}>Total Sales</p>
                            <p className="text-2xl font-bold mt-1" style={{ color: DS.colors.text.primary }}>
                              {analytics?.sales?.totalSales || '0'}
                            </p>
                          </div>
                          <div className="p-4 rounded-lg" style={{ backgroundColor: DS.colors.background.elevated }}>
                            <p className="text-sm" style={{ color: DS.colors.text.secondary }}>Total Revenue</p>
                            <p className="text-2xl font-bold mt-1" style={{ color: DS.colors.text.primary }}>
                              ${analytics?.sales?.totalRevenue?.toFixed(2) || '0.00'}
                            </p>
                          </div>
                          <div className="p-4 rounded-lg" style={{ backgroundColor: DS.colors.background.elevated }}>
                            <p className="text-sm" style={{ color: DS.colors.text.secondary }}>Average Order</p>
                            <p className="text-2xl font-bold mt-1" style={{ color: DS.colors.text.primary }}>
                              ${analytics?.sales?.averageOrder?.toFixed(2) || '0.00'}
                            </p>
                          </div>
                        </div>
                        <div className="h-64 flex items-center justify-center" style={{ backgroundColor: DS.colors.background.elevated, borderRadius: '8px' }}>
                          <p style={{ color: DS.colors.text.secondary }}>Sales chart visualization would go here</p>
                        </div>
                      </div>
                    </Card>
                  )}

                  {activeTab === 'audience' && (
                    <Card padding="lg">
                      <h3 className="text-lg font-semibold mb-4" style={{ color: DS.colors.text.primary }}>
                        Audience Insights
                      </h3>
                      <div className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                          <div className="p-4 rounded-lg" style={{ backgroundColor: DS.colors.background.elevated }}>
                            <p className="text-sm" style={{ color: DS.colors.text.secondary }}>Total Followers</p>
                            <p className="text-2xl font-bold mt-1" style={{ color: DS.colors.text.primary }}>
                              {analytics?.audience?.totalFollowers || '0'}
                            </p>
                          </div>
                          <div className="p-4 rounded-lg" style={{ backgroundColor: DS.colors.background.elevated }}>
                            <p className="text-sm" style={{ color: DS.colors.text.secondary }}>New This Month</p>
                            <p className="text-2xl font-bold mt-1" style={{ color: DS.colors.text.primary }}>
                              {analytics?.audience?.newFollowers || '0'}
                            </p>
                          </div>
                        </div>
                      </div>
                    </Card>
                  )}
                </div>
              </PanelContent>
            </CenterPanel>
          }
        />
      </SubscriptionGate>

      {showUpgradeModal && (
        <UpgradeModal
          isOpen={showUpgradeModal}
          onClose={() => setShowUpgradeModal(false)}
          currentTier={userSubscription?.tier || 'free'}
          featureName="analytics"
          message="Analytics dashboard requires Pro subscription or higher"
        />
      )}
    </>
  );
}

