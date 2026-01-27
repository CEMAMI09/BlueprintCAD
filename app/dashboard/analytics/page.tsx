'use client';

import React, { useState } from 'react';
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

// Placeholder analytics data for now
const PLACEHOLDER_ANALYTICS: AnalyticsData = {
  totalRevenue: 12840,
  revenueByMonth: [
    { month: 'Jan', revenue: 820, order_count: 14 },
    { month: 'Feb', revenue: 1150, order_count: 19 },
    { month: 'Mar', revenue: 1630, order_count: 24 },
    { month: 'Apr', revenue: 1425, order_count: 21 },
    { month: 'May', revenue: 1980, order_count: 28 },
    { month: 'Jun', revenue: 2215, order_count: 31 },
    { month: 'Jul', revenue: 2280, order_count: 30 },
    { month: 'Aug', revenue: 2240, order_count: 29 },
    { month: 'Sep', revenue: 1875, order_count: 26 },
    { month: 'Oct', revenue: 920, order_count: 15 },
    { month: 'Nov', revenue: 650, order_count: 11 },
    { month: 'Dec', revenue: 575, order_count: 10 },
  ],
  totalDownloads: 4860,
  downloadsByFile: [
    { id: 1, title: 'Parametric Gearbox v3', download_count: 980, revenue: 6240 },
    { id: 2, title: 'CNC Router Table', download_count: 640, revenue: 3120 },
    { id: 3, title: 'Low-Poly Desk Lamp', download_count: 420, revenue: 840 },
    { id: 4, title: 'Printer Enclosure Kit', download_count: 310, revenue: 930 },
    { id: 5, title: 'Magnetic Tool Wall', download_count: 260, revenue: 520 },
  ],
  totalViews: 38240,
  viewsByFile: [
    { id: 1, title: 'Parametric Gearbox v3', view_count: 9200, total_views: 9200 },
    { id: 2, title: 'CNC Router Table', view_count: 6700, total_views: 6700 },
    { id: 3, title: 'Low-Poly Desk Lamp', view_count: 5400, total_views: 5400 },
    { id: 4, title: 'Printer Enclosure Kit', view_count: 4800, total_views: 4800 },
    { id: 5, title: 'Magnetic Tool Wall', view_count: 3600, total_views: 3600 },
  ],
  conversionRate: 4.7,
  topSellingItems: [
    {
      id: 1,
      title: 'Parametric Gearbox v3',
      thumbnail_path: '',
      download_count: 980,
      revenue: 6240,
      price: 6.37,
    },
    {
      id: 2,
      title: 'CNC Router Table',
      thumbnail_path: '',
      download_count: 640,
      revenue: 3120,
      price: 4.88,
    },
    {
      id: 3,
      title: 'Printer Enclosure Kit',
      thumbnail_path: '',
      download_count: 310,
      revenue: 930,
      price: 3.00,
    },
  ],
  trends: {
    revenue: [
      { date: 'Day 1', revenue: 220, order_count: 4 },
      { date: 'Day 2', revenue: 340, order_count: 6 },
      { date: 'Day 3', revenue: 180, order_count: 3 },
      { date: 'Day 4', revenue: 390, order_count: 7 },
      { date: 'Day 5', revenue: 260, order_count: 5 },
      { date: 'Day 6', revenue: 410, order_count: 8 },
      { date: 'Day 7', revenue: 320, order_count: 6 },
    ],
    downloads: [
      { date: 'Day 1', download_count: 120 },
      { date: 'Day 2', download_count: 180 },
      { date: 'Day 3', download_count: 95 },
      { date: 'Day 4', download_count: 210 },
      { date: 'Day 5', download_count: 140 },
      { date: 'Day 6', download_count: 230 },
      { date: 'Day 7', download_count: 190 },
    ],
    views: [
      { date: 'Day 1', view_count: 640 },
      { date: 'Day 2', view_count: 810 },
      { date: 'Day 3', view_count: 520 },
      { date: 'Day 4', view_count: 980 },
      { date: 'Day 5', view_count: 760 },
      { date: 'Day 6', view_count: 1120 },
      { date: 'Day 7', view_count: 880 },
    ],
  },
  period: 30,
};

