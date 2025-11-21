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
} from 'lucide-react';

interface NavItem {
  id: string;
  label: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
  href: string;
  badge?: number;
}

const baseNavItems: NavItem[] = [
  { id: 'dashboard', label: 'Dashboard', icon: Home, href: '/dashboard' },
  { id: 'explore', label: 'Explore', icon: Compass, href: '/explore' },
  { id: 'marketplace', label: 'Marketplace', icon: ShoppingCart, href: '/marketplace' },
  { id: 'forums', label: 'Forums', icon: MessageSquare, href: '/forum' },
  { id: 'quote', label: 'Quote Tool', icon: Calculator, href: '/quote' },
  { id: 'folders', label: 'Folders', icon: Folder, href: '/folders' },
  { id: 'cad', label: 'CAD Editor', icon: Box, href: '/cad-editor' },
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

  useEffect(() => {
    const userData = localStorage.getItem('user');
    if (userData) {
      try {
        const user = JSON.parse(userData);
        setUsername(user.username);
      } catch {
        // Ignore parse errors
      }
    }
  }, []);

  // Update profile href with username if available
  const navItems = baseNavItems.map(item => {
    if (item.id === 'profile') {
      return { ...item, href: username ? `/profile/${username}` : '/profile' };
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
        className="flex-shrink-0 px-4 py-6 flex items-center justify-between border-b"
        style={{ borderColor: DS.colors.border.subtle }}
      >
        {!leftPanelCollapsed ? (
          <Link href="/dashboard" className="flex items-center gap-3 group">
            <div
              className="w-8 h-8 rounded-lg flex items-center justify-center font-bold text-white transition-all"
              style={{ backgroundColor: DS.colors.primary.blue }}
            >
              B
            </div>
            <span
              className="text-xl font-bold transition-colors"
              style={{ color: DS.colors.text.primary }}
            >
              Blueprint
            </span>
          </Link>
        ) : (
          <div
            className="w-8 h-8 rounded-lg flex items-center justify-center font-bold text-white mx-auto"
            style={{ backgroundColor: DS.colors.primary.blue }}
          >
            B
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
                        className="px-2 py-0.5 text-xs font-semibold rounded-full"
                        style={{
                          backgroundColor: DS.colors.accent.cyan,
                          color: DS.colors.text.inverse,
                        }}
                      >
                        {item.badge}
                      </span>
                    )}
                  </>
                )}
                {leftPanelCollapsed && item.badge && (
                  <span
                    className="absolute top-1 right-1 w-2 h-2 rounded-full"
                    style={{ backgroundColor: DS.colors.accent.cyan }}
                  />
                )}
              </Link>
            );
          })}
        </div>
      </nav>

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
