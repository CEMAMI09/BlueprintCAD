/**
 * Global Navigation Sidebar
 * Permanent left panel navigation for all internal pages
 */

'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { DesignSystem as DS } from '@/backend/lib/ui/design-system';
import { useLayout } from './ThreePanelLayout';
import {
  Home,
  Compass,
  ShoppingCart,
  MessageSquare,
  Calculator,
  Folder,
  Box,
  Mail,
  Bell,
  User,
  Settings,
  HelpCircle,
  ChevronLeft,
  ChevronRight,
  LogOut,
} from 'lucide-react';

interface NavItem {
  id: string;
  label: string;
  icon: React.ElementType;
  href: string;
  badge?: number | string;
}

const baseNavItems: NavItem[] = [
  { id: 'dashboard', label: 'Dashboard', icon: Home, href: '/dashboard' },
  { id: 'explore', label: 'Explore', icon: Compass, href: '/explore' },
  { id: 'marketplace', label: 'Marketplace', icon: ShoppingCart, href: '/marketplace' },
  { id: 'forums', label: 'Forums', icon: MessageSquare, href: '/forum' },
  { id: 'quote', label: 'Quote Tool', icon: Calculator, href: '/quote' },
  { id: 'folders', label: 'Folders', icon: Folder, href: '/folders' },
  { id: 'messages', label: 'Messages', icon: Mail, href: '/messages' },
  { id: 'notifications', label: 'Notifications', icon: Bell, href: '/notifications' },
  { id: 'profile', label: 'Profile', icon: User, href: '/profile' },
  { id: 'settings', label: 'Settings', icon: Settings, href: '/settings' },
  { id: 'support', label: 'Support', icon: HelpCircle, href: '/support' },
];

