'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';

export default function NotificationsDropdown() {
  const [notifications, setNotifications] = useState<any[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchNotifications();
    // Poll for new notifications every 30 seconds
    const interval = setInterval(fetchNotifications, 30000);
    return () => clearInterval(interval);
  }, []);

  // Mark all as read when dropdown is opened and there are unread notifications
  useEffect(() => {
    if (isOpen && unreadCount > 0) {
      markAsRead();
    }
  }, [isOpen]);

  useEffect(() => {
    // Close dropdown when clicking outside
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const fetchNotifications = async () => {
    try {
      const res = await fetch('/api/notifications', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      if (res.ok) {
        const data = await res.json();
        setNotifications(data.notifications);
        setUnreadCount(data.unread_count);
      }
    } catch (err) {
      console.error('Failed to fetch notifications:', err);
    }
  };

  const markAsRead = async (notificationId?: number) => {
    try {
      await fetch('/api/notifications', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          notification_id: notificationId,
          mark_all: !notificationId
        })
      });
      fetchNotifications();
      // Notify that notifications were read (no need for event, fetchNotifications updates the badge)
    } catch (err) {
      console.error('Failed to mark as read:', err);
    }
  };

  const handleFollowRequest = async (followerId: number, action: 'accept' | 'reject', notificationId: number) => {
    try {
      const res = await fetch('/api/users/follow-request', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ followerId, action })
      });

      if (res.ok) {
        // Remove the notification from UI after successful API call
        setNotifications(prev => prev.filter(n => n.id !== notificationId));
        // Update unread count only if notification was unread
        const notif = notifications.find(n => n.id === notificationId);
        if (notif && !notif.read) {
          setUnreadCount(prev => Math.max(0, prev - 1));
        }
      } else {
        console.error('Failed to handle follow request');
      }
    } catch (err) {
      console.error('Failed to handle follow request:', err);
    }
  };

  const getNotificationLink = (notification: any) => {
    if (notification.type === 'follow') {
      // Link to the user's profile who followed
      return `/profile/${notification.related_id}`; // This would need username, but we have ID
    } else if (notification.type === 'message') {
      return `/messages`;
    }
    return '#';
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 text-gray-300 hover:text-white transition"
      >
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
        </svg>
        {unreadCount > 0 && (
          <span className="absolute top-0 right-0 bg-red-500 text-white text-xs w-5 h-5 rounded-full flex items-center justify-center">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 bg-gray-800 border border-gray-700 rounded-lg shadow-xl max-h-96 overflow-hidden flex flex-col z-50">
          <div className="p-3 border-b border-gray-700 flex items-center justify-between">
            <h3 className="font-bold">Notifications</h3>
            {unreadCount > 0 && (
              <button
                onClick={() => markAsRead()}
                className="text-xs text-blue-400 hover:text-blue-300"
              >
                Mark all as read
              </button>
            )}
          </div>

          <div className="flex-1 overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="p-4 text-center text-gray-400 text-sm">
                No notifications yet
              </div>
            ) : (
              notifications.map((notif) => {
                const isFollowRequest = notif.type === 'follow_request';
                
                if (isFollowRequest) {
                  // Render follow request with accept/decline buttons
                  return (
                    <div
                      key={notif.id}
                      className={`p-3 border-b border-gray-700 ${
                        !notif.read ? 'bg-gray-750' : ''
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <div className="flex-shrink-0">
                          <svg className="w-5 h-5 text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                          </svg>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm text-white">{notif.message}</p>
                          <p className="text-xs text-gray-400 mt-1">
                            {new Date(notif.created_at).toLocaleDateString()} at{' '}
                            {new Date(notif.created_at).toLocaleTimeString()}
                          </p>
                          <div className="flex gap-2 mt-2">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleFollowRequest(notif.related_id, 'accept', notif.id);
                              }}
                              className="px-3 py-1 bg-blue-600 hover:bg-blue-700 rounded text-xs font-medium transition"
                            >
                              Accept
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleFollowRequest(notif.related_id, 'reject', notif.id);
                              }}
                              className="px-3 py-1 bg-gray-700 hover:bg-gray-600 rounded text-xs font-medium transition"
                            >
                              Decline
                            </button>
                          </div>
                        </div>
                        {!notif.read && (
                          <div className="flex-shrink-0">
                            <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                }

                // Regular notification with link
                return (
                  <Link
                    key={notif.id}
                    href={getNotificationLink(notif)}
                    onClick={() => {
                      if (!notif.read) markAsRead(notif.id);
                      setIsOpen(false);
                    }}
                    className={`block p-3 border-b border-gray-700 hover:bg-gray-700 transition ${
                      !notif.read ? 'bg-gray-750' : ''
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <div className="flex-shrink-0">
                        {notif.type === 'follow' ? (
                          <svg className="w-5 h-5 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                          </svg>
                        ) : notif.type === 'message' ? (
                          <svg className="w-5 h-5 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                          </svg>
                        ) : (
                          <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                          </svg>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-white">{notif.message}</p>
                        <p className="text-xs text-gray-400 mt-1">
                          {new Date(notif.created_at).toLocaleDateString()} at{' '}
                          {new Date(notif.created_at).toLocaleTimeString()}
                        </p>
                      </div>
                      {!notif.read && (
                        <div className="flex-shrink-0">
                          <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                        </div>
                      )}
                    </div>
                  </Link>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
