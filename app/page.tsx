/**
 * BlueprintCAD Landing Page
 * Professional CAD collaboration + marketplace platform
 * Design: Clean, Calm, Technical, Trustworthy, Premium
 */

'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Users,
  Zap,
  Shield,
  Globe,
  TrendingUp,
  GitBranch,
} from 'lucide-react';
import HeroCADVisual from './components/HeroCADVisual';

// Design System Colors (locked)
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
  danger: '#EF4444',
  success: '#22C55E',
};

export default function HomePage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [scrolled, setScrolled] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    const checkUser = () => {
      const userData = localStorage.getItem('user');
      if (userData) {
        const user = JSON.parse(userData);
        setUser(user);
        router.push('/dashboard');
      } else {
        setUser(null);
      }
    };

    checkUser();
    const handleUserChange = () => checkUser();
    window.addEventListener('userChanged', handleUserChange);
    window.addEventListener('storage', handleUserChange);

    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll);

    return () => {
      window.removeEventListener('userChanged', handleUserChange);
      window.removeEventListener('storage', handleUserChange);
      window.removeEventListener('scroll', handleScroll);
    };
  }, [router]);

  const features = [
    {
      icon: Users,
      title: 'Real-time collaboration',
    },
    {
      icon: Zap,
      title: 'Cloud-native performance',
    },
    {
      icon: Shield,
      title: 'Secure access control',
    },
    {
      icon: Globe,
      title: 'Global marketplace',
    },
    {
      icon: GitBranch,
      title: 'Versioning & history',
    },
    {
      icon: TrendingUp,
      title: 'Analytics & insights',
    },
  ];

  const stats = [
    { value: '50K+', label: 'Active designers' },
    { value: '500K+', label: 'CAD projects uploaded' },
    { value: '2M+', label: 'Total downloads' },
    { value: '$10M+', label: 'Creator revenue' },
  ];

  return (
    <div className="min-h-screen" style={{ backgroundColor: colors.bgPrimary }}>
      {/* Header / Navbar */}
      <header
        className="fixed top-0 left-0 right-0 z-50"
        style={{
          height: '64px',
          backgroundColor: colors.bgPrimary,
          borderBottom: `1px solid ${colors.border}`,
        }}
      >
        <div className="max-w-7xl mx-auto px-6 h-full flex items-center justify-between">
          {/* Left: Logo */}
          <Link 
            href="/" 
            className="flex items-center gap-3"
          >
            <img
              src="/bpcube3.png.png"
              alt="Blueprint Logo"
              style={{ 
                height: '27px',
                width: '27px',
              }}
            />
            <span 
              className="text-lg font-medium" 
              style={{ 
                color: colors.textPrimary,
                fontSize: '18px',
              }}
            >
              Blueprint
            </span>
          </Link>

          {/* Center: Navigation */}
          <nav className="hidden md:flex items-center gap-8">
            <Link
              href="/explore"
              className="nav-link text-sm font-medium relative"
              style={{ color: colors.textSecondary }}
            >
              Explore
            </Link>
            <Link
              href="/marketplace"
              className="nav-link text-sm font-medium relative"
              style={{ color: colors.textSecondary }}
            >
              Marketplace
            </Link>
            <Link
              href="/forum"
              className="nav-link text-sm font-medium relative"
              style={{ color: colors.textSecondary }}
            >
              Community
            </Link>
          </nav>

          {/* Right: Auth Buttons */}
          <div className="flex items-center gap-4">
            {user ? (
              <Link href="/dashboard">
                <button
                  className="px-4 py-2 text-sm font-medium rounded-lg transition-colors"
                  style={{ color: colors.textSecondary }}
                >
                  Dashboard
                </button>
              </Link>
            ) : (
              <>
                <Link href="/login">
                  <button
                    className="px-4 py-2 text-sm font-medium transition-colors"
                    style={{ color: colors.textSecondary }}
                  >
                    Sign in
                  </button>
                </Link>
                <Link href="/register">
                  <button
                    className="px-4 py-2 text-sm font-medium rounded-lg transition-all duration-200 hover:opacity-90"
                    style={{
                      backgroundColor: colors.accentBlue,
                      color: '#FFFFFF',
                    }}
                  >
                    Get started
                  </button>
                </Link>
              </>
            )}
          </div>
        </div>
      </header>


      {/* Hero Section */}
      <section className="pt-32 pb-24 px-6 relative">
        <div className="max-w-7xl mx-auto">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            {/* Left: Text Content */}
            <div
              className="hero-content"
              style={{
                opacity: mounted ? 1 : 0,
                transform: mounted ? 'translateY(0)' : 'translateY(15px)',
                transition: 'opacity 0.6s ease, transform 0.6s ease',
              }}
            >
              {/* Badge */}
              <div
                className="inline-flex items-center px-4 py-1.5 rounded-full mb-8"
                style={{
                  backgroundColor: colors.bgPanel,
                  border: `1px solid ${colors.border}`,
                  fontSize: '13px',
                  color: colors.textSecondary,
                }}
              >
                Next-generation CAD collaboration platform
              </div>

              {/* Headline */}
              <h1
                className="text-5xl md:text-6xl font-bold mb-6"
                style={{
                  color: colors.textPrimary,
                  lineHeight: '1.15',
                  maxWidth: '560px',
                }}
              >
                Design together.
                <br />
                Ship faster.
              </h1>

              {/* Subheadline */}
              <p
                className="text-lg mb-8"
                style={{
                  color: colors.textSecondary,
                  lineHeight: '1.6',
                  maxWidth: '560px',
                  transitionDelay: '0.1s',
                }}
              >
                Professional CAD tools meet a modern collaboration and marketplace platform. Create parametric designs, work with your team in real time, and sell to a global community.
              </p>

              {/* Buttons */}
              <div 
                className="flex items-center gap-4"
                style={{ transitionDelay: '0.2s' }}
              >
                <Link href="/explore">
                  <button
                    className="hero-button-primary px-6 py-3 text-sm font-medium rounded-lg transition-all duration-200"
                    style={{
                      backgroundColor: colors.accentBlue,
                      color: '#FFFFFF',
                    }}
                  >
                    Explore designs
                  </button>
                </Link>
                <Link href="/upload">
                  <button
                    className="hero-button-secondary px-6 py-3 text-sm font-medium rounded-lg transition-all duration-200"
                    style={{
                      backgroundColor: 'transparent',
                      border: `1px solid ${colors.border}`,
                      color: colors.textPrimary,
                    }}
                  >
                    Upload a design
                  </button>
                </Link>
              </div>
            </div>

            {/* Right: Visual */}
            <div className="relative">
              <HeroCADVisual />
            </div>
          </div>
        </div>
      </section>

      {/* Social Proof Stats Strip */}
      <section
        className="py-12 px-6 border-t stats-section"
        style={{
          backgroundColor: colors.bgSecondary,
          borderTop: `1px solid ${colors.border}`,
        }}
      >
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {stats.map((stat, index) => (
              <div 
                key={index} 
                className="text-center stat-item"
                style={{
                  opacity: mounted ? 1 : 0,
                  transform: mounted ? 'translateY(0)' : 'translateY(10px)',
                  transition: `opacity 0.5s ease ${0.1 * index}s, transform 0.5s ease ${0.1 * index}s`,
                }}
              >
                <div
                  className="text-3xl font-bold mb-1"
                  style={{ color: colors.textPrimary }}
                >
                  {stat.value}
                </div>
                <div
                  className="text-sm"
                  style={{ color: colors.textMuted }}
                >
                  {stat.label}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-24 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2
              className="text-3xl md:text-4xl font-semibold mb-4"
              style={{
                color: colors.textPrimary,
                lineHeight: '1.15',
              }}
            >
              Everything you need to design, collaborate, and sell
            </h2>
            <p
              className="text-lg max-w-2xl mx-auto"
              style={{
                color: colors.textSecondary,
                lineHeight: '1.6',
              }}
            >
              All-in-one tools for modern hardware teams and independent creators.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {features.map((feature, index) => {
              const Icon = feature.icon;
              return (
                <div
                  key={index}
                  className="p-6 rounded-xl"
                  style={{
                    backgroundColor: colors.bgPanel,
                    border: `1px solid ${colors.border}`,
                  }}
                >
                  <Icon
                    size={24}
                    style={{ color: colors.textSecondary, marginBottom: '16px' }}
                  />
                  <h3
                    className="text-base font-medium"
                    style={{ color: colors.textPrimary }}
                  >
                    {feature.title}
                  </h3>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Final CTA Section */}
      <section
        className="py-24 px-6"
        style={{ backgroundColor: colors.bgPrimary }}
      >
        <div className="max-w-4xl mx-auto text-center">
          <h2
            className="text-3xl md:text-4xl font-semibold mb-4"
            style={{
              color: colors.textPrimary,
              lineHeight: '1.15',
            }}
          >
            Start building with Blueprint
          </h2>
          <p
            className="text-lg mb-8"
            style={{
              color: colors.textSecondary,
              lineHeight: '1.6',
            }}
          >
            Create an account in minutes. Free forever plan available.
          </p>
          <Link href="/register">
            <button
              className="px-6 py-3 text-sm font-medium rounded-lg mb-3 transition-all duration-200 hover:opacity-90"
              style={{
                backgroundColor: colors.accentBlue,
                color: '#FFFFFF',
              }}
            >
              Create free account
            </button>
          </Link>
          <p
            className="text-sm"
            style={{ color: colors.textMuted }}
          >
            No credit card required
          </p>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 px-6 border-t" style={{ borderTop: `1px solid ${colors.border}` }}>
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-8">
            <div>
              <h4
                className="text-sm font-medium mb-4"
                style={{ color: colors.textSecondary }}
              >
                Product
              </h4>
              <ul className="space-y-2">
                <li>
                  <Link href="/explore" className="text-sm transition-colors hover:opacity-80" style={{ color: colors.textMuted }}>
                    Explore
                  </Link>
                </li>
                <li>
                  <Link href="/marketplace" className="text-sm transition-colors hover:opacity-80" style={{ color: colors.textMuted }}>
                    Marketplace
                  </Link>
                </li>
                <li>
                  <Link href="/upload" className="text-sm transition-colors hover:opacity-80" style={{ color: colors.textMuted }}>
                    Upload
                  </Link>
                </li>
              </ul>
            </div>
            <div>
              <h4
                className="text-sm font-medium mb-4"
                style={{ color: colors.textSecondary }}
              >
                Community
              </h4>
              <ul className="space-y-2">
                <li>
                  <Link href="/forum" className="text-sm transition-colors hover:opacity-80" style={{ color: colors.textMuted }}>
                    Forum
                  </Link>
                </li>
                <li>
                  <Link href="/docs" className="text-sm transition-colors hover:opacity-80" style={{ color: colors.textMuted }}>
                    Documentation
                  </Link>
                </li>
              </ul>
            </div>
            <div>
              <h4
                className="text-sm font-medium mb-4"
                style={{ color: colors.textSecondary }}
              >
                Company
              </h4>
              <ul className="space-y-2">
                <li>
                  <Link href="/about" className="text-sm transition-colors hover:opacity-80" style={{ color: colors.textMuted }}>
                    About
                  </Link>
                </li>
                <li>
                  <Link href="/contact" className="text-sm transition-colors hover:opacity-80" style={{ color: colors.textMuted }}>
                    Contact
                  </Link>
                </li>
              </ul>
            </div>
            <div>
              <h4
                className="text-sm font-medium mb-4"
                style={{ color: colors.textSecondary }}
              >
                Legal
              </h4>
              <ul className="space-y-2">
                <li>
                  <Link href="/privacy" className="text-sm transition-colors hover:opacity-80" style={{ color: colors.textMuted }}>
                    Privacy
                  </Link>
                </li>
                <li>
                  <Link href="/terms" className="text-sm transition-colors hover:opacity-80" style={{ color: colors.textMuted }}>
                    Terms
                  </Link>
                </li>
              </ul>
            </div>
          </div>
          <div className="pt-8 border-t" style={{ borderTop: `1px solid ${colors.border}` }}>
            <p className="text-sm text-center" style={{ color: colors.textMuted }}>
              © 2025 Blueprint. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
