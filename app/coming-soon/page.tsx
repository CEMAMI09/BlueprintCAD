'use client';

import { useState } from 'react';
import { apiFetch } from '@/lib/apiClient';
import {
  Puzzle,
  Monitor,
  DollarSign,
  Handshake,
  Package,
  BarChart3,
  Mail,
  CheckCircle2,
  Loader2,
} from 'lucide-react';
import Link from 'next/link';

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

  const capabilities = [
    {
      icon: Puzzle,
      emoji: '🧩',
      title: 'Organize CAD like software',
      description: 'Version and branch CAD files inside folders so you never lose track of changes.',
    },
    {
      icon: Monitor,
      emoji: '🖥️',
      title: 'Preview designs interactively',
      description: 'Share designs with a live 3D viewer instead of static screenshots.',
    },
    {
      icon: DollarSign,
      emoji: '💰',
      title: 'Sell your work',
      description: 'Create a storefront, list designs, and earn money from downloads.',
    },
    {
      icon: Handshake,
      emoji: '🤝',
      title: 'Collaborate with teams',
      description: 'Invite teammates, set permissions, and work together on projects.',
    },
    {
      icon: Package,
      emoji: '📦',
      title: 'Get instant manufacturing estimates',
      description: 'Upload a model, adjust scale/material, and see price, weight, and print time update live.',
    },
    {
      icon: BarChart3,
      emoji: '📊',
      title: 'Track performance',
      description: 'See views, downloads, revenue, and engagement on your designs.',
    },
  ];

  const builtFor = [
    '3D printing designers and makers',
    'CAD creators selling digital designs',
    'Hardware and product designers',
    'Small teams collaborating on CAD files',
  ];

  return (
    <div
      className="min-h-screen"
      style={{ backgroundColor: colors.bgPrimary, color: colors.textPrimary }}
    >
      {/* Hero Section */}
      <div className="relative overflow-hidden">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-24 sm:py-32">
          <div className="text-center">
            {/* Logo */}
            <div className="mb-8 flex justify-center">
              <Link href="/" className="inline-flex items-center justify-center">
                <img
                  src="/bpcube2.png"
                  alt="Blueprint Logo"
                  className="h-16 w-auto"
                />
              </Link>
            </div>

            {/* Headline */}
            <h1
              className="text-4xl sm:text-5xl md:text-6xl font-bold mb-6 leading-tight"
              style={{ color: colors.textPrimary }}
            >
              BlueprintCAD
            </h1>
            <p
              className="text-2xl sm:text-3xl font-semibold mb-6"
              style={{ color: colors.textPrimary }}
            >
              Version, showcase, and sell CAD designs — all in one place
            </p>

            {/* Subheadline */}
            <p
              className="text-lg sm:text-xl mb-12 max-w-2xl mx-auto leading-relaxed"
              style={{ color: colors.textSecondary }}
            >
              Store CAD files in versioned folders, preview them in an interactive 3D viewer, collaborate with others, and sell your designs through your own storefront.
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
                        Join the waitlist
                      </>
                    )}
                  </button>
                  {/* Supporting microcopy */}
                  <p className="text-sm mt-3" style={{ color: colors.textSecondary }}>
                    Founding members get a launch badge and 1 free month of Creator.
                  </p>
                  <p className="text-xs mt-1" style={{ color: colors.textMuted }}>
                    No spam. Early access only.
                  </p>
                </form>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* What you'll be able to do */}
      <div
        className="py-24"
        style={{ backgroundColor: colors.bgSecondary }}
      >
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2
            className="text-3xl font-bold text-center mb-12"
            style={{ color: colors.textPrimary }}
          >
            What you'll be able to do
          </h2>
          <div className="space-y-6">
            {capabilities.map((capability, index) => {
              const Icon = capability.icon;
              return (
                <div
                  key={index}
                  className="p-6 rounded-lg border flex items-start gap-4"
                  style={{
                    backgroundColor: colors.bgPanel,
                    borderColor: colors.border,
                  }}
                >
                  <div className="text-3xl flex-shrink-0">{capability.emoji}</div>
                  <div className="flex-1">
                    <h3
                      className="text-xl font-semibold mb-2"
                      style={{ color: colors.textPrimary }}
                    >
                      {capability.title}
                    </h3>
                    <p style={{ color: colors.textSecondary }}>
                      {capability.description}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Built for */}
      <div className="py-16">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2
            className="text-2xl font-bold text-center mb-8"
            style={{ color: colors.textPrimary }}
          >
            Built for
          </h2>
          <ul className="space-y-3 max-w-2xl mx-auto mb-6">
            {builtFor.map((item, index) => (
              <li
                key={index}
                className="flex items-center gap-3 text-lg"
                style={{ color: colors.textSecondary }}
              >
                <span style={{ color: colors.accentBlue }}>•</span>
                {item}
              </li>
            ))}
          </ul>
          <p
            className="text-center text-base max-w-2xl mx-auto"
            style={{ color: colors.textMuted }}
          >
            Whether you're publishing free designs or selling premium ones, BlueprintCAD keeps everything in one place.
          </p>
        </div>
      </div>

      {/* Founder credibility */}
      <div
        className="py-16 border-t"
        style={{
          backgroundColor: colors.bgSecondary,
          borderColor: colors.border,
        }}
      >
        <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h3
            className="text-lg font-semibold mb-3"
            style={{ color: colors.textPrimary }}
          >
            Built by an independent creator
          </h3>
          <p
            className="text-base leading-relaxed"
            style={{ color: colors.textSecondary }}
          >
            BlueprintCAD is being built by a solo founder who was tired of sharing CAD files through messy folders, zip files, and marketplaces that don't understand versioning.
          </p>
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
            © {new Date().getFullYear()} BlueprintCAD
          </p>
          <p className="text-sm mt-1" style={{ color: colors.textMuted }}>
            Built for creators • Coming soon
          </p>
        </div>
      </div>
    </div>
  );
}

