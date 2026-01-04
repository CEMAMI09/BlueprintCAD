'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  ThreePanelLayout,
  CenterPanel,
  PanelHeader,
  PanelContent,
} from '@/components/ui/ThreePanelLayout';
import { GlobalNavSidebar } from '@/components/ui/GlobalNavSidebar';
import { Card } from '@/components/ui/UIComponents';
import { DesignSystem as DS } from '@/backend/lib/ui/design-system';
import { apiFetch } from '@/lib/apiClient';
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
  Users,
  Star,
} from 'lucide-react';

interface AnalyticsData {
  totalRevenue: number;
  revenueByMonth: Array<{ month: string; revenue: number; order_count: number }>;
  totalDownloads: number;
  downloadsByFile: Array<{ id: number; title: string; download_count: number; revenue: number }>;
  totalViews: number;
  viewsByFile: Array<{ id: number; title: string; view_count: number; total_views: number }>;
  conversionRate: number;
  topSellingItems: Array<{ id: number; title: string; thumbnail_path: string; download_count: number; revenue: number; price: number }>;
  trends: {
    revenue: Array<{ date: string; revenue: number; order_count: number }>;
    downloads: Array<{ date: string; download_count: number }>;
    views: Array<{ date: string; view_count: number }>;
  };
  period: number;
}

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

