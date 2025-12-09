'use client';

import InvitationsNotification from '@/components/InvitationsNotification';
import NotificationsDropdown from '@/components/NotificationsDropdown';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';

export default function Navbar() {
  const router = useRouter();
  const pathname = usePathname();
  const [user, setUser] = useState<any>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [unreadMessageCount, setUnreadMessageCount] = useState(0);

  useEffect(() => {
    // Check if user is logged in
    const checkUser = () => {
      const userData = localStorage.getItem('user');
      if (userData) {
        setUser(JSON.parse(userData));
      } else {
        setUser(null);
      }
    };

    checkUser();

    // Listen for custom login event
    const handleUserChange = () => checkUser();
    window.addEventListener('userChanged', handleUserChange);
    window.addEventListener('storage', handleUserChange);

    return () => {
      window.removeEventListener('userChanged', handleUserChange);
      window.removeEventListener('storage', handleUserChange);
    };
  }, []);

  // Fetch unread message count
  useEffect(() => {
    if (!user) {
      setUnreadMessageCount(0);
      return;
    }

    const fetchUnreadCount = async () => {
      try {
        const res = await fetch('/api/messages', {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          }
        });
        if (res.ok) {
          const conversations = await res.json();
          const total = conversations.reduce((sum: number, conv: any) => sum + (conv.unread_count || 0), 0);
          setUnreadMessageCount(total);
        }
      } catch (err) {
        console.error('Failed to fetch unread messages:', err);
      }
    };

    fetchUnreadCount();
    const interval = setInterval(fetchUnreadCount, 30000); // Poll every 30s
    
    // Listen for messagesRead event to refresh immediately
    const handleMessagesRead = () => fetchUnreadCount();
    window.addEventListener('messagesRead', handleMessagesRead);
    
    return () => {
      clearInterval(interval);
      window.removeEventListener('messagesRead', handleMessagesRead);
    };
  }, [user]);

  const handleLogout = () => {
    localStorage.clear();
    setUser(null);
    setUnreadMessageCount(0);
    window.dispatchEvent(new Event('userChanged'));
    window.dispatchEvent(new Event('storage'));
    // Use window.location for full page reload to clear all state
    window.location.href = '/';
  };

  return (
    <nav className="bg-gray-900 border-b border-gray-800 sticky top-0 z-50" style={{ minHeight: '90px' }}>
      <div className="container mx-auto px-4" style={{ height: '90px', minHeight: '90px', padding: '0', margin: '0', lineHeight: '1' }}>
        <div className="flex items-center justify-between h-full">
          {/* Logo */}
          <Link href="/" className="flex items-center" style={{ padding: '0', margin: '0', lineHeight: '1' }}>
            <img
              src="/bpcube2.png"
              alt="Blueprint Logo"
              className="logo-image"
            />
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden lg:flex items-center space-x-3 flex-1 justify-end">
            <Link href="/explore" className="text-gray-300 hover:text-white transition text-sm">
              Explore
            </Link>
            
            {/* Tools Dropdown */}
            <div className="relative group">
              <button className="text-gray-300 hover:text-white transition flex items-center gap-1 text-sm">
                Tools
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>
              <div className="absolute left-0 mt-2 w-48 bg-gray-800 rounded-lg shadow-xl border border-gray-700 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50">
                <Link href="/assembly-editor" className="block px-4 py-2 text-gray-300 hover:bg-gray-700 hover:text-white transition rounded-t-lg text-sm">
                  📦 Assembly Editor
                </Link>
                <Link href="/drawing-editor" className="block px-4 py-2 text-gray-300 hover:bg-gray-700 hover:text-white transition text-sm">
                  📐 Drawing Editor
                </Link>
                <Link href="/bom-editor" className="block px-4 py-2 text-gray-300 hover:bg-gray-700 hover:text-white transition text-sm">
                  📋 BOM Editor
                </Link>
                <Link href="/quote" className="block px-4 py-2 text-gray-300 hover:bg-gray-700 hover:text-white transition rounded-b-lg text-sm">
                  💰 Get Quote
                </Link>
              </div>
            </div>

            {/* Community Dropdown */}
            <div className="relative group">
              <button className="text-gray-300 hover:text-white transition flex items-center gap-1 text-sm">
                Community
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>
              <div className="absolute left-0 mt-2 w-48 bg-gray-800 rounded-lg shadow-xl border border-gray-700 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50">
                <Link href="/marketplace" className="block px-4 py-2 text-gray-300 hover:bg-gray-700 hover:text-white transition rounded-t-lg text-sm">
                  🛒 Marketplace
                </Link>
                <Link href="/forum" className="block px-4 py-2 text-gray-300 hover:bg-gray-700 hover:text-white transition text-sm">
                  💬 Forum
                </Link>
              </div>
            </div>
            
            {user ? (
              <>
                <Link href="/upload" className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 rounded-lg font-medium transition text-sm whitespace-nowrap">
                  Upload
                </Link>
                <Link href="/messages" className="text-gray-300 hover:text-white transition relative" title="Messages">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                  </svg>
                  {unreadMessageCount > 0 && (
                    <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs font-bold rounded-full h-4 w-4 flex items-center justify-center">
                      {unreadMessageCount > 9 ? '9+' : unreadMessageCount}
                    </span>
                  )}
                </Link>
                <NotificationsDropdown />
                <InvitationsNotification />
                
                {/* User Menu Dropdown */}
                <div className="relative group">
                  <button className="flex items-center gap-1 text-gray-300 hover:text-white transition">
                    {user.profile_picture ? (
                      <img
                        src={`/api/users/profile-picture/${user.profile_picture}`}
                        alt={user.username}
                        className="w-7 h-7 rounded-full object-cover"
                      />
                    ) : (
                      <div className="w-7 h-7 bg-gradient-to-br from-blue-500 to-purple-500 rounded-full flex items-center justify-center text-xs font-bold">
                        {user.username[0].toUpperCase()}
                      </div>
                    )}
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>
                  <div className="absolute right-0 mt-2 w-48 bg-gray-800 rounded-lg shadow-xl border border-gray-700 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50">
                    <Link href={`/profile/${user.username}`} className="block px-4 py-2 text-gray-300 hover:bg-gray-700 hover:text-white transition rounded-t-lg text-sm">
                      👤 Profile
                    </Link>
                    <Link href="/folders" className="block px-4 py-2 text-gray-300 hover:bg-gray-700 hover:text-white transition text-sm">
                      📁 My Folders
                    </Link>
                    <button onClick={handleLogout} className="w-full text-left px-4 py-2 text-gray-300 hover:bg-gray-700 hover:text-white transition rounded-b-lg text-sm">
                      🚪 Logout
                    </button>
                  </div>
                </div>
              </>
            ) : (
              <>
                <Link href="/login" className="text-gray-300 hover:text-white transition text-sm">
                  Login
                </Link>
                <Link href="/register" className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 rounded-lg font-medium transition text-sm whitespace-nowrap">
                  Sign Up
                </Link>
              </>
            )}
          </div>

          {/* Mobile menu button */}
          <button 
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="lg:hidden p-2 rounded-lg hover:bg-gray-800"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
        </div>

        {/* Mobile menu */}
        {mobileMenuOpen && (
          <div className="lg:hidden py-4 border-t border-gray-800">
            <div className="flex flex-col space-y-3">
              <Link href="/explore" className="text-gray-300 hover:text-white transition py-2">
                Explore
              </Link>
              
              <div className="text-gray-400 text-xs font-semibold uppercase pt-2">Tools</div>
              <Link href="/assembly-editor" className="text-gray-300 hover:text-white transition py-2 pl-4">
                📦 Assembly Editor
              </Link>
              <Link href="/drawing-editor" className="text-gray-300 hover:text-white transition py-2 pl-4">
                📐 Drawing Editor
              </Link>
              <Link href="/bom-editor" className="text-gray-300 hover:text-white transition py-2 pl-4">
                📋 BOM Editor
              </Link>
              <Link href="/quote" className="text-gray-300 hover:text-white transition py-2 pl-4">
                💰 Get Quote
              </Link>
              
              <div className="text-gray-400 text-xs font-semibold uppercase pt-2">Community</div>
              <Link href="/marketplace" className="text-gray-300 hover:text-white transition py-2 pl-4">
                🛒 Marketplace
              </Link>
              <Link href="/forum" className="text-gray-300 hover:text-white transition py-2 pl-4">
                💬 Forum
              </Link>
              
              {user && (
                <>
                  <div className="text-gray-400 text-xs font-semibold uppercase pt-2">Account</div>
                  <Link href="/folders" className="text-gray-300 hover:text-white transition py-2 pl-4">
                    📁 My Folders
                  </Link>
                  <Link href="/messages" className="text-gray-300 hover:text-white transition py-2 pl-4">
                    💬 Messages {unreadMessageCount > 0 && `(${unreadMessageCount})`}
                  </Link>
                  <Link href="/upload" className="text-gray-300 hover:text-white transition py-2 pl-4">
                    📤 Upload Design
                  </Link>
                  <Link href={`/profile/${user.username}`} className="text-gray-300 hover:text-white transition py-2 pl-4">
                    👤 Profile
                  </Link>
                  <button onClick={handleLogout} className="text-left text-gray-300 hover:text-white transition py-2 pl-4">
                    🚪 Logout
                  </button>
                </>
              )}
              
              {!user && (
                <>
                  <Link href="/login" className="text-gray-300 hover:text-white transition py-2">
                    Login
                  </Link>
                  <Link href="/register" className="text-gray-300 hover:text-white transition py-2">
                    Sign Up
                  </Link>
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </nav>
  );
}