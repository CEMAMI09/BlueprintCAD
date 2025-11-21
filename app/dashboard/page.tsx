/**
 * Dashboard Page - GitHub-style Dashboard
 * Widgets showing recent activity, earnings, recommendations
 */

'use client';

import { useState } from 'react';
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
} from 'lucide-react';

export default function DashboardPage() {
  const router = useRouter();
  const [selectedActivity, setSelectedActivity] = useState<any>(null);

  // Mock data
  const stats = [
    { label: 'Total Projects', value: '24', icon: Folder, color: DS.colors.primary.blue },
    { label: 'Active Versions', value: '12', icon: GitBranch, color: DS.colors.accent.success },
    { label: 'Total Earnings', value: '$1,245', icon: DollarSign, color: DS.colors.accent.cyan },
    { label: 'Total Views', value: '8.2k', icon: Eye, color: DS.colors.accent.purple },
  ];

  const recentActivity = [
    { id: 1, type: 'version', project: 'Drone Frame v3', action: 'New version uploaded', time: '2 hours ago', user: 'You' },
    { id: 2, type: 'purchase', project: 'Modular Enclosure', action: 'Purchased by @john_maker', time: '5 hours ago', amount: '$15' },
    { id: 3, type: 'comment', project: 'Gear Assembly', action: 'New comment from @sarah_cad', time: '1 day ago', user: '@sarah_cad' },
    { id: 4, type: 'fork', project: 'Robot Arm', action: 'Forked by @tech_labs', time: '2 days ago', user: '@tech_labs' },
    { id: 5, type: 'star', project: 'Parametric Box', action: 'Starred by 3 users', time: '3 days ago', count: 3 },
  ];

  const trending = [
    { id: 1, title: 'Modular Shelf System', author: '@design_pro', stars: 234, downloads: 1200, thumbnail: '🏠' },
    { id: 2, title: 'Parametric Hinge', author: '@mechanic_ai', stars: 189, downloads: 890, thumbnail: '🔧' },
    { id: 3, title: 'Cable Management', author: '@organizer', stars: 156, downloads: 670, thumbnail: '🔌' },
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
              <Button variant="primary" icon={<Folder size={18} />} onClick={() => router.push('/cad-editor')}>
                New Project
              </Button>
            </div>
          </PanelHeader>

          <PanelContent className="p-6">
            {/* Stats Grid */}
            <div className="grid grid-cols-4 gap-4 mb-8">
              {stats.map((stat, index) => {
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
              </Card>
            </div>

            {/* Trending Designs */}
            <div>
              <h2 className="text-lg font-semibold mb-4" style={{ color: DS.colors.text.primary }}>
                Trending Designs
              </h2>
              <div className="grid grid-cols-3 gap-4">
                {trending.map((design) => (
                  <Card key={design.id} hover padding="md">
                    <div
                      className="w-full h-32 rounded-lg flex items-center justify-center text-4xl mb-4"
                      style={{ backgroundColor: DS.colors.background.elevated }}
                    >
                      {design.thumbnail}
                    </div>
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
                        <Download size={14} />
                        {design.downloads}
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            </div>
          </PanelContent>
        </CenterPanel>
      }
      rightPanel={
        <RightPanel>
          <PanelHeader title="Your Profile" />
          <PanelContent className="p-6">
            {/* User Quick Profile */}
            <div className="text-center mb-6">
              <div
                className="w-20 h-20 rounded-full mx-auto mb-4 flex items-center justify-center text-2xl font-bold"
                style={{ backgroundColor: DS.colors.primary.blue, color: '#ffffff' }}
              >
                JD
              </div>
              <h3 className="font-semibold" style={{ color: DS.colors.text.primary }}>
                John Designer
              </h3>
              <p className="text-sm" style={{ color: DS.colors.text.secondary }}>
                @john_designer
              </p>
              <div className="flex items-center justify-center gap-2 mt-2">
                <Crown size={16} style={{ color: DS.colors.accent.warning }} />
                <Badge variant="warning" size="sm">Pro Member</Badge>
              </div>
            </div>

            {/* Storage Usage */}
            <div className="mb-6">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium" style={{ color: DS.colors.text.primary }}>
                  Storage
                </span>
                <span className="text-sm" style={{ color: DS.colors.text.secondary }}>
                  4.2 GB / 10 GB
                </span>
              </div>
              <div
                className="h-2 rounded-full overflow-hidden"
                style={{ backgroundColor: DS.colors.background.elevated }}
              >
                <div
                  className="h-full rounded-full"
                  style={{ width: '42%', backgroundColor: DS.colors.primary.blue }}
                />
              </div>
            </div>

            {/* Quick Stats */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Folder size={16} style={{ color: DS.colors.text.tertiary }} />
                  <span className="text-sm" style={{ color: DS.colors.text.secondary }}>
                    Projects
                  </span>
                </div>
                <span className="font-semibold" style={{ color: DS.colors.text.primary }}>
                  24
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
                  342
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
                  1,234
                </span>
              </div>
            </div>

            <Button variant="secondary" fullWidth className="mt-6">
              View Full Profile
            </Button>
          </PanelContent>
        </RightPanel>
      }
    />
  );
}
