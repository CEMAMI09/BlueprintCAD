'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Mail, Users, Settings, Shield } from 'lucide-react';

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
};

export default function AdminPage() {
  const router = useRouter();
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const authStatus = localStorage.getItem('site_access_granted');
    const adminStatus = localStorage.getItem('is_admin');
    
    if (authStatus !== 'true' || adminStatus !== 'true') {
      // Not an admin, redirect to coming-soon
      router.replace('/coming-soon');
      return;
    }
    
    setIsAdmin(true);
    setLoading(false);
  }, [router]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: colors.bgPrimary }}>
        <div className="w-8 h-8 border-4 border-blue-500/20 border-t-blue-500 rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!isAdmin) {
    return null;
  }

  const adminLinks = [
    {
      title: 'Email Campaigns',
      description: 'Manage email campaigns and send messages to users',
      href: '/admin/email-campaigns',
      icon: Mail,
      color: colors.accentBlue,
    },
  ];

  return (
    <div className="min-h-screen" style={{ backgroundColor: colors.bgPrimary }}>
      {/* Header */}
      <header className="border-b" style={{ borderColor: colors.border }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-4">
              <Shield size={24} style={{ color: colors.accentBlue }} />
              <h1 className="text-xl font-bold" style={{ color: colors.textPrimary }}>
                Admin Dashboard
              </h1>
            </div>
            <Link
              href="/coming-soon"
              className="text-sm transition-all hover:opacity-80"
              style={{ color: colors.textSecondary }}
            >
              Back to site
            </Link>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="mb-8">
          <h2 className="text-2xl font-bold mb-2" style={{ color: colors.textPrimary }}>
            Welcome, Admin
          </h2>
          <p className="text-base" style={{ color: colors.textSecondary }}>
            Manage your BlueprintCAD administration tasks
          </p>
        </div>

        {/* Admin Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {adminLinks.map((link) => {
            const Icon = link.icon;
            return (
              <Link
                key={link.href}
                href={link.href}
                className="block p-6 rounded-xl border transition-all hover:border-opacity-100"
                style={{
                  backgroundColor: colors.bgPanel,
                  borderColor: colors.border,
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'translateY(-2px)';
                  e.currentTarget.style.borderColor = link.color;
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.borderColor = colors.border;
                }}
              >
                <div
                  className="w-12 h-12 rounded-lg flex items-center justify-center mb-4"
                  style={{ backgroundColor: `${link.color}20` }}
                >
                  <Icon size={24} style={{ color: link.color }} />
                </div>
                <h3 className="text-lg font-semibold mb-2" style={{ color: colors.textPrimary }}>
                  {link.title}
                </h3>
                <p className="text-sm" style={{ color: colors.textSecondary }}>
                  {link.description}
                </p>
              </Link>
            );
          })}
        </div>
      </main>
    </div>
  );
}