export default function SellerAnalyticsPage() {
  const [period, setPeriod] = useState('30');

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  const formatNumber = (num: number) => {
    return new Intl.NumberFormat('en-US').format(num);
  };

  const displayAnalytics = PLACEHOLDER_ANALYTICS;

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
          <PanelContent>
            <div className="max-w-7xl mx-auto px-8 pt-8 pb-8 space-y-6">
              {/* Summary Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <Card padding="md" hover>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm" style={{ color: DS.colors.text.secondary }}>Total Revenue</p>
                      <p className="text-2xl font-bold mt-1" style={{ color: DS.colors.text.primary }}>
                        {displayAnalytics.totalRevenue > 0 ? formatCurrency(displayAnalytics.totalRevenue) : '$0.00'}
                      </p>
                      {displayAnalytics.totalRevenue === 0 && (
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
                        {formatNumber(displayAnalytics.totalDownloads)}
                      </p>
                      {displayAnalytics.totalDownloads === 0 && (
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
                        {formatNumber(displayAnalytics.totalViews)}
                      </p>
                      {displayAnalytics.totalViews === 0 && (
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
                        {displayAnalytics.conversionRate ? displayAnalytics.conversionRate.toFixed(2) : '0.00'}%
                      </p>
                      {displayAnalytics.conversionRate === 0 && (
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
                {displayAnalytics.revenueByMonth.length === 0 || displayAnalytics.revenueByMonth.every(m => m.revenue === 0) ? (
                  <div className="text-center py-12">
                    <DollarSign size={48} className="mx-auto mb-3" style={{ color: DS.colors.text.tertiary, opacity: 0.5 }} />
                    <p className="text-sm font-medium" style={{ color: DS.colors.text.secondary }}>No revenue data yet</p>
                    <p className="text-xs mt-1" style={{ color: DS.colors.text.tertiary }}>Start selling your designs to see revenue trends</p>
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={displayAnalytics.revenueByMonth}>
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
                  {displayAnalytics.trends.revenue.length === 0 || displayAnalytics.trends.revenue.every(t => t.revenue === 0) ? (
                    <div className="text-center py-12">
                      <TrendingUp size={48} className="mx-auto mb-3" style={{ color: DS.colors.text.tertiary, opacity: 0.5 }} />
                      <p className="text-sm font-medium" style={{ color: DS.colors.text.secondary }}>No revenue data for this period</p>
                      <p className="text-xs mt-1" style={{ color: DS.colors.text.tertiary }}>Try selecting a different time period</p>
                    </div>
                  ) : (
                    <ResponsiveContainer width="100%" height={250}>
                      <LineChart data={displayAnalytics.trends.revenue}>
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
                  {(displayAnalytics.trends.downloads.length === 0 || displayAnalytics.trends.downloads.every(d => d.download_count === 0)) && 
                   (displayAnalytics.trends.views.length === 0 || displayAnalytics.trends.views.every(v => v.view_count === 0)) ? (
                    <div className="text-center py-12">
                      <Download size={48} className="mx-auto mb-3" style={{ color: DS.colors.text.tertiary, opacity: 0.5 }} />
                      <p className="text-sm font-medium" style={{ color: DS.colors.text.secondary }}>No activity data for this period</p>
                      <p className="text-xs mt-1" style={{ color: DS.colors.text.tertiary }}>Your designs will appear here once they get views or downloads</p>
                    </div>
                  ) : (
                    <ResponsiveContainer width="100%" height={250}>
                      <LineChart data={(() => {
                        // Merge downloads and views by date
                        const downloadsMap = new Map(displayAnalytics.trends.downloads.map(d => [d.date, d.download_count]));
                        const viewsMap = new Map(displayAnalytics.trends.views.map(v => [v.date, v.view_count]));
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
                  {displayAnalytics.topSellingItems.length === 0 ? (
                    <div className="text-center py-12">
                      <Package size={48} className="mx-auto mb-3" style={{ color: DS.colors.text.tertiary, opacity: 0.5 }} />
                      <p className="text-sm font-medium" style={{ color: DS.colors.text.secondary }}>No sales yet</p>
                      <p className="text-xs mt-1" style={{ color: DS.colors.text.tertiary }}>Make your designs available for purchase to start earning</p>
                    </div>
                  ) : (
                    displayAnalytics.topSellingItems.map((item, index) => (
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
                  {displayAnalytics.downloadsByFile.length === 0 ? (
                    <div className="text-center py-12">
                      <Download size={48} className="mx-auto mb-3" style={{ color: DS.colors.text.tertiary, opacity: 0.5 }} />
                      <p className="text-sm font-medium" style={{ color: DS.colors.text.secondary }}>No downloads yet</p>
                      <p className="text-xs mt-1" style={{ color: DS.colors.text.tertiary }}>Downloads will appear here once customers purchase your designs</p>
                    </div>
                  ) : (
                    displayAnalytics.downloadsByFile.slice(0, 10).map((file) => (
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
                  {displayAnalytics.viewsByFile.length === 0 || displayAnalytics.viewsByFile.every(f => (f.view_count || f.total_views || 0) === 0) ? (
                    <div className="text-center py-12">
                      <Eye size={48} className="mx-auto mb-3" style={{ color: DS.colors.text.tertiary, opacity: 0.5 }} />
                      <p className="text-sm font-medium" style={{ color: DS.colors.text.secondary }}>No views yet</p>
                      <p className="text-xs mt-1" style={{ color: DS.colors.text.tertiary }}>Share your designs to start getting views</p>
                    </div>
                  ) : (
                    displayAnalytics.viewsByFile.slice(0, 10).map((file) => (
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