export default function SellerAnalyticsPage() {
  const router = useRouter();
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState('30');

  useEffect(() => {
    fetchAnalytics();
  }, [period]);

  const fetchAnalytics = async () => {
    try {
      setLoading(true);
      const data = await apiFetch(`/api/analytics/seller?period=${period}`);
      setAnalytics(data);
    } catch (error: any) {
      console.error('Error fetching analytics:', error);
      if (error.message?.includes('401') || error.message?.includes('Unauthorized')) {
        router.push('/login');
      }
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  const formatNumber = (num: number) => {
    return new Intl.NumberFormat('en-US').format(num);
  };

  if (loading) {
    return (
      <ThreePanelLayout
        leftPanel={<GlobalNavSidebar />}
        centerPanel={
          <CenterPanel>
            <PanelHeader title="Seller Analytics" />
            <PanelContent>
              <div className="flex items-center justify-center h-64">
                <div className="w-8 h-8 border-4 border-blue-500/20 border-t-blue-500 rounded-full animate-spin"></div>
              </div>
            </PanelContent>
          </CenterPanel>
        }
      />
    );
  }

  if (!analytics) {
    return (
      <ThreePanelLayout
        leftPanel={<GlobalNavSidebar />}
        centerPanel={
          <CenterPanel>
            <PanelHeader title="Seller Analytics" />
            <PanelContent>
              <div className="text-center py-12">
                <p className="text-gray-400">Failed to load analytics</p>
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
          <PanelHeader
            title="Seller Analytics"
            actions={
              <select
                value={period}
                onChange={(e) => setPeriod(e.target.value)}
                className="px-3 py-1 text-sm rounded"
                style={{
                  backgroundColor: DS.colors.background.panel,
                  border: `1px solid ${DS.colors.border.default}`,
                  color: DS.colors.text.primary
                }}
              >
                <option value="7">Last 7 days</option>
                <option value="30">Last 30 days</option>
                <option value="90">Last 90 days</option>
                <option value="365">Last year</option>
              </select>
            }
          />
          <PanelContent className="p-8">
            <div className="max-w-7xl mx-auto space-y-6">
              {/* Summary Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <Card padding="md" hover>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm" style={{ color: DS.colors.text.secondary }}>Total Revenue</p>
                      <p className="text-2xl font-bold mt-1" style={{ color: DS.colors.text.primary }}>
                        {analytics.totalRevenue > 0 ? formatCurrency(analytics.totalRevenue) : '$0.00'}
                      </p>
                      {analytics.totalRevenue === 0 && (
                        <p className="text-xs mt-1" style={{ color: DS.colors.text.tertiary }}>No sales yet</p>
                      )}
                    </div>
                    <DollarSign size={32} style={{ color: DS.colors.primary.blue }} />
                  </div>
                </Card>

                <Card padding="md" hover>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm" style={{ color: DS.colors.text.secondary }}>Total Downloads</p>
                      <p className="text-2xl font-bold mt-1" style={{ color: DS.colors.text.primary }}>
                        {formatNumber(analytics.totalDownloads)}
                      </p>
                      {analytics.totalDownloads === 0 && (
                        <p className="text-xs mt-1" style={{ color: DS.colors.text.tertiary }}>No downloads yet</p>
                      )}
                    </div>
                    <Download size={32} style={{ color: DS.colors.accent.success }} />
                  </div>
                </Card>

                <Card padding="md" hover>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm" style={{ color: DS.colors.text.secondary }}>Total Views</p>
                      <p className="text-2xl font-bold mt-1" style={{ color: DS.colors.text.primary }}>
                        {formatNumber(analytics.totalViews)}
                      </p>
                      {analytics.totalViews === 0 && (
                        <p className="text-xs mt-1" style={{ color: DS.colors.text.tertiary }}>No views yet</p>
                      )}
                    </div>
                    <Eye size={32} style={{ color: DS.colors.accent.purple }} />
                  </div>
                </Card>

                <Card padding="md" hover>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm" style={{ color: DS.colors.text.secondary }}>Conversion Rate</p>
                      <p className="text-2xl font-bold mt-1" style={{ color: DS.colors.text.primary }}>
                        {analytics.conversionRate ? analytics.conversionRate.toFixed(2) : '0.00'}%
                      </p>
                      {analytics.conversionRate === 0 && (
                        <p className="text-xs mt-1" style={{ color: DS.colors.text.tertiary }}>No conversions yet</p>
                      )}
                    </div>
                    <TrendingUp size={32} style={{ color: DS.colors.accent.cyan }} />
                  </div>
                </Card>
              </div>

              {/* Revenue by Month */}
              <Card padding="md">
                <h3 className="text-lg font-semibold mb-4 flex items-center gap-2" style={{ color: DS.colors.text.primary }}>
                  <Calendar size={20} />
                  Revenue by Month (Last 12 Months)
                </h3>
                {analytics.revenueByMonth.length === 0 || analytics.revenueByMonth.every(m => m.revenue === 0) ? (
                  <div className="text-center py-12">
                    <DollarSign size={48} className="mx-auto mb-3" style={{ color: DS.colors.text.tertiary, opacity: 0.5 }} />
                    <p className="text-sm font-medium" style={{ color: DS.colors.text.secondary }}>No revenue data yet</p>
                    <p className="text-xs mt-1" style={{ color: DS.colors.text.tertiary }}>Start selling your designs to see revenue trends</p>
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={analytics.revenueByMonth}>
                      <CartesianGrid strokeDasharray="3 3" stroke={DS.colors.border.default} />
                      <XAxis dataKey="month" stroke={DS.colors.text.secondary} />
                      <YAxis stroke={DS.colors.text.secondary} />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: DS.colors.background.card,
                          border: `1px solid ${DS.colors.border.default}`,
                          color: DS.colors.text.primary
                        }}
                        formatter={(value: number) => formatCurrency(value)}
                      />
                      <Legend />
                      <Bar dataKey="revenue" fill={DS.colors.primary.blue} name="Revenue" />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </Card>

              {/* Trends */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card padding="md">
                  <h3 className="text-lg font-semibold mb-4" style={{ color: DS.colors.text.primary }}>
                    Revenue Trend
                  </h3>
                  {analytics.trends.revenue.length === 0 || analytics.trends.revenue.every(t => t.revenue === 0) ? (
                    <div className="text-center py-12">
                      <TrendingUp size={48} className="mx-auto mb-3" style={{ color: DS.colors.text.tertiary, opacity: 0.5 }} />
                      <p className="text-sm font-medium" style={{ color: DS.colors.text.secondary }}>No revenue data for this period</p>
                      <p className="text-xs mt-1" style={{ color: DS.colors.text.tertiary }}>Try selecting a different time period</p>
                    </div>
                  ) : (
                    <ResponsiveContainer width="100%" height={250}>
                      <LineChart data={analytics.trends.revenue}>
                        <CartesianGrid strokeDasharray="3 3" stroke={DS.colors.border.default} />
                        <XAxis dataKey="date" stroke={DS.colors.text.secondary} />
                        <YAxis stroke={DS.colors.text.secondary} />
                        <Tooltip
                          contentStyle={{
                            backgroundColor: DS.colors.background.card,
                            border: `1px solid ${DS.colors.border.default}`,
                            color: DS.colors.text.primary
                          }}
                          formatter={(value: number) => formatCurrency(value)}
                        />
                        <Legend />
                        <Line type="monotone" dataKey="revenue" stroke={DS.colors.primary.blue} name="Revenue" />
                      </LineChart>
                    </ResponsiveContainer>
                  )}
                </Card>

                <Card padding="md">
                  <h3 className="text-lg font-semibold mb-4" style={{ color: DS.colors.text.primary }}>
                    Downloads & Views Trend
                  </h3>
                  {(analytics.trends.downloads.length === 0 || analytics.trends.downloads.every(d => d.download_count === 0)) && 
                   (analytics.trends.views.length === 0 || analytics.trends.views.every(v => v.view_count === 0)) ? (
                    <div className="text-center py-12">
                      <Download size={48} className="mx-auto mb-3" style={{ color: DS.colors.text.tertiary, opacity: 0.5 }} />
                      <p className="text-sm font-medium" style={{ color: DS.colors.text.secondary }}>No activity data for this period</p>
                      <p className="text-xs mt-1" style={{ color: DS.colors.text.tertiary }}>Your designs will appear here once they get views or downloads</p>
                    </div>
                  ) : (
                    <ResponsiveContainer width="100%" height={250}>
                      <LineChart data={(() => {
                        // Merge downloads and views by date
                        const downloadsMap = new Map(analytics.trends.downloads.map(d => [d.date, d.download_count]));
                        const viewsMap = new Map(analytics.trends.views.map(v => [v.date, v.view_count]));
                        const allDates = new Set([...downloadsMap.keys(), ...viewsMap.keys()]);
                        return Array.from(allDates).sort().map(date => ({
                          date,
                          downloads: downloadsMap.get(date) || 0,
                          views: viewsMap.get(date) || 0
                        }));
                      })()}>
                        <CartesianGrid strokeDasharray="3 3" stroke={DS.colors.border.default} />
                        <XAxis dataKey="date" stroke={DS.colors.text.secondary} />
                        <YAxis stroke={DS.colors.text.secondary} />
                        <Tooltip
                          contentStyle={{
                            backgroundColor: DS.colors.background.card,
                            border: `1px solid ${DS.colors.border.default}`,
                            color: DS.colors.text.primary
                          }}
                        />
                        <Legend />
                        <Line type="monotone" dataKey="downloads" stroke="#10b981" name="Downloads" />
                        <Line type="monotone" dataKey="views" stroke="#3b82f6" name="Views" />
                      </LineChart>
                    </ResponsiveContainer>
                  )}
                </Card>
              </div>

              {/* Top Selling Items */}
              <Card padding="md">
                <h3 className="text-lg font-semibold mb-4 flex items-center gap-2" style={{ color: DS.colors.text.primary }}>
                  <FileText size={20} />
                  Top Selling Items
                </h3>
                <div className="space-y-3">
                  {analytics.topSellingItems.length === 0 ? (
                    <div className="text-center py-12">
                      <Package size={48} className="mx-auto mb-3" style={{ color: DS.colors.text.tertiary, opacity: 0.5 }} />
                      <p className="text-sm font-medium" style={{ color: DS.colors.text.secondary }}>No sales yet</p>
                      <p className="text-xs mt-1" style={{ color: DS.colors.text.tertiary }}>Make your designs available for purchase to start earning</p>
                    </div>
                  ) : (
                    analytics.topSellingItems.map((item, index) => (
                      <div
                        key={item.id}
                        className="flex items-center gap-4 p-3 rounded-lg"
                        style={{ backgroundColor: DS.colors.background.panel }}
                      >
                        <div className="flex items-center gap-3 flex-1">
                          <span className="text-sm font-semibold" style={{ color: DS.colors.text.secondary }}>
                            #{index + 1}
                          </span>
                          {item.thumbnail_path ? (
                            <img
                              src={`${process.env.NEXT_PUBLIC_API_URL}/api/thumbnails/${encodeURIComponent(item.thumbnail_path)}`}
                              alt={item.title}
                              className="w-12 h-12 rounded object-cover"
                              onError={(e) => {
                                e.currentTarget.style.display = 'none';
                              }}
                            />
                          ) : (
                            <div className="w-12 h-12 rounded flex items-center justify-center" style={{ backgroundColor: DS.colors.background.elevated }}>
                              <Package size={20} style={{ color: DS.colors.text.tertiary }} />
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
                        <div className="text-right">
                          <p className="font-semibold" style={{ color: DS.colors.text.primary }}>
                            {formatCurrency(item.revenue)}
                          </p>
                          <p className="text-sm" style={{ color: DS.colors.text.secondary }}>
                            {formatCurrency(item.price)} each
                          </p>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </Card>

              {/* Downloads by File */}
              <Card padding="md">
                <h3 className="text-lg font-semibold mb-4" style={{ color: DS.colors.text.primary }}>
                  Downloads by File
                </h3>
                <div className="space-y-2">
                  {analytics.downloadsByFile.length === 0 ? (
                    <div className="text-center py-12">
                      <Download size={48} className="mx-auto mb-3" style={{ color: DS.colors.text.tertiary, opacity: 0.5 }} />
                      <p className="text-sm font-medium" style={{ color: DS.colors.text.secondary }}>No downloads yet</p>
                      <p className="text-xs mt-1" style={{ color: DS.colors.text.tertiary }}>Downloads will appear here once customers purchase your designs</p>
                    </div>
                  ) : (
                    analytics.downloadsByFile.slice(0, 10).map((file) => (
                      <div
                        key={file.id}
                        className="flex items-center justify-between p-3 rounded-lg"
                        style={{ backgroundColor: DS.colors.background.panel }}
                      >
                        <p className="font-medium truncate flex-1" style={{ color: DS.colors.text.primary }}>
                          {file.title}
                        </p>
                        <div className="flex items-center gap-4">
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

              {/* Views by File */}
              <Card padding="md">
                <h3 className="text-lg font-semibold mb-4" style={{ color: DS.colors.text.primary }}>
                  Views by File
                </h3>
                <div className="space-y-2">
                  {analytics.viewsByFile.length === 0 || analytics.viewsByFile.every(f => (f.view_count || f.total_views || 0) === 0) ? (
                    <div className="text-center py-12">
                      <Eye size={48} className="mx-auto mb-3" style={{ color: DS.colors.text.tertiary, opacity: 0.5 }} />
                      <p className="text-sm font-medium" style={{ color: DS.colors.text.secondary }}>No views yet</p>
                      <p className="text-xs mt-1" style={{ color: DS.colors.text.tertiary }}>Share your designs to start getting views</p>
                    </div>
                  ) : (
                    analytics.viewsByFile.slice(0, 10).map((file) => (
                      <div
                        key={file.id}
                        className="flex items-center justify-between p-3 rounded-lg"
                        style={{ backgroundColor: DS.colors.background.panel }}
                      >
                        <p className="font-medium truncate flex-1" style={{ color: DS.colors.text.primary }}>
                          {file.title}
                        </p>
                        <span className="text-sm" style={{ color: DS.colors.text.secondary }}>
                          {formatNumber(file.view_count || file.total_views)} views
                        </span>
                      </div>
                    ))
                  )}
                </div>
              </Card>
            </div>
          </PanelContent>
        </CenterPanel>
      }
    />
  );
}

