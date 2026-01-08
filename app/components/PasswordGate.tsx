'use client';

import { useState, useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { Lock, Eye, EyeOff } from 'lucide-react';
import ComingSoonPage from '@/app/coming-soon/page';

const ADMIN_PASSWORD = 'thorbeans1';

const colors = {
  bgPrimary: '#0E1116',
  bgSecondary: '#151A22',
  bgPanel: '#1B2230',
  accentBlue: '#3B82F6',
  accentCyan: '#22D3EE',
  textPrimary: '#E5E7EB',
  textSecondary: '#9CA3AF',
  textMuted: '#6B7280',
  border: '#243042',
  success: '#22C55E',
  error: '#EF4444',
};

export default function PasswordGate({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check if already authenticated
    const authStatus = localStorage.getItem('site_access_granted');
    const adminStatus = localStorage.getItem('is_admin');
    if (authStatus === 'true') {
      setIsAuthenticated(true);
      if (adminStatus === 'true') {
        setIsAdmin(true);
      }
    }
    setLoading(false);
  }, []);

  // No redirects needed - we'll render the coming-soon page directly for non-allowed routes

  // Always allow privacy and contact pages
  if (pathname === '/privacy' || pathname === '/contact') {
    return <>{children}</>;
  }

  // Show loading state
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: colors.bgPrimary }}>
        <div className="w-8 h-8 border-4 border-blue-500/20 border-t-blue-500 rounded-full animate-spin"></div>
      </div>
    );
  }

  // Handle admin routes
  if (pathname === '/admin' || pathname.startsWith('/admin/')) {
    // If authenticated as admin, allow access
    if (isAuthenticated && isAdmin) {
      return <>{children}</>;
    }
    // If not authenticated, show password gate
    if (!isAuthenticated) {
      return (
        <div
          className="min-h-screen flex items-center justify-center px-4"
          style={{ backgroundColor: colors.bgPrimary }}
        >
          <div className="max-w-md w-full">
            <div
              className="p-8 rounded-xl border"
              style={{
                backgroundColor: colors.bgPanel,
                borderColor: colors.border,
              }}
            >
              {/* Header */}
              <div className="text-center mb-8">
                <div
                  className="w-16 h-16 mx-auto mb-4 rounded-full flex items-center justify-center"
                  style={{ backgroundColor: `${colors.accentBlue}20` }}
                >
                  <Lock size={32} style={{ color: colors.accentBlue }} />
                </div>
                <h1
                  className="text-3xl font-bold mb-2"
                  style={{ color: colors.textPrimary }}
                >
                  BlueprintCAD
                </h1>
                <p
                  className="text-lg"
                  style={{ color: colors.textSecondary }}
                >
                  Admin Access Required
                </p>
              </div>

              {/* Password Form */}
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  if (password === ADMIN_PASSWORD) {
                    // Admin authentication
                    localStorage.setItem('site_access_granted', 'true');
                    localStorage.setItem('is_admin', 'true');
                    setIsAuthenticated(true);
                    setIsAdmin(true);
                    setError('');
                    // Redirect admin to /admin
                    router.push('/admin');
                  } else {
                    setError('Incorrect password. Please try again.');
                    setPassword('');
                  }
                }}
                className="space-y-4"
              >
                <div>
                  <label
                    className="block text-sm font-medium mb-2"
                    style={{ color: colors.textPrimary }}
                  >
                    Admin Password
                  </label>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => {
                        setPassword(e.target.value);
                        setError('');
                      }}
                      placeholder="Enter admin password"
                      className="w-full px-4 py-3 pr-12 rounded-lg border"
                      style={{
                        backgroundColor: colors.bgSecondary,
                        borderColor: error ? colors.error : colors.border,
                        color: colors.textPrimary,
                      }}
                      autoFocus
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2"
                      style={{ color: colors.textMuted }}
                    >
                      {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                    </button>
                  </div>
                  {error && (
                    <p className="text-sm mt-2" style={{ color: colors.error }}>
                      {error}
                    </p>
                  )}
                </div>

                <button
                  type="submit"
                  className="w-full px-6 py-3 rounded-lg font-semibold transition-all"
                  style={{
                    backgroundColor: colors.accentBlue,
                    color: '#ffffff',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.opacity = '0.9';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.opacity = '1';
                  }}
                >
                  Access Admin
                </button>
              </form>
            </div>
          </div>
        </div>
      );
    }
  }

  // If authenticated as admin but on non-admin route, redirect to /admin
  if (isAuthenticated && isAdmin) {
    router.replace('/admin');
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: colors.bgPrimary }}>
        <div className="w-8 h-8 border-4 border-blue-500/20 border-t-blue-500 rounded-full animate-spin"></div>
      </div>
    );
  }

  // For all other routes (including /, /coming-soon, /this, /that, etc.), show coming-soon page
  return <ComingSoonPage />;
}


