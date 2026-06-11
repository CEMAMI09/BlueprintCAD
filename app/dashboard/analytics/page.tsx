'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { apiFetch } from '@/lib/apiClient';
import {
  ThreePanelLayout,
  CenterPanel,
  PanelHeader,
  PanelContent,
} from '@/components/ui/ThreePanelLayout';
import { GlobalNavSidebar } from '@/components/ui/GlobalNavSidebar';
import { Card } from '@/components/ui/UIComponents';
import { DesignSystem as DS } from '@/backend/lib/ui/design-system';
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
} from 'recharts';
import {
  DollarSign,
  Download,
  Eye,
  TrendingUp,
  FileText,
  Calendar,
  Package,
  RefreshCw,
  AlertCircle,
} from 'lucide-react';
import { StatKpiIcon, DOWNLOAD_KPI_TILE_CLASS, LUCIDE_STROKE } from '@/components/ui/StatKpiIcon';

interface ProjectPerformanceRow {
  id: number;
  title: string;
  views: number;
  viewsLifetime: number;
  downloads: number;
  stars: number;
  revenue: number;
  for_sale: boolean;
  created_at?: string;
  status: string;
}

interface AnalyticsPayload {
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
  revenueByMonth: Array<{ month: string; revenue: number; order_count: number }>;
  downloadsByFile: Array<{ id: number; title: string; download_count: number; revenue: number }>;
  viewsByFile: Array<{ id: number; title: string; view_count: number; total_views: number }>;
  projectsPerformance: ProjectPerformanceRow[];
  topSellingItems: Array<{
    id: number;
    title: string;
    thumbnail_path: string;
    download_count: number;
    revenue: number;
    price: number;
  }>;
  trends: {
    revenue: Array<{ date: string; revenue: number; order_count: number }>;
    downloads: Array<{ date: string; download_count: number }>;
    views: Array<{ date: string; view_count: number }>;
  };
}

