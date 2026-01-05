'use client';

import { useState } from 'react';
import { apiFetch } from '@/lib/apiClient';
import {
  Zap,
  Users,
  Shield,
  Globe,
  TrendingUp,
  GitBranch,
  Mail,
  CheckCircle2,
  Loader2,
} from 'lucide-react';

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
};

export default function ComingSoonPage() {
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');
  const [position, setPosition] = useState<number | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess(false);

    try {
      const data = await apiFetch('/api/waitlist', {
        method: 'POST',
        body: JSON.stringify({
          email,
          name: name || undefined,
          source: 'website',
        }),
      });

      setSuccess(true);
      setPosition(data.position);
      setEmail('');
      setName('');
    } catch (err: any) {
      setError(err.message || 'Failed to join waiting list. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const features = [
    {
      icon: Users,
      title: 'Real-time collaboration',
      description: 'Work together on CAD projects with your team',
    },
    {
      icon: Zap,
      title: 'Cloud-native performance',
      description: 'Lightning-fast file processing and rendering',
    },
    {
      icon: Shield,
      title: 'Secure access control',
      description: 'Enterprise-grade security and permissions',
    },
    {
      icon: Globe,
      title: 'Global marketplace',
      description: 'Buy and sell 3D models worldwide',
    },
    {
      icon: GitBranch,
      title: 'Versioning & history',
      description: 'Track changes and manage project versions',
    },
    {
      icon: TrendingUp,
      title: 'Analytics & insights',
      description: 'Detailed analytics for your designs',
    },
  ];

  return (
    <div
      className="min-h-screen"
      style={{ backgroundColor: colors.bgPrimary, color: colors.textPrimary }}
    >
      {/* Hero Section */}
      <div className="relative overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24 sm:py-32">
          <div className="text-center">
            <h1
              className="text-5xl sm:text-6xl md:text-7xl font-bold mb-6"
              style={{ color: colors.textPrimary }}
            >
              BlueprintCAD
            </h1>
            <p
              className="text-xl sm:text-2xl mb-4"
              style={{ color: colors.textSecondary }}
            >
              Professional CAD Collaboration Platform
            </p>
            <p
              className="text-lg mb-12 max-w-2xl mx-auto"
              style={{ color: colors.textMuted }}
            >
              Coming soon. Join the waiting list to be notified when we launch
              and get early access to exclusive features.
            </p>

            {/* Signup Form */}
            <div className="max-w-md mx-auto">
              {success ? (
                <div
                  className="p-6 rounded-lg border"
                  style={{
                    backgroundColor: colors.bgPanel,
                    borderColor: colors.success,
                  }}
                >
                  <div className="flex items-center gap-3 mb-2">
                    <CheckCircle2 size={24} style={{ color: colors.success }} />
                    <h3 className="text-lg font-semibold" style={{ color: colors.textPrimary }}>
                      You're on the list!
                    </h3>
                  </div>
                  <p style={{ color: colors.textSecondary }}>
                    {position
                      ? `You're #${position} on the waiting list. We'll notify you when we launch!`
                      : "We'll notify you when we launch!"}
                  </p>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="Enter your email"
                      required
                      className="w-full px-4 py-3 rounded-lg border"
                      style={{
                        backgroundColor: colors.bgPanel,
                        borderColor: colors.border,
                        color: colors.textPrimary,
                      }}
                    />
                  </div>
                  <div>
                    <input
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Your name (optional)"
                      className="w-full px-4 py-3 rounded-lg border"
                      style={{
                        backgroundColor: colors.bgPanel,
                        borderColor: colors.border,
                        color: colors.textPrimary,
                      }}
                    />
                  </div>
                  {error && (
                    <p className="text-sm" style={{ color: '#EF4444' }}>
                      {error}
                    </p>
                  )}
                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full px-6 py-3 rounded-lg font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                    style={{
                      backgroundColor: colors.accentBlue,
                      color: '#ffffff',
                    }}
                  >
                    {loading ? (
                      <>
                        <Loader2 size={20} className="animate-spin" />
                        Joining...
                      </>
                    ) : (
                      <>
                        <Mail size={20} />
                        Join Waiting List
                      </>
                    )}
                  </button>
                </form>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Features Section */}
      <div
        className="py-24"
        style={{ backgroundColor: colors.bgSecondary }}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2
            className="text-3xl font-bold text-center mb-12"
            style={{ color: colors.textPrimary }}
          >
            What to Expect
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((feature, index) => {
              const Icon = feature.icon;
              return (
                <div
                  key={index}
                  className="p-6 rounded-lg border"
                  style={{
                    backgroundColor: colors.bgPanel,
                    borderColor: colors.border,
                  }}
                >
                  <div
                    className="w-12 h-12 rounded-lg flex items-center justify-center mb-4"
                    style={{ backgroundColor: `${colors.accentBlue}20` }}
                  >
                    <Icon size={24} style={{ color: colors.accentBlue }} />
                  </div>
                  <h3
                    className="text-xl font-semibold mb-2"
                    style={{ color: colors.textPrimary }}
                  >
                    {feature.title}
                  </h3>
                  <p style={{ color: colors.textSecondary }}>
                    {feature.description}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Footer */}
      <div
        className="py-8 border-t"
        style={{
          backgroundColor: colors.bgPrimary,
          borderColor: colors.border,
        }}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <p style={{ color: colors.textMuted }}>
            © {new Date().getFullYear()} BlueprintCAD. All rights reserved.
          </p>
        </div>
      </div>
    </div>
  );
}