export function GlobalNavSidebar() {
  const pathname = usePathname();
  const { leftPanelCollapsed, toggleLeftPanel } = useLayout();
  const [username, setUsername] = useState<string | null>(null);
  const [unreadNotifications, setUnreadNotifications] = useState(0);
  const [unreadMessages, setUnreadMessages] = useState(0);

  useEffect(() => {
    const checkUser = () => {
      const userData = localStorage.getItem('user');
      if (userData) {
        try {
          const user = JSON.parse(userData);
          setUsername(user.username);
        } catch {
          setUsername(null);
        }
      } else {
        setUsername(null);
      }
    };

    checkUser();
    const handleUserChange = () => checkUser();
    window.addEventListener('userChanged', handleUserChange);
    window.addEventListener('storage', handleUserChange);

    return () => {
      window.removeEventListener('userChanged', handleUserChange);
      window.removeEventListener('storage', handleUserChange);
    };
  }, []);

  useEffect(() => {
    if (!username) {
      setUnreadNotifications(0);
      setUnreadMessages(0);
      return;
    }

    const fetchUnreadCounts = async () => {
      try {
        const token = localStorage.getItem('token');
        if (!token) return;

        // Fetch unread notifications
        const notificationsRes = await fetch('/api/notifications', {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (notificationsRes.ok) {
          const notificationsData = await notificationsRes.json();
          const count = notificationsData.unreadCount || 0;
          console.log('[GlobalNavSidebar] Unread notifications:', count);
          setUnreadNotifications(count);
        }

        // Fetch unread messages
        const messagesRes = await fetch('/api/messages/unread', {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (messagesRes.ok) {
          const messagesData = await messagesRes.json();
          const count = messagesData.count || 0;
          console.log('[GlobalNavSidebar] Unread messages:', count);
          setUnreadMessages(count);
        }
      } catch (error) {
        console.error('Error fetching unread counts:', error);
      }
    };

    fetchUnreadCounts();
    // Refresh every 30 seconds
    const interval = setInterval(fetchUnreadCounts, 30000);
    return () => clearInterval(interval);
  }, [username]);

  const handleLogout = () => {
    localStorage.clear();
    setUsername(null);
    window.dispatchEvent(new Event('userChanged'));
    window.dispatchEvent(new Event('storage'));
    window.location.href = '/';
  };

  // Update profile href with username if available and add unread indicators
  const navItems = baseNavItems.map(item => {
    if (item.id === 'profile') {
      return { ...item, href: username ? `/profile/${username}` : '/profile' };
    }
    // Show badge on Messages and Notifications tabs
    if (item.id === 'messages') {
      const badge = unreadMessages > 0 ? (unreadMessages > 9 ? '9+' : unreadMessages) : undefined;
      console.log('[GlobalNavSidebar] Messages badge:', badge, 'unreadMessages:', unreadMessages);
      return { ...item, badge };
    }
    if (item.id === 'notifications') {
      const badge = unreadNotifications > 0 ? (unreadNotifications > 9 ? '9+' : unreadNotifications) : undefined;
      console.log('[GlobalNavSidebar] Notifications badge:', badge, 'unreadNotifications:', unreadNotifications);
      return { ...item, badge };
    }
    return item;
  });

  const isActive = (href: string) => {
    if (href === '/dashboard') return pathname === '/dashboard';
    if (href.startsWith('/profile')) return pathname?.startsWith('/profile');
    return pathname?.startsWith(href);
  };

  return (
    <div className="h-full flex flex-col" style={{ backgroundColor: DS.colors.background.panel }}>
      {/* Logo / Brand */}
      <div
        className="flex-shrink-0 flex items-center border-b"
        style={{
          borderColor: DS.colors.border.subtle,
          height: '90px',
          minHeight: '90px',
          padding: '0',
          margin: '0',
          lineHeight: '1',
          minWidth: 90,
          justifyContent: 'flex-start',
          transition: 'padding 0.2s ease, justify-content 0.2s ease',
          overflow: 'visible',
        }}
      >
        {!leftPanelCollapsed ? (
          <Link
            href="/dashboard"
            className="flex items-center group"
            style={{ padding: '0', margin: '0', lineHeight: '1', width: '100%', justifyContent: 'flex-start', display: 'flex' }}
          >
            <img
              src="/bpcube2.png"
              alt="Blueprint Logo"
              className="logo-image"
              style={{ flexShrink: 0, objectFit: 'contain', display: 'block' }}
            />
          </Link>
        ) : (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'flex-start',
              width: '100%',
              padding: '0',
              margin: '0',
              lineHeight: '1',
              overflow: 'visible',
            }}
          >
            <img
              src="/bpcube2.png"
              alt="Blueprint Logo"
              className="logo-image"
              style={{ flexShrink: 0, objectFit: 'contain', display: 'block' }}
            />
          </div>
        )}
      </div>

      {/* Navigation Items */}
      <nav className="flex-1 overflow-y-auto py-4 px-2">
        <div className="space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.href);

            return (
              <Link
                key={item.id}
                href={item.href}
                className="group relative flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200"
                style={{
                  backgroundColor: active ? DS.colors.primary.blue : 'transparent',
                  color: active ? '#ffffff' : DS.colors.text.secondary,
                }}
                onMouseEnter={(e) => {
                  if (!active) {
                    e.currentTarget.style.backgroundColor = DS.colors.background.panelHover;
                    e.currentTarget.style.color = DS.colors.text.primary;
                  }
                }}
                onMouseLeave={(e) => {
                  if (!active) {
                    e.currentTarget.style.backgroundColor = 'transparent';
                    e.currentTarget.style.color = DS.colors.text.secondary;
                  }
                }}
              >
                <Icon size={20} className="flex-shrink-0" />
                {!leftPanelCollapsed && (
                  <>
                    <span className="flex-1 text-sm font-medium">{item.label}</span>
                    {item.badge && (
                      <span
                        className="px-2 py-0.5 text-xs font-semibold rounded-full min-w-[20px] text-center"
                        style={{
                          backgroundColor: DS.colors.primary.blue,
                          color: '#ffffff',
                        }}
                      >
                        {item.badge}
                      </span>
                    )}
                  </>
                )}
                {/* Blue badge indicator for unread items when collapsed */}
                {leftPanelCollapsed && item.badge && (
                  <span
                    className="absolute top-1 right-1 px-1.5 py-0.5 text-[10px] font-semibold rounded-full min-w-[16px] text-center"
                    style={{
                      backgroundColor: DS.colors.primary.blue,
                      color: '#ffffff',
                    }}
                  >
                    {typeof item.badge === 'number' && item.badge > 9 ? '9+' : item.badge}
                  </span>
                )}
              </Link>
            );
          })}
        </div>
      </nav>

      {/* User Section & Logout */}
      {username && (
        <div
          className="flex-shrink-0 p-4 border-t"
          style={{ borderColor: DS.colors.border.subtle }}
        >
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200"
            style={{
              backgroundColor: DS.colors.background.panelHover,
              color: DS.colors.text.secondary,
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = DS.colors.background.elevated;
              e.currentTarget.style.color = DS.colors.accent.error;
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = DS.colors.background.panelHover;
              e.currentTarget.style.color = DS.colors.text.secondary;
            }}
          >
            <LogOut size={20} />
            {!leftPanelCollapsed && (
              <span className="text-sm font-medium">Logout</span>
            )}
          </button>
        </div>
      )}

      {/* Collapse Toggle */}
      <div
        className="flex-shrink-0 p-4 border-t"
        style={{ borderColor: DS.colors.border.subtle }}
      >
        <button
          onClick={toggleLeftPanel}
          className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg transition-all duration-200"
          style={{
            backgroundColor: DS.colors.background.panelHover,
            color: DS.colors.text.secondary,
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = DS.colors.background.elevated;
            e.currentTarget.style.color = DS.colors.text.primary;
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = DS.colors.background.panelHover;
            e.currentTarget.style.color = DS.colors.text.secondary;
          }}
        >
          {leftPanelCollapsed ? (
            <ChevronRight size={20} />
          ) : (
            <>
              <ChevronLeft size={20} />
              <span className="text-sm font-medium">Collapse</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
}
