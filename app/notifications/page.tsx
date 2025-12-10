'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  ThreePanelLayout,
  CenterPanel,
  PanelHeader,
  PanelContent,
} from '@/components/ui/ThreePanelLayout';
import { GlobalNavSidebar } from '@/components/ui/GlobalNavSidebar';
import { Card, Button, EmptyState, Badge } from '@/components/ui/UIComponents';
import { DesignSystem as DS } from '@/backend/lib/ui/design-system';
import { Bell, UserPlus, Check, X, User, Heart, MessageCircle } from 'lucide-react';

interface Notification {
  id: number;
  type: string;
  related_id: number | null;
  message: string;
  read: number;
  dismissed: number;
  created_at: string;
  username?: string;
  profile_picture?: string | null;
}

// Important notification types that require dismissal
const REQUIRES_DISMISSAL = [
  'follow_request',
  'folder_invitation',
  'folder_member_joined',
  'order_created',
  'order_updated',
  'order_shipped',
  'order_delivered',
  'order_cancelled'
];

export default function NotificationsPage() {
  const router = useRouter();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    fetchNotifications();
    // Refresh every 30 seconds
    const interval = setInterval(fetchNotifications, 30000);
    return () => clearInterval(interval);
  }, []);

  const fetchNotifications = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        router.push('/login');
        return;
      }

      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/notifications`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (res.ok) {
        const data = await res.json();
        setNotifications(data.notifications || []);
        setUnreadCount(data.unreadCount || 0);
      }
    } catch (error) {
      console.error('Error fetching notifications:', error);
    } finally {
      setLoading(false);
    }
  };

  const markAsRead = async (id: number) => {
    try {
      const notification = notifications.find(n => n.id === id);
      
      // Important notifications must be dismissed, not just marked as read
      if (notification && REQUIRES_DISMISSAL.includes(notification.type)) {
        await dismissNotification(id);
        return;
      }

      const token = localStorage.getItem('token');
      await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/notifications/${id}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      setNotifications(prev => 
        prev.map(n => n.id === id ? { ...n, read: 1 } : n)
      );
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  const dismissNotification = async (id: number) => {
    try {
      const token = localStorage.getItem('token');
      
      // Get the notification before dismissing to check if it was unread
      const dismissedNotification = notifications.find(n => n.id === id);
      
      // Optimistically update UI immediately
      setNotifications(prev => 
        prev.map(n => n.id === id ? { ...n, dismissed: 1, read: 1 } : n)
      );
      
      // Update unread count if it was unread
      if (dismissedNotification && dismissedNotification.read === 0) {
        setUnreadCount(prev => Math.max(0, prev - 1));
      }
      
      // Actually dismiss on server
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/notifications/${id}`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (!res.ok) {
        // If dismissal failed, re-fetch to restore state
        fetchNotifications();
        alert('Failed to dismiss notification. Please try again.');
      }
    } catch (error) {
      console.error('Error dismissing notification:', error);
      // Re-fetch to restore state on error
      fetchNotifications();
      alert('Error dismissing notification. Please try again.');
    }
  };

  const deleteNotification = async (id: number) => {
    try {
      const token = localStorage.getItem('token');
      
      // Get the notification before deleting to check if it was unread
      const deletedNotification = notifications.find(n => n.id === id);
      
      // Optimistically remove from UI immediately
      setNotifications(prev => prev.filter(n => n.id !== id));
      
      // Update unread count if it was unread and not dismissed
      if (deletedNotification && deletedNotification.read === 0 && (deletedNotification.dismissed === 0 || !deletedNotification.dismissed)) {
        setUnreadCount(prev => Math.max(0, prev - 1));
      }
      
      // Actually delete from server
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/notifications/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (!res.ok) {
        // If deletion failed, restore the notification
        const errorText = await res.text();
        console.error('Failed to delete notification:', errorText);
        // Re-fetch to restore state
        fetchNotifications();
        alert('Failed to delete notification. Please try again.');
      }
    } catch (error) {
      console.error('Error deleting notification:', error);
      // Re-fetch to restore state on error
      fetchNotifications();
      alert('Error deleting notification. Please try again.');
    }
  };

  const handleFollowRequest = async (followerId: number, action: 'accept' | 'reject') => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/notifications`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ followerId, action })
      });

      if (res.ok) {
        // Dismiss the notification (it will stay visible but won't count toward badge)
        const notification = notifications.find(n => 
          n.type === 'follow_request' && n.related_id === followerId
        );
        if (notification) {
          await dismissNotification(notification.id);
        }
        // Refresh notifications to show the follow_accepted notification
        setTimeout(fetchNotifications, 500);
      }
    } catch (error) {
      console.error('Error handling follow request:', error);
    }
  };

  const handleFolderInvitation = async (invitationId: number, action: 'accept' | 'decline') => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/invitations/${invitationId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ action })
      });

      if (res.ok) {
        // Dismiss the notification (it will stay visible but won't count toward badge)
        const notification = notifications.find(n => 
          n.type === 'folder_invitation' && n.related_id === invitationId
        );
        if (notification) {
          await dismissNotification(notification.id);
        }
        
        if (action === 'accept') {
          // Refresh notifications to show any new notifications
          setTimeout(fetchNotifications, 500);
        }
      } else {
        const error = await res.json();
        alert(error.error || 'Failed to respond to invitation');
      }
    } catch (error) {
      console.error('Error handling folder invitation:', error);
      alert('Failed to respond to invitation. Please try again.');
    }
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'follow':
      case 'follow_request':
        return <UserPlus size={20} />;
      case 'follow_accepted':
        return <Check size={20} />;
      case 'like':
        return <Heart size={20} />;
      case 'comment':
        return <MessageCircle size={20} />;
      default:
        return <Bell size={20} />;
    }
  };

  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const seconds = Math.floor(diff / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 0) return `${days}d ago`;
    if (hours > 0) return `${hours}h ago`;
    if (minutes > 0) return `${minutes}m ago`;
    return 'just now';
  };

  return (
    <ThreePanelLayout
      leftPanel={<GlobalNavSidebar />}
      centerPanel={
        <CenterPanel>
          <PanelHeader
            title="Notifications"
            actions={
              unreadCount > 0 && (
                <Badge variant="primary" size="sm">
                  {unreadCount} new
                </Badge>
              )
            }
          />
          <PanelContent>
            <div className="max-w-4xl mx-auto px-6 py-6">
              {loading ? (
                <div className="flex items-center justify-center py-20">
                  <div className="animate-spin w-8 h-8 border-2 border-blue-400 border-t-transparent rounded-full"></div>
                </div>
              ) : notifications.length === 0 ? (
                <EmptyState
                  icon={<Bell size={48} />}
                  title="No notifications"
                  description="You're all caught up!"
                />
              ) : (
                <div className="space-y-3">
                  {notifications.map((notification) => (
                    <Card
                      key={notification.id}
                      padding="md"
                      className={notification.read === 0 ? 'border-l-4' : ''}
                      style={{
                        borderLeftColor: notification.read === 0 ? DS.colors.primary.blue : 'transparent'
                      }}
                    >
                      <div className="flex items-start gap-4">
                        <div 
                          className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0"
                          style={{ backgroundColor: DS.colors.primary.blue + '20', color: DS.colors.primary.blue }}
                        >
                          {notification.profile_picture ? (
                            <img
                              src={`/api/users/profile-picture/${notification.profile_picture}`}
                              alt={notification.username || ''}
                              className="w-full h-full rounded-full object-cover"
                              onError={(e) => {
                                e.currentTarget.style.display = 'none';
                                const parent = e.currentTarget.parentElement;
                                if (parent) {
                                  parent.textContent = notification.username?.[0]?.toUpperCase() || '?';
                                }
                              }}
                            />
                          ) : (
                            getNotificationIcon(notification.type)
                          )}
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-4">
                            <div className="flex-1">
                              <p className="text-sm" style={{ color: DS.colors.text.primary }}>
                                {notification.message}
                              </p>
                              <p className="text-xs mt-1" style={{ color: DS.colors.text.tertiary }}>
                                {formatTimeAgo(notification.created_at)}
                              </p>
                            </div>

                            <div className="flex items-center gap-2 flex-shrink-0">
                              {/* Folder Invitation Actions */}
                              {notification.type === 'folder_invitation' && notification.related_id && 
                               (notification.dismissed === 0 || !notification.dismissed) && (
                                <>
                                  <Button
                                    variant="primary"
                                    size="sm"
                                    icon={<Check size={14} />}
                                    onClick={() => handleFolderInvitation(notification.related_id!, 'accept')}
                                  >
                                    Accept
                                  </Button>
                                  <Button
                                    variant="secondary"
                                    size="sm"
                                    icon={<X size={14} />}
                                    onClick={() => handleFolderInvitation(notification.related_id!, 'decline')}
                                  >
                                    Decline
                                  </Button>
                                </>
                              )}

                              {/* Follow Request Actions */}
                              {notification.type === 'follow_request' && notification.related_id && 
                               (notification.dismissed === 0 || !notification.dismissed) && (
                                <>
                                  <Button
                                    variant="primary"
                                    size="sm"
                                    icon={<Check size={14} />}
                                    onClick={() => handleFollowRequest(notification.related_id!, 'accept')}
                                  >
                                    Accept
                                  </Button>
                                  <Button
                                    variant="secondary"
                                    size="sm"
                                    icon={<X size={14} />}
                                    onClick={() => handleFollowRequest(notification.related_id!, 'reject')}
                                  >
                                    Decline
                                  </Button>
                                </>
                              )}

                              {/* Dismiss button for other important notifications that require dismissal */}
                              {REQUIRES_DISMISSAL.includes(notification.type) && 
                               notification.type !== 'folder_invitation' &&
                               notification.type !== 'follow_request' &&
                               (notification.dismissed === 0 || !notification.dismissed) && (
                                <Button
                                  variant="secondary"
                                  size="sm"
                                  onClick={() => dismissNotification(notification.id)}
                                >
                                  Dismiss
                                </Button>
                              )}

                              {/* Show mark as read for non-important notifications or already dismissed ones */}
                              {notification.read === 0 && 
                               (!REQUIRES_DISMISSAL.includes(notification.type) || notification.dismissed === 1) && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => markAsRead(notification.id)}
                                >
                                  Mark read
                                </Button>
                              )}

                              {/* Delete button - only show for non-dismissible notifications or already dismissed ones */}
                              {(!REQUIRES_DISMISSAL.includes(notification.type) || notification.dismissed === 1) && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => deleteNotification(notification.id)}
                                >
                                  ×
                                </Button>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          </PanelContent>
        </CenterPanel>
      }
    />
  );
}
