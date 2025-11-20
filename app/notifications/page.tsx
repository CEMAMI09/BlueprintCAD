/**
 * Notifications Page - GitHub Style
 * System notifications with filtering and grouping
 */

'use client';

import { useState } from 'react';
import Link from 'next/link';
import {
  ThreePanelLayout,
  CenterPanel,
  RightPanel,
  PanelHeader,
  PanelContent,
} from '@/components/ui/ThreePanelLayout';
import { GlobalNavSidebar } from '@/components/ui/GlobalNavSidebar';
import { Button, Badge, Tabs, EmptyState } from '@/components/ui/UIComponents';
import { DesignSystem as DS } from '@/lib/ui/design-system';
import {
  Bell,
  Check,
  CheckCheck,
  Star,
  MessageCircle,
  Download,
  DollarSign,
  GitBranch,
  Heart,
  User,
  Settings,
  Filter,
} from 'lucide-react';

interface Notification {
  id: string;
  type: 'comment' | 'like' | 'download' | 'purchase' | 'follow' | 'version' | 'mention';
  title: string;
  description: string;
  timestamp: string;
  read: boolean;
  link: string;
  avatar?: string;
  project?: string;
}

export default function NotificationsPage() {
  const [selectedNotification, setSelectedNotification] = useState<Notification | null>(null);
  const [activeFilter, setActiveFilter] = useState('all');
  const [showUnreadOnly, setShowUnreadOnly] = useState(false);

  const notifications: Notification[] = [];

  const unreadCount = notifications.filter(n => !n.read).length;

  const getIcon = (type: Notification['type']) => {
    switch (type) {
      case 'comment':
        return MessageCircle;
      case 'like':
        return Heart;
      case 'download':
        return Download;
      case 'purchase':
        return DollarSign;
      case 'follow':
        return User;
      case 'version':
        return GitBranch;
      case 'mention':
        return Star;
      default:
        return Bell;
    }
  };

  const getIconColor = (type: Notification['type']) => {
    switch (type) {
      case 'comment':
        return DS.colors.primary.blue;
      case 'like':
        return DS.colors.accent.error;
      case 'download':
        return DS.colors.accent.cyan;
      case 'purchase':
        return DS.colors.accent.success;
      case 'follow':
        return DS.colors.accent.purple;
      case 'version':
        return DS.colors.accent.warning;
      case 'mention':
        return DS.colors.accent.warning;
      default:
        return DS.colors.text.secondary;
    }
  };

  const filteredNotifications = notifications.filter(notif => {
    if (showUnreadOnly && notif.read) return false;
    if (activeFilter === 'all') return true;
    if (activeFilter === 'mentions') return notif.type === 'mention' || notif.type === 'comment';
    if (activeFilter === 'purchases') return notif.type === 'purchase';
    return true;
  });

  const markAllAsRead = () => {
    // Implementation would mark all as read
    console.log('Mark all as read');
  };

  return (
    <ThreePanelLayout
      leftPanel={<GlobalNavSidebar />}
      centerPanel={
        <CenterPanel>
          <PanelHeader
            title="Notifications"
            actions={
              <div className="flex items-center gap-2">
                {unreadCount > 0 && (
                  <Badge variant="primary" size="sm">
                    {unreadCount} new
                  </Badge>
                )}
                <Button
                  variant="ghost"
                  size="sm"
                  icon={<CheckCheck size={16} />}
                  onClick={markAllAsRead}
                >
                  Mark all read
                </Button>
                <Button variant="ghost" size="sm" icon={<Settings size={16} />} />
              </div>
            }
          />
          <PanelContent>
            <div className="max-w-7xl mx-auto px-6 py-6">
              {/* Filters */}
              <div className="flex items-center justify-between mb-6">
              <Tabs
                tabs={[
                  { id: 'all', label: 'All', badge: notifications.length },
                  { id: 'mentions', label: 'Mentions', badge: notifications.filter(n => n.type === 'mention' || n.type === 'comment').length },
                  { id: 'purchases', label: 'Purchases', badge: notifications.filter(n => n.type === 'purchase').length },
                ]}
                activeTab={activeFilter}
                onTabChange={setActiveFilter}
              />
              <button
                className="px-3 py-1.5 rounded-lg text-sm font-medium transition-colors flex items-center gap-2"
                style={{
                  backgroundColor: showUnreadOnly ? DS.colors.primary.blue : DS.colors.background.elevated,
                  color: showUnreadOnly ? '#ffffff' : DS.colors.text.secondary,
                }}
                onClick={() => setShowUnreadOnly(!showUnreadOnly)}
              >
                <Filter size={14} />
                Unread only
              </button>
            </div>

            {/* Notifications List */}
            {filteredNotifications.length === 0 ? (
              <div className="py-16">
                <EmptyState
                  icon={<Bell />}
                  title="No notifications"
                  description={showUnreadOnly ? "You're all caught up!" : "You don't have any notifications yet"}
                />
              </div>
            ) : (
              <div className="space-y-2">
                {filteredNotifications.map((notif) => {
                  const Icon = getIcon(notif.type);
                  const iconColor = getIconColor(notif.type);
                  const isSelected = selectedNotification?.id === notif.id;

                  return (
                    <Link
                      key={notif.id}
                      href={notif.link}
                      onClick={(e) => {
                        e.preventDefault();
                        setSelectedNotification(notif);
                      }}
                    >
                      <div
                        className="flex items-start gap-4 p-4 rounded-lg border transition-all cursor-pointer"
                        style={{
                          backgroundColor: notif.read
                            ? (isSelected ? DS.colors.background.elevated : DS.colors.background.card)
                            : `${DS.colors.primary.blue}11`,
                          borderColor: isSelected ? DS.colors.primary.blue : DS.colors.border.default,
                        }}
                      >
                        {/* Icon */}
                        <div
                          className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0"
                          style={{ backgroundColor: `${iconColor}22` }}
                        >
                          <Icon size={20} style={{ color: iconColor }} />
                        </div>

                        {/* Content */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between mb-1">
                            <h3
                              className="font-semibold"
                              style={{ color: DS.colors.text.primary }}
                            >
                              {notif.title}
                            </h3>
                            {!notif.read && (
                              <div
                                className="w-2 h-2 rounded-full ml-2 mt-1.5"
                                style={{ backgroundColor: DS.colors.primary.blue }}
                              />
                            )}
                          </div>
                          <p
                            className="text-sm mb-2 line-clamp-2"
                            style={{ color: DS.colors.text.secondary }}
                          >
                            {notif.description}
                          </p>
                          <div className="flex items-center gap-3 text-sm" style={{ color: DS.colors.text.tertiary }}>
                            {notif.avatar && (
                              <div
                                className="w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold"
                                style={{ backgroundColor: DS.colors.primary.blue, color: '#ffffff' }}
                              >
                                {notif.avatar}
                              </div>
                            )}
                            <span>{notif.timestamp}</span>
                            {notif.project && (
                              <>
                                <span>•</span>
                                <span className="truncate">{notif.project}</span>
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                    </Link>
                  );
                })}
              </div>
            )}
            </div>
          </PanelContent>
        </CenterPanel>
      }
      rightPanel={
        <RightPanel>
          {selectedNotification ? (
            <>
              <PanelHeader title="Notification Details" />
              <PanelContent>
                {/* Icon */}
                <div
                  className="w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4"
                  style={{ backgroundColor: `${getIconColor(selectedNotification.type)}22` }}
                >
                  {(() => {
                    const Icon = getIcon(selectedNotification.type);
                    return <Icon size={40} style={{ color: getIconColor(selectedNotification.type) }} />;
                  })()}
                </div>

                {/* Title */}
                <h3 className="text-lg font-bold text-center mb-2" style={{ color: DS.colors.text.primary }}>
                  {selectedNotification.title}
                </h3>

                {/* Type Badge */}
                <div className="flex justify-center mb-4">
                  <Badge variant="default" size="sm">
                    {selectedNotification.type}
                  </Badge>
                </div>

                {/* Description */}
                <div className="mb-6">
                  <p
                    className="text-sm leading-relaxed text-center"
                    style={{ color: DS.colors.text.secondary }}
                  >
                    {selectedNotification.description}
                  </p>
                </div>

                {/* Metadata */}
                <div className="space-y-2 mb-6 text-sm" style={{ color: DS.colors.text.secondary }}>
                  <div className="flex items-center justify-between">
                    <span>Time:</span>
                    <span className="font-medium" style={{ color: DS.colors.text.primary }}>
                      {selectedNotification.timestamp}
                    </span>
                  </div>
                  {selectedNotification.project && (
                    <div className="flex items-center justify-between">
                      <span>Project:</span>
                      <span className="font-medium" style={{ color: DS.colors.text.primary }}>
                        {selectedNotification.project}
                      </span>
                    </div>
                  )}
                  <div className="flex items-center justify-between">
                    <span>Status:</span>
                    <Badge variant={selectedNotification.read ? 'default' : 'primary'} size="sm">
                      {selectedNotification.read ? 'Read' : 'Unread'}
                    </Badge>
                  </div>
                </div>

                {/* Actions */}
                <div className="space-y-2">
                  <Link href={selectedNotification.link}>
                    <Button variant="primary" fullWidth>
                      View Details
                    </Button>
                  </Link>
                  {!selectedNotification.read && (
                    <Button variant="ghost" fullWidth icon={<Check size={16} />} iconPosition="left">
                      Mark as Read
                    </Button>
                  )}
                </div>
              </PanelContent>
            </>
          ) : (
            <>
              <PanelHeader title="Notification Settings" />
              <PanelContent>
                <div className="space-y-4">
                  <div>
                    <h4 className="text-sm font-semibold mb-3" style={{ color: DS.colors.text.primary }}>
                      Email Notifications
                    </h4>
                    <div className="space-y-3">
                      {[
                        'New comments on my designs',
                        'New purchases',
                        'New followers',
                        'Mentions in discussions',
                        'Version updates from followed users',
                      ].map((setting, index) => (
                        <label key={index} className="flex items-center gap-3 cursor-pointer">
                          <input
                            type="checkbox"
                            defaultChecked
                            className="w-4 h-4 rounded"
                            style={{ accentColor: DS.colors.primary.blue }}
                          />
                          <span className="text-sm" style={{ color: DS.colors.text.secondary }}>
                            {setting}
                          </span>
                        </label>
                      ))}
                    </div>
                  </div>

                  <div className="pt-4 border-t" style={{ borderColor: DS.colors.border.subtle }}>
                    <h4 className="text-sm font-semibold mb-3" style={{ color: DS.colors.text.primary }}>
                      Push Notifications
                    </h4>
                    <div className="space-y-3">
                      {[
                        'Desktop notifications',
                        'Mobile notifications',
                      ].map((setting, index) => (
                        <label key={index} className="flex items-center gap-3 cursor-pointer">
                          <input
                            type="checkbox"
                            defaultChecked
                            className="w-4 h-4 rounded"
                            style={{ accentColor: DS.colors.primary.blue }}
                          />
                          <span className="text-sm" style={{ color: DS.colors.text.secondary }}>
                            {setting}
                          </span>
                        </label>
                      ))}
                    </div>
                  </div>

                  <Button variant="secondary" fullWidth icon={<Settings size={16} />} iconPosition="left">
                    Advanced Settings
                  </Button>
                </div>
              </PanelContent>
            </>
          )}
        </RightPanel>
      }
    />
  );
}
