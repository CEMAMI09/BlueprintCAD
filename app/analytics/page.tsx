'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import Link from 'next/link';
import { apiFetch } from '@/lib/apiClient';
import {
  ThreePanelLayout,
  CenterPanel,
  PanelHeader,
  PanelContent,
} from '@/components/ui/ThreePanelLayout';
import { GlobalNavSidebar } from '@/components/ui/GlobalNavSidebar';
import { Card, Badge, Tabs } from '@/components/ui/UIComponents';
import { DesignSystem as DS } from '@/backend/lib/ui/design-system';
import SubscriptionGate from '@/frontend/components/SubscriptionGate';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ComposedChart,
  AreaChart,
  Area,
} from 'recharts';
import {
  Eye,
  Download,
  DollarSign,
  Star,
  Users,
  BarChart3,
  ArrowUp,
  ArrowDown,
  RefreshCw,
  AlertCircle,
  ShoppingCart,
  FolderKanban,
} from 'lucide-react';
import { StatKpiIcon, DOWNLOAD_KPI_TILE_CLASS, LUCIDE_STROKE } from '@/components/ui/StatKpiIcon';

interface OverviewBlock {
  totalViews: number;
  totalViewsLifetime: number;
  totalDownloads: number;
  totalRevenue: number;
  totalStars: number;
  totalOrders: number;
  viewsChange: string;
  downloadsChange: string;
  revenueChange: string;
  starsChange: string;
}

interface AnalyticsResponse {
  period: number;
  periodStart: string;
  periodEnd: string;
  totalRevenue: number;
  totalDownloads: number;
  totalOrders: number;
  totalViews: number;
  totalViewsLifetime: number;
  totalStars: number;
  totalProjects: number;
  conversionRate: number;
  overview: OverviewBlock;
  trends: {
    revenue: Array<{ date: string; revenue: number; order_count: number }>;
    downloads: Array<{ date: string; download_count: number }>;
    views: Array<{ date: string; view_count: number }>;
  };
  revenueByMonth: Array<{ month: string; revenue: number; order_count: number }>;
  topProjects: Array<{ id: number; title: string; views: number }>;
  recentActivity: Array<{ type: string; timestamp: string; description: string; project_id?: number }>;
  projects: Array<{
    id: number;
    title: string;
    views: number;
    viewsLifetime: number;
    downloads: number;
    stars: number;
    revenue: number;
    status: string;
  }>;
  projectsPerformance: Array<{
    id: number;
    title: string;
    views: number;
    viewsLifetime: number;
    downloads: number;
    stars: number;
    revenue: number;
    status: string;
    for_sale: boolean;
  }>;
  sales: { totalSales: number; totalRevenue: number; averageOrder: number };
  audience: { totalFollowers: number; newFollowers: number };
  topSellingItems: Array<{
    id: number;
    title: string;
    thumbnail_path: string;
    download_count: number;
    revenue: number;
    price: number;
  }>;
}

function DeltaPill({ value }: { value: string }) {
  const n = parseFloat(String(value));
  if (!Number.isFinite(n)) {
    return (
      <span className="text-xs" style={{ color: DS.colors.text.tertiary }}>
        No prior period data
      </span>
    );
  }
  const isUp = n >= 0;
  return (
    <span
      className="flex items-center gap-1 mt-2 text-xs"
      style={{ color: isUp ? DS.colors.primary.blue : DS.colors.text.tertiary }}
    >
      {isUp ? <ArrowUp size={14} strokeWidth={LUCIDE_STROKE} /> : <ArrowDown size={14} strokeWidth={LUCIDE_STROKE} />}
      {Math.abs(n)}% vs prior period
    </span>
  );
}

