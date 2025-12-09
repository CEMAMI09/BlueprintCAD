/**
 * Marketing Landing Page
 * Hero section, features, CTAs - NO sidebar layout
 */

'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/UIComponents';
import { DesignSystem as DS } from '@/backend/lib/ui/design-system';
import {
  Box,
  Users,
  Zap,
  Shield,
  Globe,
  TrendingUp,
  ArrowRight,
  Github,
  Twitter,
  LogOut,
} from 'lucide-react';

export default function HomePage() {
  const router = useRouter();
  const [hoveredFeature, setHoveredFeature] = useState<number | null>(null);
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    const checkUser = () => {
      const userData = localStorage.getItem('user');
      if (userData) {
        const user = JSON.parse(userData);
        setUser(user);
        // If user is logged in, redirect to dashboard
        router.push('/dashboard');
      } else {
        setUser(null);
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
  }, [router]);

  const handleLogout = () => {
    localStorage.clear();
    setUser(null);
    window.dispatchEvent(new Event('userChanged'));
    window.dispatchEvent(new Event('storage'));
    window.location.href = '/';
  };

  const stats = [
    { label: 'Active Designers', value: '50K+' },
    { label: 'CAD Projects', value: '500K+' },
    { label: 'Downloads', value: '2M+' },
    { label: 'Revenue Generated', value: '$10M+' },
  ];

  const features = [
    {
      icon: Users,
      title: 'Real-Time Collaboration',
      description: 'Work together on designs with live cursors, comments, and instant sync across your team.',
    },
    {
      icon: Zap,
      title: 'Lightning Fast',
      description: 'Cloud-powered geometry kernel processes millions of features in milliseconds.',
    },
    {
      icon: Shield,
      title: 'Enterprise Security',
      description: 'Bank-level encryption, granular permissions, and compliance with industry standards.',
    },
    {
      icon: Globe,
      title: 'Global Marketplace',
      description: 'Buy, sell, and share designs with makers worldwide. Earn from your creativity.',
    },
    {
      icon: TrendingUp,
      title: 'Analytics & Insights',
      description: 'Track views, downloads, revenue, and engagement with powerful analytics dashboards.',
    },
  ];

  return (
    <div className="min-h-screen" style={{ backgroundColor: DS.colors.background.app }}>
      {/* Header/Nav */}
      <header
        className="fixed top-0 left-0 right-0 z-50 border-b backdrop-blur-lg"
        style={{
          backgroundColor: `${DS.colors.background.panel}CC`,
          borderColor: DS.colors.border.subtle,
        }}
      >
        <div className="max-w-7xl mx-auto px-6 flex items-center justify-between" style={{ height: '90px', minHeight: '90px', padding: '0', margin: '0', lineHeight: '1' }}>
          <Link href="/" className="flex items-center" style={{ padding: '0', margin: '0', lineHeight: '1' }}>
            <img
              src="/bpcube2.png"
              alt="Blueprint Logo"
              className="logo-image"
            />
          </Link>
          
          <nav className="hidden md:flex items-center gap-8">
            <Link
              href="/explore"
              className="text-sm font-medium transition-colors"
              style={{ color: DS.colors.text.secondary }}
            >
              Explore
            </Link>
            <Link
              href="/marketplace"
              className="text-sm font-medium transition-colors"
              style={{ color: DS.colors.text.secondary }}
            >
              Marketplace
            </Link>
            <Link
              href="/forum"
              className="text-sm font-medium transition-colors"
              style={{ color: DS.colors.text.secondary }}
            >
              Community
            </Link>
          </nav>

          <div className="flex items-center gap-3">
            {user ? (
              <>
                <Link href="/dashboard">
                  <Button variant="ghost" size="sm">Dashboard</Button>
                </Link>
                <Button 
                  variant="secondary" 
                  size="sm" 
                  icon={<LogOut size={16} />}
                  onClick={handleLogout}
                >
                  Logout
                </Button>
              </>
            ) : (
              <>
                <Link href="/login">
                  <Button variant="ghost" size="sm">Sign In</Button>
                </Link>
                <Link href="/register">
                  <Button variant="primary" size="sm">Get Started</Button>
                </Link>
              </>
            )}
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="pt-32 pb-20 px-6">
        <div className="max-w-6xl mx-auto text-center">
          <div
            className="inline-block px-4 py-2 rounded-full mb-6"
            style={{
              backgroundColor: `${DS.colors.primary.blue}22`,
              color: DS.colors.primary.blue,
            }}
          >
            <span className="text-sm font-semibold">✨ Next-Generation CAD Platform</span>
          </div>
          
          <h1
            className="text-6xl font-bold mb-6 leading-tight"
            style={{
              color: DS.colors.text.primary,
              background: `linear-gradient(135deg, ${DS.colors.primary.blue}, ${DS.colors.accent.cyan})`,
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
            }}
          >
            Design, Collaborate, Monetize
          </h1>
          
          <p
            className="text-xl mb-8 max-w-3xl mx-auto leading-relaxed"
            style={{ color: DS.colors.text.secondary }}
          >
            Professional CAD tools meet social platform. Create parametric designs, 
            collaborate in real-time, and sell your work to a global community of makers.
          </p>

          <div className="flex items-center justify-center gap-4 mb-16">
            <Link href="/explore">
              <Button
                variant="primary"
                size="lg"
                icon={<Box size={20} />}
                iconPosition="left"
              >
                Explore Designs
              </Button>
            </Link>
            <Link href="/upload">
              <Button
                variant="secondary"
                size="lg"
                icon={<ArrowRight size={20} />}
                iconPosition="right"
              >
                Upload Design
              </Button>
            </Link>
          </div>

          {/* 3D Model Silhouettes */}
          <div className="relative h-96 rounded-2xl overflow-hidden"
            style={{
              background: `linear-gradient(135deg, ${DS.colors.background.panel}, ${DS.colors.background.panelLight})`,
              border: `1px solid ${DS.colors.border.default}`,
            }}
          >
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="text-9xl opacity-20">🔧</div>
              <div className="text-9xl opacity-20 absolute top-10 right-20">⚙️</div>
              <div className="text-9xl opacity-20 absolute bottom-10 left-20">🔩</div>
            </div>
            <div
              className="absolute inset-0"
              style={{
                background: `radial-gradient(circle at center, ${DS.colors.primary.blue}11, transparent 70%)`,
              }}
            />
          </div>
        </div>
      </section>

      {/* Stats Bar */}
      <section className="py-16 px-6 border-y" style={{ borderColor: DS.colors.border.subtle }}>
        <div className="max-w-6xl mx-auto">
          <div className="grid grid-cols-4 gap-8">
            {stats.map((stat, index) => (
              <div key={index} className="text-center">
                <div
                  className="text-4xl font-bold mb-2"
                  style={{ color: DS.colors.primary.blue }}
                >
                  {stat.value}
                </div>
                <div className="text-sm" style={{ color: DS.colors.text.secondary }}>
                  {stat.label}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section className="py-20 px-6">
        <div className="max-w-6xl mx-auto">
          <h2
            className="text-4xl font-bold text-center mb-4"
            style={{ color: DS.colors.text.primary }}
          >
            Everything you need to succeed
          </h2>
          <p
            className="text-lg text-center mb-12 max-w-2xl mx-auto"
            style={{ color: DS.colors.text.secondary }}
          >
            Professional tools for designers, makers, and engineers. All in one platform.
          </p>

          <div className="grid grid-cols-3 gap-6">
            {features.map((feature, index) => {
              const Icon = feature.icon;
              const isHovered = hoveredFeature === index;
              
              return (
                <div
                  key={index}
                  className="p-6 rounded-xl border transition-all duration-300 cursor-pointer"
                  style={{
                    backgroundColor: isHovered ? DS.colors.background.elevated : DS.colors.background.card,
                    borderColor: isHovered ? DS.colors.primary.blue : DS.colors.border.default,
                    transform: isHovered ? 'translateY(-4px)' : 'translateY(0)',
                  }}
                  onMouseEnter={() => setHoveredFeature(index)}
                  onMouseLeave={() => setHoveredFeature(null)}
                >
                  <div
                    className="w-12 h-12 rounded-lg flex items-center justify-center mb-4"
                    style={{
                      backgroundColor: `${DS.colors.primary.blue}22`,
                    }}
                  >
                    <Icon size={24} style={{ color: DS.colors.primary.blue }} />
                  </div>
                  <h3
                    className="text-lg font-semibold mb-2"
                    style={{ color: DS.colors.text.primary }}
                  >
                    {feature.title}
                  </h3>
                  <p className="text-sm leading-relaxed" style={{ color: DS.colors.text.secondary }}>
                    {feature.description}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section
        className="py-20 px-6 border-t"
        style={{
          borderColor: DS.colors.border.subtle,
          background: `linear-gradient(135deg, ${DS.colors.background.panel}, ${DS.colors.background.panelLight})`,
        }}
      >
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-4xl font-bold mb-4" style={{ color: DS.colors.text.primary }}>
            Ready to start designing?
          </h2>
          <p className="text-lg mb-8" style={{ color: DS.colors.text.secondary }}>
            Join thousands of designers already using Blueprint to create amazing projects.
          </p>
          <Link href="/register">
            <Button variant="primary" size="lg" icon={<ArrowRight size={20} />} iconPosition="right">
              Create Free Account
            </Button>
          </Link>
          <p className="text-sm mt-4" style={{ color: DS.colors.text.tertiary }}>
            No credit card required • Free forever plan available
          </p>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 px-6 border-t" style={{ borderColor: DS.colors.border.subtle }}>
        <div className="max-w-6xl mx-auto">
          <div className="pt-8 flex items-center justify-between">
            <p className="text-sm" style={{ color: DS.colors.text.tertiary }}>
              © 2025 Blueprint. All rights reserved.
            </p>
            <div className="flex items-center gap-4">
              <Link href="https://github.com" target="_blank">
                <Github size={20} style={{ color: DS.colors.text.tertiary }} />
              </Link>
              <Link href="https://twitter.com" target="_blank">
                <Twitter size={20} style={{ color: DS.colors.text.tertiary }} />
              </Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}