export default function SellerAnalyticsPage() {
  const [period, setPeriod] = useState('30');
  const [sortProjects, setSortProjects] = useState('views_period');
  const [sortFiles, setSortFiles] = useState('views_period');
  const [data, setData] = useState<AnalyticsPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const d = await apiFetch(
        `/api/analytics/seller?period=${encodeURIComponent(period)}&sortProjects=${encodeURIComponent(sortProjects)}&sortFiles=${encodeURIComponent(sortFiles)}`
      );
      setData(d);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to load analytics');
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [period, sortProjects, sortFiles]);

  useEffect(() => {
    load();
  }, [load]);

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount);

  const formatNumber = (num: number) => new Intl.NumberFormat('en-US').format(num);

  const trendMerged = useMemo(() => {
    if (!data?.trends) return [];
    const dm = new Map(data.trends.downloads.map((d) => [d.date, d.download_count]));
    const vm = new Map(data.trends.views.map((v) => [v.date, v.view_count]));
    const dates = new Set([...dm.keys(), ...vm.keys()]);
    return Array.from(dates)
      .sort()
      .map((date) => ({
        date,
        downloads: dm.get(date) || 0,
        views: vm.get(date) || 0,
      }));
  }, [data]);

  const tickFormatter = (v: string) => {
    if (!v) return '';
    const d = new Date(v + 'T12:00:00Z');
    if (Number(period) <= 14) {
      return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
    }
    if (Number(period) <= 90) {
      return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
    }
    return d.toLocaleDateString(undefined, { month: 'short', year: '2-digit' });
  };

  return (
    <ThreePanelLayout
      leftPanel={<GlobalNavSidebar />}
      centerPanel={
        <CenterPanel>
          <PanelHeader
            title="Seller Analytics"
            actions={
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => load()}
                  disabled={loading}
                  className="inline-flex items-center gap-1 px-2 py-1 text-sm rounded border"
                  style={{
                    borderColor: DS.colors.border.default,
                    color: DS.colors.text.secondary,
                    opacity: loading ? 0.6 : 1,
                  }}
                >
                  <RefreshCw size={14} strokeWidth={LUCIDE_STROKE} className={loading ? 'animate-spin' : ''} />
                  Refresh
                </button>
                <select
                  value={period}
                  onChange={(e) => setPeriod(e.target.value)}
                  className="px-3 py-1 text-sm rounded"
                  style={{
                    backgroundColor: DS.colors.background.panel,
                    border: `1px solid ${DS.colors.border.default}`,
                    color: DS.colors.text.primary,
                  }}
                >
                  <option value="7">Last 7 days</option>
                  <option value="14">Last 14 days</option>
                  <option value="30">Last 30 days</option>
                  <option value="90">Last 90 days</option>
                  <option value="180">Last 180 days</option>
                  <option value="365">Last year</option>
                </select>
              </div>
            }
          />
          <PanelContent>
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 sm:pt-8 pb-6 sm:pb-8 space-y-6">
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

              {loading && !data ? (
                <div className="flex justify-center py-24">
                  <div
                    className="w-10 h-10 border-2 rounded-full animate-spin"
                    style={{ borderColor: DS.colors.primary.blue, borderTopColor: 'transparent' }}
                  />
                </div>
              ) : data ? (
                <>
                  <p className="text-xs" style={{ color: DS.colors.text.tertiary }}>
                    Showing metrics for the selected window. View charts use recorded page views; legacy
                    traffic before tracking may only appear in all-time totals.
                  </p>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    <Card padding="md" hover>
                      <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-4">
                        <div className="min-w-0">
                          <p className="text-sm" style={{ color: DS.colors.text.secondary }}>
                            Revenue ({data.period}d)
                          </p>
                          <p className="text-2xl font-bold mt-1" style={{ color: DS.colors.text.primary }}>
                            {data.totalRevenue > 0 ? formatCurrency(data.totalRevenue) : '$0.00'}
                          </p>
                          {data.totalRevenue === 0 && (
                            <p className="text-xs mt-1" style={{ color: DS.colors.text.tertiary }}>
                              No sales in this range
                            </p>
                          )}
                        </div>
                        <StatKpiIcon icon={DollarSign} />
                      </div>
                    </Card>

                    <Card padding="md" hover>
                      <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-4">
                        <div className="min-w-0">
                          <p className="text-sm" style={{ color: DS.colors.text.secondary }}>
                            Downloads ({data.period}d)
                          </p>
                          <p className="text-2xl font-bold mt-1" style={{ color: DS.colors.text.primary }}>
                            {formatNumber(data.totalDownloads)}
                          </p>
                        </div>
                        <StatKpiIcon icon={Download} className={DOWNLOAD_KPI_TILE_CLASS} />
                      </div>
                    </Card>

                    <Card padding="md" hover>
                      <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-4">
                        <div className="min-w-0">
                          <p className="text-sm" style={{ color: DS.colors.text.secondary }}>
                            Views ({data.period}d)
                          </p>
                          <p className="text-2xl font-bold mt-1" style={{ color: DS.colors.text.primary }}>
                            {formatNumber(data.totalViews)}
                          </p>
                          <p className="text-xs mt-1" style={{ color: DS.colors.text.tertiary }}>
                            All-time: {formatNumber(data.totalViewsLifetime)}
                          </p>
                        </div>
                        <StatKpiIcon icon={Eye} />
                      </div>
                    </Card>

                    <Card padding="md" hover>
                      <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-4">
                        <div className="min-w-0">
                          <p className="text-sm" style={{ color: DS.colors.text.secondary }}>
                            Conversion (sales / views)
                          </p>
                          <p className="text-2xl font-bold mt-1" style={{ color: DS.colors.text.primary }}>
                            {data.conversionRate ? data.conversionRate.toFixed(2) : '0.00'}%
                          </p>
                          <p className="text-xs mt-1" style={{ color: DS.colors.text.tertiary }}>
                            {formatNumber(data.totalOrders)} orders · {formatNumber(data.totalProjects)}{' '}
                            projects
                          </p>
                        </div>
                        <StatKpiIcon icon={TrendingUp} />
                      </div>
                    </Card>
                  </div>

                  <Card padding="md">
                    <h3
                      className="text-lg font-semibold mb-4 flex items-center gap-2"
                      style={{ color: DS.colors.text.primary }}
                    >
                      <Calendar size={20} strokeWidth={LUCIDE_STROKE} />
                      Revenue by Month (last 12 months)
                    </h3>
                    {data.revenueByMonth.length === 0 ||
                    data.revenueByMonth.every((m) => m.revenue === 0) ? (
                      <div className="text-center py-12">
                        <DollarSign
                          size={48}
                          strokeWidth={LUCIDE_STROKE}
                          className="mx-auto mb-3 block"
                          style={{ color: DS.colors.text.tertiary, opacity: 0.5 }}
                        />
                        <p className="text-sm font-medium" style={{ color: DS.colors.text.secondary }}>
                          No revenue in the last 12 months
                        </p>
                      </div>
                    ) : (
                      <ResponsiveContainer width="100%" height={300}>
                        <BarChart data={data.revenueByMonth}>
                          <CartesianGrid strokeDasharray="3 3" stroke={DS.colors.border.default} />
                          <XAxis dataKey="month" stroke={DS.colors.text.secondary} />
                          <YAxis stroke={DS.colors.text.secondary} />
                          <Tooltip
                            contentStyle={{
                              backgroundColor: DS.colors.background.card,
                              border: `1px solid ${DS.colors.border.default}`,
                              color: DS.colors.text.primary,
                            }}
                            formatter={(value: number) => formatCurrency(value)}
                          />
                          <Legend />
                          <Bar dataKey="revenue" fill={DS.colors.primary.blue} name="Revenue" />
                        </BarChart>
                      </ResponsiveContainer>
                    )}
                  </Card>

                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <Card padding="md">
                      <h3 className="text-lg font-semibold mb-4" style={{ color: DS.colors.text.primary }}>
                        Revenue trend
                      </h3>
                      {data.trends.revenue.length === 0 ||
                      data.trends.revenue.every((t) => t.revenue === 0) ? (
                        <div className="text-center py-12">
                          <p className="text-sm" style={{ color: DS.colors.text.secondary }}>
                            No revenue in this range
                          </p>
                        </div>
                      ) : (
                        <ResponsiveContainer width="100%" height={250}>
                          <LineChart data={data.trends.revenue}>
                            <CartesianGrid strokeDasharray="3 3" stroke={DS.colors.border.default} />
                            <XAxis
                              dataKey="date"
                              stroke={DS.colors.text.secondary}
                              tickFormatter={tickFormatter}
                              interval="preserveStartEnd"
                              minTickGap={24}
                            />
                            <YAxis stroke={DS.colors.text.secondary} />
                            <Tooltip
                              contentStyle={{
                                backgroundColor: DS.colors.background.card,
                                border: `1px solid ${DS.colors.border.default}`,
                                color: DS.colors.text.primary,
                              }}
                              formatter={(value: number) => formatCurrency(value)}
                              labelFormatter={(l) => String(l)}
                            />
                            <Legend />
                            <Line
                              type="monotone"
                              dataKey="revenue"
                              stroke={DS.colors.primary.blue}
                              name="Revenue"
                              dot={false}
                              strokeWidth={2}
                            />
                          </LineChart>
                        </ResponsiveContainer>
                      )}
                    </Card>

                    <Card padding="md">
                      <h3 className="text-lg font-semibold mb-4" style={{ color: DS.colors.text.primary }}>
                        Downloads & views trend
                      </h3>
                      {trendMerged.length === 0 ||
                      (trendMerged.every((x) => x.downloads === 0) &&
                        trendMerged.every((x) => x.views === 0)) ? (
                        <div className="text-center py-12">
                          <p className="text-sm" style={{ color: DS.colors.text.secondary }}>
                            No downloads or tracked views in this range
                          </p>
                        </div>
                      ) : (
                        <ResponsiveContainer width="100%" height={250}>
                          <LineChart data={trendMerged}>
                            <CartesianGrid strokeDasharray="3 3" stroke={DS.colors.border.default} />
                            <XAxis
                              dataKey="date"
                              stroke={DS.colors.text.secondary}
                              tickFormatter={tickFormatter}
                              interval="preserveStartEnd"
                              minTickGap={24}
                            />
                            <YAxis stroke={DS.colors.text.secondary} />
                            <Tooltip
                              contentStyle={{
                                backgroundColor: DS.colors.background.card,
                                border: `1px solid ${DS.colors.border.default}`,
                                color: DS.colors.text.primary,
                              }}
                              labelFormatter={(l) => String(l)}
                            />
                            <Legend />
                            <Line
                              type="monotone"
                              dataKey="downloads"
                              stroke={DS.colors.text.secondary}
                              name="Downloads"
                              dot={false}
                              strokeWidth={2}
                            />
                            <Line
                              type="monotone"
                              dataKey="views"
                              stroke={DS.colors.primary.blue}
                              name="Views"
                              dot={false}
                              strokeWidth={2}
                            />
                          </LineChart>
                        </ResponsiveContainer>
                      )}
                    </Card>
                  </div>

                  <Card padding="md">
                    <h3
                      className="text-lg font-semibold mb-4 flex items-center gap-2"
                      style={{ color: DS.colors.text.primary }}
                    >
                      <FileText size={20} strokeWidth={LUCIDE_STROKE} />
                      Top selling (period)
                    </h3>
                    <div className="space-y-3">
                      {data.topSellingItems.length === 0 ? (
                        <div className="text-center py-12">
                          <Package
                            size={48}
                            strokeWidth={LUCIDE_STROKE}
                            className="mx-auto mb-3 block"
                            style={{ color: DS.colors.text.tertiary, opacity: 0.5 }}
                          />
                          <p className="text-sm font-medium" style={{ color: DS.colors.text.secondary }}>
                            No sales in this range
                          </p>
                        </div>
                      ) : (
                        data.topSellingItems.map((item, index) => (
                          <div
                            key={item.id}
                            className="flex items-center gap-4 p-3 rounded-lg"
                            style={{ backgroundColor: DS.colors.background.panel }}
                          >
                            <div className="flex items-center gap-3 flex-1 min-w-0">
                              <span className="text-sm font-semibold shrink-0" style={{ color: DS.colors.text.secondary }}>
                                #{index + 1}
                              </span>
                              {item.thumbnail_path ? (
                                <img
                                  src={`${process.env.NEXT_PUBLIC_API_URL}/api/thumbnails/${encodeURIComponent(item.thumbnail_path)}`}
                                  alt={item.title}
                                  className="w-12 h-12 rounded object-cover shrink-0"
                                  onError={(e) => {
                                    e.currentTarget.style.display = 'none';
                                  }}
                                />
                              ) : (
                                <div
                                  className="w-12 h-12 rounded flex items-center justify-center shrink-0"
                                  style={{ backgroundColor: DS.colors.background.elevated }}
                                >
                                  <Package size={20} strokeWidth={LUCIDE_STROKE} style={{ color: DS.colors.text.tertiary }} />
                                </div>
                              )}
                              <div className="flex-1 min-w-0">
                                <p className="font-medium truncate" style={{ color: DS.colors.text.primary }}>
                                  {item.title}
                                </p>
                                <p className="text-sm" style={{ color: DS.colors.text.secondary }}>
                                  {item.download_count} downloads
                                </p>
                              </div>
                            </div>
                            <div className="text-right shrink-0">
                              <p className="font-semibold" style={{ color: DS.colors.text.primary }}>
                                {formatCurrency(item.revenue)}
                              </p>
                              {item.price > 0 && (
                                <p className="text-sm" style={{ color: DS.colors.text.secondary }}>
                                  {formatCurrency(item.price)} list
                                </p>
                              )}
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </Card>

                  <Card padding="md">
                    <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
                      <h3 className="text-lg font-semibold" style={{ color: DS.colors.text.primary }}>
                        Downloads by file
                      </h3>
                      <span className="text-xs" style={{ color: DS.colors.text.tertiary }}>
                        Sorted by downloads in range (server)
                      </span>
                    </div>
                    <div className="space-y-2">
                      {data.downloadsByFile.length === 0 ? (
                        <div className="text-center py-12">
                          <p className="text-sm" style={{ color: DS.colors.text.secondary }}>
                            No downloads in this range
                          </p>
                        </div>
                      ) : (
                        data.downloadsByFile.slice(0, 15).map((file) => (
                          <div
                            key={file.id}
                            className="flex items-center justify-between p-3 rounded-lg"
                            style={{ backgroundColor: DS.colors.background.panel }}
                          >
                            <p className="font-medium truncate flex-1 pr-2" style={{ color: DS.colors.text.primary }}>
                              {file.title}
                            </p>
                            <div className="flex items-center gap-4 shrink-0">
                              <span className="text-sm" style={{ color: DS.colors.text.secondary }}>
                                {formatNumber(file.download_count)} downloads
                              </span>
                              {file.revenue > 0 && (
                                <span className="text-sm font-semibold" style={{ color: DS.colors.primary.blue }}>
                                  {formatCurrency(file.revenue)}
                                </span>
                              )}
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </Card>

                  <Card padding="md">
                    <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
                      <h3 className="text-lg font-semibold" style={{ color: DS.colors.text.primary }}>
                        Views by file
                      </h3>
                      <select
                        value={sortFiles}
                        onChange={(e) => setSortFiles(e.target.value)}
                        className="text-sm px-2 py-1 rounded"
                        style={{
                          backgroundColor: DS.colors.background.panel,
                          border: `1px solid ${DS.colors.border.default}`,
                          color: DS.colors.text.primary,
                        }}
                      >
                        <option value="views_period">Views (this period)</option>
                        <option value="views_lifetime">Views (all-time)</option>
                        <option value="title">Title A–Z</option>
                      </select>
                    </div>
                    <div className="space-y-2">
                      {data.viewsByFile.length === 0 ||
                      data.viewsByFile.every((f) => (f.view_count || 0) === 0 && (f.total_views || 0) === 0) ? (
                        <div className="text-center py-12">
                          <Eye
                            size={48}
                            strokeWidth={LUCIDE_STROKE}
                            className="mx-auto mb-3 block"
                            style={{ color: DS.colors.text.tertiary, opacity: 0.5 }}
                          />
                          <p className="text-sm font-medium" style={{ color: DS.colors.text.secondary }}>
                            No view data for this range
                          </p>
                          <p className="text-xs mt-1" style={{ color: DS.colors.text.tertiary }}>
                            Open project pages while logged out or as visitors to build the timeline
                          </p>
                        </div>
                      ) : (
                        data.viewsByFile.slice(0, 15).map((file) => (
                          <div
                            key={file.id}
                            className="flex items-center justify-between p-3 rounded-lg gap-4"
                            style={{ backgroundColor: DS.colors.background.panel }}
                          >
                            <p className="font-medium truncate flex-1" style={{ color: DS.colors.text.primary }}>
                              {file.title}
                            </p>
                            <div className="text-right text-sm shrink-0" style={{ color: DS.colors.text.secondary }}>
                              <span className="font-medium" style={{ color: DS.colors.text.primary }}>
                                {formatNumber(file.view_count || 0)}
                              </span>{' '}
                              this period
                              <span className="mx-2 opacity-40">·</span>
                              {formatNumber(file.total_views || 0)} all-time
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </Card>

                  <Card padding="md">
                    <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
                      <h3 className="text-lg font-semibold" style={{ color: DS.colors.text.primary }}>
                        All projects (period metrics)
                      </h3>
                      <select
                        value={sortProjects}
                        onChange={(e) => setSortProjects(e.target.value)}
                        className="text-sm px-2 py-1 rounded"
                        style={{
                          backgroundColor: DS.colors.background.panel,
                          border: `1px solid ${DS.colors.border.default}`,
                          color: DS.colors.text.primary,
                        }}
                      >
                        <option value="views_period">Views (period)</option>
                        <option value="views_lifetime">Views (all-time)</option>
                        <option value="downloads">Downloads</option>
                        <option value="revenue">Revenue</option>
                        <option value="stars">Stars</option>
                        <option value="title">Title A–Z</option>
                      </select>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr style={{ color: DS.colors.text.secondary, textAlign: 'left' }}>
                            <th className="pb-2 pr-4">Project</th>
                            <th className="pb-2 pr-4">Views (range)</th>
                            <th className="pb-2 pr-4">Views (life)</th>
                            <th className="pb-2 pr-4">DLs</th>
                            <th className="pb-2 pr-4">Stars</th>
                            <th className="pb-2">Revenue</th>
                          </tr>
                        </thead>
                        <tbody>
                          {data.projectsPerformance?.map((row) => (
                              <tr
                                key={row.id}
                                style={{ borderTop: `1px solid ${DS.colors.border.subtle}` }}
                              >
                                <td className="py-2 pr-4 font-medium" style={{ color: DS.colors.text.primary }}>
                                  {row.title}
                                </td>
                                <td className="py-2 pr-4">{formatNumber(row.views)}</td>
                                <td className="py-2 pr-4">{formatNumber(row.viewsLifetime)}</td>
                                <td className="py-2 pr-4">{formatNumber(row.downloads)}</td>
                                <td className="py-2 pr-4">{formatNumber(row.stars)}</td>
                                <td className="py-2">{formatCurrency(row.revenue)}</td>
                              </tr>
                            )) ?? (
                            <tr>
                              <td colSpan={6} className="py-8 text-center" style={{ color: DS.colors.text.secondary }}>
                                No projects
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </Card>
                </>
              ) : null}
            </div>
          </PanelContent>
        </CenterPanel>
      }
    />
  );
}