export default function AnalyticsPage() {
  const [activeTab, setActiveTab] = useState('overview');
  const [analytics, setAnalytics] = useState<AnalyticsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dateRange, setDateRange] = useState('30d');
  const [sortProjects, setSortProjects] = useState('views_period');

  const loadAnalytics = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await apiFetch(
        `/api/analytics?range=${encodeURIComponent(dateRange)}&sortProjects=${encodeURIComponent(sortProjects)}`
      );
      setAnalytics(data as AnalyticsResponse);
    } catch (e) {
      setAnalytics(null);
      setError(e instanceof Error ? e.message : 'Failed to load analytics');
    } finally {
      setLoading(false);
    }
  }, [dateRange, sortProjects]);

  useEffect(() => {
    loadAnalytics();
  }, [loadAnalytics]);

  const ov = analytics?.overview;

  const trendMerged = useMemo(() => {
    if (!analytics?.trends) return [];
    const dm = new Map(analytics.trends.downloads.map((d) => [d.date, d.download_count]));
    const vm = new Map(analytics.trends.views.map((v) => [v.date, v.view_count]));
    const dates = new Set([...dm.keys(), ...vm.keys()]);
    return Array.from(dates)
      .sort()
      .map((date) => ({
        date,
        downloads: dm.get(date) || 0,
        views: vm.get(date) || 0,
      }));
  }, [analytics]);

  const periodDays = analytics?.period ?? 30;

  const tickFormatter = (v: string) => {
    if (!v) return '';
    const d = new Date(`${v}T12:00:00Z`);
    if (periodDays <= 14) {
      return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
    }
    if (periodDays <= 90) {
      return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
    }
    return d.toLocaleDateString(undefined, { month: 'short', year: '2-digit' });
  };

  const formatCurrency = (n: number) =>
    new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(n);
  const formatNumber = (n: number) => new Intl.NumberFormat('en-US').format(n);

  if (loading && !analytics) {
    return (
      <ThreePanelLayout
        leftPanel={<GlobalNavSidebar />}
        centerPanel={
          <CenterPanel>
            <PanelHeader title="Analytics" />
            <PanelContent>
              <div className="flex items-center justify-center py-12">
                <div
                  className="w-8 h-8 border-2 rounded-full animate-spin"
                  style={{ borderColor: DS.colors.primary.blue, borderTopColor: 'transparent' }}
                />
              </div>
            </PanelContent>
          </CenterPanel>
        }
      />
    );
  }

  return (
    <SubscriptionGate
      feature="analytics"
      requiredTier="creator"
      showUpgradeModal={true}
      message="Analytics dashboard requires Creator subscription or higher"
    >
      <ThreePanelLayout
          leftPanel={<GlobalNavSidebar />}
          centerPanel={
            <CenterPanel>
              <PanelHeader
                title="Analytics Dashboard"
                actions={
                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={() => loadAnalytics()}
                      disabled={loading}
                      className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-sm"
                      style={{
                        backgroundColor: DS.colors.background.card,
                        border: `1px solid ${DS.colors.border.default}`,
                        color: DS.colors.text.secondary,
                        opacity: loading ? 0.6 : 1,
                      }}
                    >
                      <RefreshCw size={14} strokeWidth={LUCIDE_STROKE} className={loading ? 'animate-spin' : ''} />
                      Refresh
                    </button>
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
                      <option value="180d">Last 180 days</option>
                      <option value="1y">Last year</option>
                    </select>
                  </div>
                }
              />
              <PanelContent>
                <div className="px-4 sm:px-6 lg:px-8 pt-6 sm:pt-8 pb-6 sm:pb-8 space-y-6 max-w-7xl mx-auto">
                  {error && (
                    <div
                      className="flex items-center gap-2 px-4 py-3 rounded-lg text-sm"
                      style={{
                        backgroundColor: 'rgba(239,68,68,0.12)',
                        color: DS.colors.accent.error,
                        border: `1px solid rgba(239,68,68,0.35)`,
                      }}
                    >
                      <AlertCircle size={18} strokeWidth={LUCIDE_STROKE} />
                      {error}
                    </div>
                  )}

                  {analytics && (
                    <p className="text-xs" style={{ color: DS.colors.text.tertiary }}>
                      Metrics for the selected window (
                      {new Date(analytics.periodStart).toLocaleDateString()} –{' '}
                      {new Date(analytics.periodEnd).toLocaleDateString()}). Daily view charts use recorded
                      events; legacy traffic may only appear in lifetime totals.
                    </p>
                  )}

                  {/* Overview Stats */}
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    <Card padding="lg">
                      <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-4">
                        <div className="min-w-0">
                          <p className="text-sm" style={{ color: DS.colors.text.secondary }}>
                            Views ({periodDays}d)
                          </p>
                          <p className="text-2xl font-bold mt-1" style={{ color: DS.colors.text.primary }}>
                            {formatNumber(ov?.totalViews ?? 0)}
                          </p>
                          <p className="text-xs mt-0.5" style={{ color: DS.colors.text.tertiary }}>
                            Lifetime: {formatNumber(ov?.totalViewsLifetime ?? 0)}
                          </p>
                          <DeltaPill value={ov?.viewsChange ?? '0'} />
                        </div>
                        <StatKpiIcon icon={Eye} />
                      </div>
                    </Card>

                    <Card padding="lg">
                      <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-4">
                        <div className="min-w-0">
                          <p className="text-sm" style={{ color: DS.colors.text.secondary }}>
                            Downloads ({periodDays}d)
                          </p>
                          <p className="text-2xl font-bold mt-1" style={{ color: DS.colors.text.primary }}>
                            {formatNumber(ov?.totalDownloads ?? 0)}
                          </p>
                          <DeltaPill value={ov?.downloadsChange ?? '0'} />
                        </div>
                        <StatKpiIcon icon={Download} className={DOWNLOAD_KPI_TILE_CLASS} />
                      </div>
                    </Card>

                    <Card padding="lg">
                      <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-4">
                        <div className="min-w-0">
                          <p className="text-sm" style={{ color: DS.colors.text.secondary }}>
                            Revenue ({periodDays}d)
                          </p>
                          <p className="text-2xl font-bold mt-1" style={{ color: DS.colors.text.primary }}>
                            {formatCurrency(ov?.totalRevenue ?? 0)}
                          </p>
                          <DeltaPill value={ov?.revenueChange ?? '0'} />
                        </div>
                        <StatKpiIcon icon={DollarSign} />
                      </div>
                    </Card>

                    <Card padding="lg">
                      <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-4">
                        <div className="min-w-0">
                          <p className="text-sm" style={{ color: DS.colors.text.secondary }}>
                            Stars (all-time)
                          </p>
                          <p className="text-2xl font-bold mt-1" style={{ color: DS.colors.text.primary }}>
                            {formatNumber(ov?.totalStars ?? 0)}
                          </p>
                          <DeltaPill value={ov?.starsChange ?? '0'} />
                        </div>
                        <StatKpiIcon icon={Star} />
                      </div>
                    </Card>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <Card padding="md">
                      <p className="text-sm" style={{ color: DS.colors.text.secondary }}>
                        Orders ({periodDays}d)
                      </p>
                      <p className="text-xl font-bold mt-1" style={{ color: DS.colors.text.primary }}>
                        {formatNumber(analytics?.totalOrders ?? 0)}
                      </p>
                    </Card>
                    <Card padding="md">
                      <p className="text-sm" style={{ color: DS.colors.text.secondary }}>
                        Conversion (orders / views)
                      </p>
                      <p className="text-xl font-bold mt-1" style={{ color: DS.colors.text.primary }}>
                        {(analytics?.conversionRate ?? 0).toFixed(2)}%
                      </p>
                    </Card>
                    <Card padding="md">
                      <p className="text-sm" style={{ color: DS.colors.text.secondary }}>
                        Projects
                      </p>
                      <p className="text-xl font-bold mt-1" style={{ color: DS.colors.text.primary }}>
                        {formatNumber(analytics?.totalProjects ?? 0)}
                      </p>
                    </Card>
                  </div>

                  <Tabs
                    tabs={[
                      {
                        id: 'overview',
                        label: 'Overview',
                        icon: (
                          <span className="inline-flex items-center justify-center" aria-hidden>
                            <BarChart3 size={18} strokeWidth={LUCIDE_STROKE} />
                          </span>
                        ),
                      },
                      {
                        id: 'projects',
                        label: 'Projects',
                        icon: (
                          <span className="inline-flex items-center justify-center" aria-hidden>
                            <FolderKanban size={18} strokeWidth={LUCIDE_STROKE} />
                          </span>
                        ),
                      },
                      {
                        id: 'sales',
                        label: 'Sales',
                        icon: (
                          <span className="inline-flex items-center justify-center" aria-hidden>
                            <DollarSign size={18} strokeWidth={LUCIDE_STROKE} />
                          </span>
                        ),
                      },
                      {
                        id: 'audience',
                        label: 'Audience',
                        icon: (
                          <span className="inline-flex items-center justify-center" aria-hidden>
                            <Users size={18} strokeWidth={LUCIDE_STROKE} />
                          </span>
                        ),
                      },
                    ]}
                    activeTab={activeTab}
                    onTabChange={setActiveTab}
                  />

                  {activeTab === 'overview' && analytics && (
                    <div className="space-y-6">
                      <Card padding="lg">
                        <h3 className="text-lg font-semibold mb-4" style={{ color: DS.colors.text.primary }}>
                          Views & downloads per day
                        </h3>
                        {trendMerged.length === 0 ||
                        trendMerged.every((r) => r.views === 0 && r.downloads === 0) ? (
                          <div
                            className="h-64 flex items-center justify-center rounded-lg"
                            style={{ backgroundColor: DS.colors.background.elevated }}
                          >
                            <p style={{ color: DS.colors.text.secondary }}>No activity in this range</p>
                          </div>
                        ) : (
                          <ResponsiveContainer width="100%" height={320}>
                            <ComposedChart data={trendMerged}>
                              <CartesianGrid strokeDasharray="3 3" stroke={DS.colors.border.default} />
                              <XAxis dataKey="date" tickFormatter={tickFormatter} stroke={DS.colors.text.secondary} />
                              <YAxis yAxisId="left" stroke={DS.colors.text.secondary} />
                              <YAxis yAxisId="right" orientation="right" stroke={DS.colors.text.secondary} />
                              <Tooltip
                                contentStyle={{
                                  backgroundColor: DS.colors.background.card,
                                  border: `1px solid ${DS.colors.border.default}`,
                                  color: DS.colors.text.primary,
                                }}
                                labelFormatter={(l) => String(l)}
                              />
                              <Legend />
                              <Bar
                                yAxisId="right"
                                dataKey="downloads"
                                name="Downloads"
                                fill={DS.colors.text.secondary}
                                radius={[4, 4, 0, 0]}
                              />
                              <Line
                                yAxisId="left"
                                type="monotone"
                                dataKey="views"
                                name="Views"
                                stroke={DS.colors.primary.blue}
                                strokeWidth={2}
                                dot={false}
                              />
                            </ComposedChart>
                          </ResponsiveContainer>
                        )}
                      </Card>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <Card padding="lg">
                          <h3 className="text-lg font-semibold mb-4" style={{ color: DS.colors.text.primary }}>
                            Top projects (lifetime views)
                          </h3>
                          <div className="space-y-3">
                            {analytics.topProjects?.length ? (
                              analytics.topProjects.slice(0, 8).map((project, idx) => (
                                <Link
                                  key={project.id}
                                  href={`/project/${project.id}`}
                                  className="flex items-center justify-between py-2 border-b last:border-0 transition-opacity hover:opacity-90"
                                  style={{ borderColor: DS.colors.border.default }}
                                >
                                  <div className="flex-1 min-w-0 pr-2">
                                    <p className="text-sm font-medium truncate" style={{ color: DS.colors.text.primary }}>
                                      {project.title}
                                    </p>
                                    <p className="text-xs" style={{ color: DS.colors.text.secondary }}>
                                      {formatNumber(project.views)} lifetime views
                                    </p>
                                  </div>
                                  <Badge variant="secondary">{idx + 1}</Badge>
                                </Link>
                              ))
                            ) : (
                              <p className="text-sm" style={{ color: DS.colors.text.secondary }}>
                                No projects yet
                              </p>
                            )}
                          </div>
                        </Card>

                        <Card padding="lg">
                          <h3 className="text-lg font-semibold mb-4" style={{ color: DS.colors.text.primary }}>
                            Recent activity
                          </h3>
                          <div className="space-y-3">
                            {analytics.recentActivity?.length ? (
                              analytics.recentActivity.slice(0, 10).map((activity, idx) => (
                                <div key={idx} className="flex items-center gap-3 py-2">
                                  <div className="p-2 rounded" style={{ backgroundColor: DS.colors.background.elevated }}>
                                    {activity.type === 'sale' ? (
                                      <ShoppingCart size={16} strokeWidth={LUCIDE_STROKE} style={{ color: DS.colors.primary.blue }} />
                                    ) : (
                                      <Eye size={16} strokeWidth={LUCIDE_STROKE} style={{ color: DS.colors.text.secondary }} />
                                    )}
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <p className="text-sm truncate" style={{ color: DS.colors.text.primary }}>
                                      {activity.description}
                                    </p>
                                    <p className="text-xs" style={{ color: DS.colors.text.tertiary }}>
                                      {new Date(activity.timestamp).toLocaleString()}
                                    </p>
                                  </div>
                                </div>
                              ))
                            ) : (
                              <p className="text-sm" style={{ color: DS.colors.text.secondary }}>
                                No recent activity in this range
                              </p>
                            )}
                          </div>
                        </Card>
                      </div>
                    </div>
                  )}

                  {activeTab === 'projects' && analytics && (
                    <Card padding="lg">
                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4">
                        <h3 className="text-lg font-semibold" style={{ color: DS.colors.text.primary }}>
                          Project performance
                        </h3>
                        <label className="flex items-center gap-2 text-sm" style={{ color: DS.colors.text.secondary }}>
                          Sort by
                          <select
                            value={sortProjects}
                            onChange={(e) => setSortProjects(e.target.value)}
                            className="px-2 py-1 rounded-lg text-sm"
                            style={{
                              backgroundColor: DS.colors.background.card,
                              border: `1px solid ${DS.colors.border.default}`,
                              color: DS.colors.text.primary,
                            }}
                          >
                            <option value="views_period">Views (period)</option>
                            <option value="views_lifetime">Views (lifetime)</option>
                            <option value="downloads">Downloads</option>
                            <option value="revenue">Revenue</option>
                            <option value="stars">Stars</option>
                            <option value="title">Title</option>
                          </select>
                        </label>
                      </div>
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm text-left min-w-[640px]">
                          <thead>
                            <tr style={{ color: DS.colors.text.secondary }}>
                              <th className="pb-2 pr-4 font-medium">Project</th>
                              <th className="pb-2 pr-4 font-medium">Views (period)</th>
                              <th className="pb-2 pr-4 font-medium">Views (life)</th>
                              <th className="pb-2 pr-4 font-medium">Downloads</th>
                              <th className="pb-2 pr-4 font-medium">Stars</th>
                              <th className="pb-2 pr-4 font-medium">Revenue</th>
                              <th className="pb-2 font-medium">Status</th>
                            </tr>
                          </thead>
                          <tbody>
                            {(() => {
                              const perf =
                                analytics.projectsPerformance?.length ?
                                  analytics.projectsPerformance
                                : analytics.projects ?? [];
                              if (!perf.length) {
                                return (
                                  <tr>
                                    <td
                                      colSpan={7}
                                      className="py-8 text-center"
                                      style={{ color: DS.colors.text.secondary }}
                                    >
                                      No project data
                                    </td>
                                  </tr>
                                );
                              }
                              return perf.map((row) => (
                                <tr key={row.id} style={{ borderTop: `1px solid ${DS.colors.border.subtle}` }}>
                                  <td className="py-2 pr-4">
                                    <Link
                                      href={`/project/${row.id}`}
                                      className="font-medium hover:underline"
                                      style={{ color: DS.colors.text.primary }}
                                    >
                                      {row.title}
                                    </Link>
                                  </td>
                                  <td className="py-2 pr-4">{formatNumber(row.views)}</td>
                                  <td className="py-2 pr-4">{formatNumber(row.viewsLifetime)}</td>
                                  <td className="py-2 pr-4">{formatNumber(row.downloads)}</td>
                                  <td className="py-2 pr-4">{formatNumber(row.stars)}</td>
                                  <td className="py-2 pr-4">{formatCurrency(row.revenue)}</td>
                                  <td className="py-2">
                                    <Badge variant="secondary">{row.status}</Badge>
                                  </td>
                                </tr>
                              ));
                            })()}
                          </tbody>
                        </table>
                      </div>
                    </Card>
                  )}

                  {activeTab === 'sales' && analytics && (
                    <div className="space-y-6">
                      <Card padding="lg">
                        <h3 className="text-lg font-semibold mb-4" style={{ color: DS.colors.text.primary }}>
                          Sales summary
                        </h3>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                          <div className="p-4 rounded-lg" style={{ backgroundColor: DS.colors.background.elevated }}>
                            <p className="text-sm" style={{ color: DS.colors.text.secondary }}>
                              Orders
                            </p>
                            <p className="text-2xl font-bold mt-1" style={{ color: DS.colors.text.primary }}>
                              {formatNumber(analytics.sales?.totalSales ?? 0)}
                            </p>
                          </div>
                          <div className="p-4 rounded-lg" style={{ backgroundColor: DS.colors.background.elevated }}>
                            <p className="text-sm" style={{ color: DS.colors.text.secondary }}>
                              Revenue
                            </p>
                            <p className="text-2xl font-bold mt-1" style={{ color: DS.colors.text.primary }}>
                              {formatCurrency(analytics.sales?.totalRevenue ?? 0)}
                            </p>
                          </div>
                          <div className="p-4 rounded-lg" style={{ backgroundColor: DS.colors.background.elevated }}>
                            <p className="text-sm" style={{ color: DS.colors.text.secondary }}>
                              Avg. order
                            </p>
                            <p className="text-2xl font-bold mt-1" style={{ color: DS.colors.text.primary }}>
                              {formatCurrency(analytics.sales?.averageOrder ?? 0)}
                            </p>
                          </div>
                        </div>
                      </Card>

                      <Card padding="lg">
                        <h3 className="text-lg font-semibold mb-4" style={{ color: DS.colors.text.primary }}>
                          Revenue per day
                        </h3>
                        {!analytics.trends?.revenue?.length ||
                        analytics.trends.revenue.every((r) => r.revenue === 0) ? (
                          <div
                            className="h-64 flex items-center justify-center rounded-lg"
                            style={{ backgroundColor: DS.colors.background.elevated }}
                          >
                            <p style={{ color: DS.colors.text.secondary }}>No sales in this range</p>
                          </div>
                        ) : (
                          <ResponsiveContainer width="100%" height={300}>
                            <AreaChart
                              data={analytics.trends.revenue}
                              margin={{ top: 8, right: 8, left: 0, bottom: 0 }}
                            >
                              <defs>
                                <linearGradient id="revFillAnalytics" x1="0" y1="0" x2="0" y2="1">
                                  <stop offset="0%" stopColor={DS.colors.primary.blue} stopOpacity={0.35} />
                                  <stop offset="100%" stopColor={DS.colors.primary.blue} stopOpacity={0} />
                                </linearGradient>
                              </defs>
                              <CartesianGrid strokeDasharray="3 3" stroke={DS.colors.border.default} />
                              <XAxis dataKey="date" tickFormatter={tickFormatter} stroke={DS.colors.text.secondary} />
                              <YAxis stroke={DS.colors.text.secondary} />
                              <Tooltip
                                contentStyle={{
                                  backgroundColor: DS.colors.background.card,
                                  border: `1px solid ${DS.colors.border.default}`,
                                  color: DS.colors.text.primary,
                                }}
                                formatter={(value: number) => formatCurrency(value)}
                              />
                              <Area
                                type="monotone"
                                dataKey="revenue"
                                name="Revenue"
                                stroke={DS.colors.primary.blue}
                                fill="url(#revFillAnalytics)"
                                strokeWidth={2}
                              />
                            </AreaChart>
                          </ResponsiveContainer>
                        )}
                      </Card>

                      <Card padding="lg">
                        <h3 className="text-lg font-semibold mb-4" style={{ color: DS.colors.text.primary }}>
                          Revenue by month (12 mo)
                        </h3>
                        {!analytics.revenueByMonth?.length ||
                        analytics.revenueByMonth.every((m) => m.revenue === 0) ? (
                          <p className="text-sm py-8 text-center" style={{ color: DS.colors.text.secondary }}>
                            No revenue in the last 12 months
                          </p>
                        ) : (
                          <ResponsiveContainer width="100%" height={280}>
                            <BarChart data={analytics.revenueByMonth}>
                              <CartesianGrid strokeDasharray="3 3" stroke={DS.colors.border.default} />
                              <XAxis dataKey="month" stroke={DS.colors.text.secondary} />
                              <YAxis stroke={DS.colors.text.secondary} />
                              <Tooltip
                                contentStyle={{
                                  backgroundColor: DS.colors.background.card,
                                  border: `1px solid ${DS.colors.border.default}`,
                                  color: DS.colors.text.primary,
                                }}
                                formatter={(value: number) => formatCurrency(Number(value))}
                              />
                              <Bar dataKey="revenue" fill={DS.colors.primary.blue} radius={[4, 4, 0, 0]} />
                            </BarChart>
                          </ResponsiveContainer>
                        )}
                      </Card>

                      <Card padding="lg">
                        <h3 className="text-lg font-semibold mb-4" style={{ color: DS.colors.text.primary }}>
                          Top sellers (period)
                        </h3>
                        <div className="space-y-3">
                          {analytics.topSellingItems?.length ? (
                            analytics.topSellingItems.slice(0, 10).map((item) => (
                              <Link
                                key={item.id}
                                href={`/project/${item.id}`}
                                className="flex items-center justify-between py-2 border-b last:border-0"
                                style={{ borderColor: DS.colors.border.default }}
                              >
                                <span className="font-medium truncate pr-2" style={{ color: DS.colors.text.primary }}>
                                  {item.title}
                                </span>
                                <span className="text-sm shrink-0" style={{ color: DS.colors.text.secondary }}>
                                  {formatCurrency(item.revenue)} · {formatNumber(item.download_count)} dl
                                </span>
                              </Link>
                            ))
                          ) : (
                            <p className="text-sm" style={{ color: DS.colors.text.secondary }}>
                              No sales in this period
                            </p>
                          )}
                        </div>
                      </Card>
                    </div>
                  )}

                  {activeTab === 'audience' && analytics && (
                    <div className="space-y-6">
                      <Card padding="lg">
                        <h3 className="text-lg font-semibold mb-4" style={{ color: DS.colors.text.primary }}>
                          Audience
                        </h3>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <div className="p-4 rounded-lg" style={{ backgroundColor: DS.colors.background.elevated }}>
                            <p className="text-sm" style={{ color: DS.colors.text.secondary }}>
                              Total followers
                            </p>
                            <p className="text-2xl font-bold mt-1" style={{ color: DS.colors.text.primary }}>
                              {formatNumber(analytics.audience?.totalFollowers ?? 0)}
                            </p>
                          </div>
                          <div className="p-4 rounded-lg" style={{ backgroundColor: DS.colors.background.elevated }}>
                            <p className="text-sm" style={{ color: DS.colors.text.secondary }}>
                              New followers ({periodDays}d)
                            </p>
                            <p className="text-2xl font-bold mt-1" style={{ color: DS.colors.text.primary }}>
                              {formatNumber(analytics.audience?.newFollowers ?? 0)}
                            </p>
                          </div>
                        </div>
                        <p className="text-xs mt-4" style={{ color: DS.colors.text.tertiary }}>
                          Follower counts depend on the follows table in your database. If metrics stay at zero,
                          confirm migrations and that users follow your profile.
                        </p>
                      </Card>
                    </div>
                  )}
                </div>
              </PanelContent>
            </CenterPanel>
          }
      />
    </SubscriptionGate>
  );
}
