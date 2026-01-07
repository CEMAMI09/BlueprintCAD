'use client';

import { useState, useEffect, useRef } from 'react';
import { apiFetch } from '@/lib/apiClient';
import {
  Eye,
  GitBranch,
  DollarSign,
  Mail,
  CheckCircle2,
  Loader2,
  ArrowRight,
} from 'lucide-react';
import Link from 'next/link';
import GlobeHero from '@/app/components/GlobeHero';

// Design system colors
const colors = {
  bgPrimary: '#0B0E14',
  textPrimary: '#E6EAF0',
  textSecondary: '#9BA3AF',
  accent: '#4F7DFF',
  accentHover: '#6A92FF',
  accentPressed: '#3B66F0',
  accentGlow: 'rgba(79,125,255,0.22)',
  border: 'rgba(255,255,255,0.06)',
  success: '#22C55E',
};

// Email validation regex
const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function ComingSoonPage() {
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [showNameField, setShowNameField] = useState(false);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');
  const [position, setPosition] = useState<number | null>(null);
  const [isHeaderSticky, setIsHeaderSticky] = useState(false);
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);
  const [screenSize, setScreenSize] = useState<'desktop' | 'tablet' | 'mobile'>('desktop');
  const headerRef = useRef<HTMLDivElement>(null);

  // Check for reduced motion preference and screen size
  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    setPrefersReducedMotion(mediaQuery.matches);
    
    const handleChange = (e: MediaQueryListEvent) => setPrefersReducedMotion(e.matches);
    mediaQuery.addEventListener('change', handleChange);
    
    // Check screen size: mobile < 768px, tablet 768-1024px, desktop > 1024px
    const checkScreenSize = () => {
      const width = window.innerWidth;
      if (width < 768) {
        setScreenSize('mobile');
      } else if (width < 1024) {
        setScreenSize('tablet');
      } else {
        setScreenSize('desktop');
      }
    };
    
    checkScreenSize();
    window.addEventListener('resize', checkScreenSize);
    
    return () => {
      mediaQuery.removeEventListener('change', handleChange);
      window.removeEventListener('resize', checkScreenSize);
    };
  }, []);

  // Header sticky behavior
  useEffect(() => {
    const handleScroll = () => {
      const scrollY = window.scrollY;
      setIsHeaderSticky(scrollY > 12);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // NOTE: Parallax for the dashboard image was removed – visual now stays fixed while scrolling.

  const handleEmailContinue = (e: React.FormEvent) => {
    e.preventDefault();
    if (!emailRegex.test(email)) {
      setError('Please enter a valid email address');
      return;
    }
    setError('');
    setShowNameField(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

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
      setShowNameField(false);
    } catch (err: any) {
      setError(err.message || 'more to Failed to join waiting list. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const pillars = [
    {
      icon: Eye,
      title: 'Interactive 3D previews',
      description: 'Inspect designs directly in the browser — rotate, explore, and understand before downloading or buying.',
    },
    {
      icon: GitBranch,
      title: 'Versioning & collaboration',
      description: 'Organize projects with folders, branches, permissions, and history — without enterprise PLM.',
    },
    {
      icon: DollarSign,
      title: 'Monetize your designs',
      description: 'Sell through storefronts, track analytics, and generate AI manufacturing quotes.',
    },
  ];

  return (
    <div
      className="min-h-screen"
      style={{ backgroundColor: colors.bgPrimary, color: colors.textPrimary }}
    >
      {/* Header */}
      <header
        ref={headerRef}
        className={`transition-all duration-300 ${
          isHeaderSticky ? 'sticky top-0 z-50' : 'relative'
        }`}
        style={{
          backgroundColor: isHeaderSticky
            ? 'rgba(11, 14, 20, 0.8)'
            : 'transparent',
          backdropFilter: isHeaderSticky ? 'blur(12px)' : 'none',
          borderBottom: isHeaderSticky ? `1px solid ${colors.border}` : 'none',
        }}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16 md:h-16">
            {/* Logo */}
            <Link href="/" className="flex items-center">
              <img
                src="/bpcube3.png.png"
                alt="BlueprintCAD"
                className="w-auto"
                style={{ height: '30px' }}
              />
            </Link>

            {/* Right side */}
            <div className="flex items-center">
              <button
                onClick={(e) => {
                  e.preventDefault();
                  const waitlistSection = document.getElementById('waitlist');
                  if (waitlistSection) {
                    waitlistSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
                  }
                }}
                className="px-4 py-2 rounded-lg text-sm font-medium transition-all"
                style={{
                  backgroundColor: colors.accent,
                  color: '#0B0E14',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = colors.accentHover;
                  e.currentTarget.style.transform = 'translateY(-1px)';
                  e.currentTarget.style.boxShadow = `0 4px 12px ${colors.accentGlow}`;
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = colors.accent;
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = 'none';
                }}
                onMouseDown={(e) => {
                  e.currentTarget.style.backgroundColor = colors.accentPressed;
                  e.currentTarget.style.transform = 'translateY(0)';
                }}
                onMouseUp={(e) => {
                  e.currentTarget.style.backgroundColor = colors.accentHover;
                  e.currentTarget.style.transform = 'translateY(-1px)';
                }}
              >
                Join waitlist
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="pt-24 md:pt-32 pb-16 md:pb-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className={`grid gap-12 lg:gap-16 items-center ${screenSize === 'mobile' ? 'grid-cols-1' : 'grid-cols-1 lg:grid-cols-2'}`}>
            {/* Left: Text */}
            <div className="lg:pr-8">
              {/* Eyebrow pill */}
              <div
                className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium mb-6"
                style={{
                  backgroundColor: `${colors.accent}15`,
                  color: colors.accent,
                  border: `1px solid ${colors.accent}30`,
                  letterSpacing: '0.05em',
                  textTransform: 'uppercase',
                }}
              >
                Coming soon
              </div>

              {/* Main headline */}
              <h1
                className="text-4xl md:text-6xl font-bold mb-6 leading-tight"
                style={{
                  color: colors.textPrimary,
                  fontWeight: 700,
                  letterSpacing: '-0.01em',
                  lineHeight: '1.1',
                }}
              >
                The home for CAD creators.
              </h1>

              {/* Subheadline */}
              <p
                className="text-lg md:text-xl mb-8 leading-relaxed"
                style={{
                  color: colors.textSecondary,
                  lineHeight: '1.5',
                  fontWeight: 400,
                }}
              >
                Design, collaborate, and sell — with CAD-native versioning, interactive previews, and built-in monetization.
              </p>

              {/* Primary CTA */}
              <div className="mb-4">
                <button
                  onClick={(e) => {
                    e.preventDefault();
                    const waitlistSection = document.getElementById('waitlist');
                    if (waitlistSection) {
                      waitlistSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
                    }
                  }}
                  className="inline-flex items-center gap-2 px-6 py-3 rounded-lg font-medium transition-all"
                  style={{
                    backgroundColor: colors.accent,
                    color: '#0B0E14',
                    height: '48px',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = colors.accentHover;
                    e.currentTarget.style.transform = 'translateY(-1px)';
                    e.currentTarget.style.boxShadow = `0 4px 12px ${colors.accentGlow}`;
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = colors.accent;
                    e.currentTarget.style.transform = 'translateY(0)';
                    e.currentTarget.style.boxShadow = 'none';
                  }}
                  onMouseDown={(e) => {
                    e.currentTarget.style.backgroundColor = colors.accentPressed;
                    e.currentTarget.style.transform = 'translateY(0)';
                  }}
                  onMouseUp={(e) => {
                    e.currentTarget.style.backgroundColor = colors.accentHover;
                    e.currentTarget.style.transform = 'translateY(-1px)';
                  }}
                >
                  Join the waitlist
                  <ArrowRight size={18} />
                </button>
              </div>

              {/* Secondary text */}
              <p
                className="text-sm"
                style={{
                  color: colors.textSecondary,
                  lineHeight: '1.5',
                }}
              >
                Founding creators get 1 free month of Creator + an early badge.
              </p>
            </div>

            {/* Right: Visual - Hidden on mobile, scaled on tablet, full on desktop */}
            {screenSize !== 'mobile' && (
              <div
                className="relative w-full"
                style={{
                  // Keep a slight horizontal offset on desktop only, but no scroll movement
                  transform:
                    screenSize === 'desktop'
                      ? 'translateX(-40px)'
                      : 'translateX(0px)',
                }}
              >
                <div
                  className="rounded-lg border w-full"
                  style={{
                    borderColor: 'rgba(255,255,255,0.08)',
                    boxShadow: '0 12px 48px rgba(0,0,0,0.4), 0 4px 16px rgba(0,0,0,0.2)',
                    transform: screenSize === 'desktop' ? 'scale(1.4)' : 'scale(1.0)',
                    transformOrigin: screenSize === 'desktop' ? 'top left' : 'center',
                    overflow: 'hidden',
                    maxWidth: '100%',
                  }}
                >
                  <img
                    src="/mock2.png"
                    alt="BlueprintCAD Dashboard"
                    className="w-full h-auto"
                    style={{
                      display: 'block',
                      opacity: 1,
                      maxWidth: '100%',
                      height: 'auto',
                    }}
                    onLoad={() => {
                      setImageLoaded(true);
                    }}
                    onError={(e) => {
                      console.error('Failed to load dashboard image:', e);
                      setImageLoaded(true);
                    }}
                    loading="eager"
                    fetchPriority="high"
                  />
                </div>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Why this exists */}
      <section id="why-section" className="pt-20 md:pt-24 pb-0 md:pb-0">
        {/* Top line - already aligned with globe box top */}
        <div
          className="border-t mt-12 md:mt-16"
          style={{ borderColor: colors.border }}
        />

        {/* Content band */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16 items-stretch pt-0 pb-0 md:pt-0 md:pb-0">
            {/* Left: Text */}
            <div className="flex flex-col justify-center h-full">
              <h2
                className="text-2xl md:text-3xl font-bold mb-8"
                style={{
                  color: colors.textPrimary,
                  fontWeight: 700,
                  letterSpacing: '-0.01em',
                }}
              >
                CAD tools weren't built for creators.
              </h2>
              <div
                className="space-y-4 text-lg leading-relaxed"
                style={{
                  color: colors.textSecondary,
                  lineHeight: '1.6',
                }}
              >
                <p>Sharing files is fragmented.</p>
                <p>Marketplaces treat designs like static downloads.</p>
                <p>Collaboration lives behind enterprise software.</p>
                <p
                  className="mt-6"
                  style={{
                    color: colors.textPrimary,
                    fontWeight: 600,
                  }}
                >
                  BlueprintCAD fixes that.
                </p>
              </div>
            </div>
          
            {/* Right: Globe - align to the right edge */}
            <div
              className="hidden md:flex items-stretch justify-end"
              style={{ marginRight: 'calc((100vw - 100%)/2)' }}
            >
              <div className="w-full">
                <GlobeHero />
              </div>
            </div>
          </div>
        </div>

        {/* Bottom line - fine-tuned spacing under the globe band */}
        <div
          className="border-t"
          style={{ borderColor: colors.border, transform: 'translateY(124px)' }}
        />
      </section>

      {/* Core Pillars */}
      <section className="py-20 md:py-24 mt-24 md:mt-32" style={{ backgroundColor: colors.bgPrimary }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {pillars.map((pillar, index) => {
              const Icon = pillar.icon;
              return (
                <div
                  key={index}
                  className="p-6 rounded-lg border transition-all"
                  style={{
                    borderColor: colors.border,
                    backgroundColor: 'transparent',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = colors.accent;
                    e.currentTarget.style.transform = 'translateY(-2px)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = colors.border;
                    e.currentTarget.style.transform = 'translateY(0)';
                  }}
                >
                  <div className="mb-4">
                    <Icon
                      size={24}
                      style={{
                        color: colors.accent,
                        strokeWidth: 1.5,
                      }}
                    />
                  </div>
                  <h3
                    className="text-xl font-bold mb-3"
                    style={{
                      color: colors.textPrimary,
                      fontWeight: 700,
                    }}
                  >
                    {pillar.title}
                  </h3>
                  <p
                    style={{
                      color: colors.textSecondary,
                      lineHeight: '1.5',
                    }}
                  >
                    {pillar.description}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Second Waitlist CTA */}
      <section id="waitlist" className="py-20 md:py-24">
        <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2
            className="text-3xl md:text-4xl font-bold mb-4"
            style={{
              color: colors.textPrimary,
              fontWeight: 700,
              letterSpacing: '-0.01em',
            }}
          >
            Be there from the beginning.
          </h2>
          <p
            className="text-lg mb-8"
            style={{
              color: colors.textSecondary,
              lineHeight: '1.5',
            }}
          >
            Join the waitlist for early access, a founding creator badge, and one free month of the Creator plan.
          </p>

          {/* Waitlist Form */}
          {success ? (
            <div
              className="p-6 rounded-lg border text-left max-w-md mx-auto"
              style={{
                borderColor: colors.success,
                backgroundColor: `${colors.success}10`,
              }}
            >
              <div className="flex items-center gap-3 mb-2">
                <CheckCircle2 size={24} style={{ color: colors.success }} />
                <h3
                  className="text-lg font-semibold"
                  style={{ color: colors.textPrimary }}
                >
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
            <form
              onSubmit={showNameField ? handleSubmit : handleEmailContinue}
              className="max-w-md mx-auto space-y-4"
            >
              {/* Email field */}
              <div>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    setError('');
                  }}
                  placeholder="Enter your email"
                  required
                  className="w-full px-4 py-3 rounded-lg border transition-all"
                  style={{
                    backgroundColor: 'rgba(255,255,255,0.03)',
                    borderColor: error ? '#EF4444' : colors.border,
                    color: colors.textPrimary,
                    height: '48px',
                  }}
                  onFocus={(e) => {
                    e.currentTarget.style.borderColor = colors.accent;
                    e.currentTarget.style.outline = 'none';
                    e.currentTarget.style.boxShadow = `0 0 0 3px ${colors.accentGlow}`;
                  }}
                  onBlur={(e) => {
                    e.currentTarget.style.borderColor = colors.border;
                    e.currentTarget.style.boxShadow = 'none';
                  }}
                />
                {error && email && (
                  <p className="text-sm mt-1 text-left" style={{ color: '#EF4444' }}>
                    {error}
                  </p>
                )}
              </div>

              {/* Name field - progressive reveal */}
              <div
                className="transition-all duration-200 overflow-hidden"
                style={{
                  opacity: showNameField ? 1 : 0,
                  maxHeight: showNameField ? '100px' : '0',
                  transform: showNameField
                    ? 'translateY(0)'
                    : 'translateY(-10px)',
                }}
              >
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Your name (optional)"
                  className="w-full px-4 py-3 rounded-lg border transition-all"
                  style={{
                    backgroundColor: 'rgba(255,255,255,0.03)',
                    borderColor: colors.border,
                    color: colors.textPrimary,
                    height: '48px',
                  }}
                  onFocus={(e) => {
                    e.currentTarget.style.borderColor = colors.accent;
                    e.currentTarget.style.outline = 'none';
                    e.currentTarget.style.boxShadow = `0 0 0 3px ${colors.accentGlow}`;
                  }}
                  onBlur={(e) => {
                    e.currentTarget.style.borderColor = colors.border;
                    e.currentTarget.style.boxShadow = 'none';
                  }}
                />
              </div>

              {/* Submit button */}
              <button
                type="submit"
                disabled={loading}
                className="w-full px-6 py-3 rounded-lg font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                style={{
                  backgroundColor: colors.accent,
                  color: '#0B0E14',
                  height: '48px',
                }}
                onMouseEnter={(e) => {
                  if (!loading) {
                    e.currentTarget.style.backgroundColor = colors.accentHover;
                    e.currentTarget.style.transform = 'translateY(-1px)';
                    e.currentTarget.style.boxShadow = `0 4px 12px ${colors.accentGlow}`;
                  }
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = colors.accent;
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = 'none';
                }}
                onMouseDown={(e) => {
                  if (!loading) {
                    e.currentTarget.style.backgroundColor = colors.accentPressed;
                    e.currentTarget.style.transform = 'translateY(0)';
                  }
                }}
                onMouseUp={(e) => {
                  if (!loading) {
                    e.currentTarget.style.backgroundColor = colors.accentHover;
                    e.currentTarget.style.transform = 'translateY(-1px)';
                  }
                }}
              >
                {loading ? (
                  <>
                    <Loader2 size={20} className="animate-spin" />
                    Joining...
                  </>
                ) : (
                  <>
                    {showNameField ? 'Join waitlist' : 'Continue'}
                    <Mail size={18} />
                  </>
                )}
              </button>
            </form>
          )}
        </div>
      </section>

      {/* Footer */}
      <footer
        className="py-8 border-t"
        style={{
          borderColor: colors.border,
        }}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row items-center justify-center gap-4 md:gap-6 text-sm">
            <p style={{ color: colors.textSecondary }}>
              © {new Date().getFullYear()} BlueprintCAD
            </p>
            <span style={{ color: colors.border }}>•</span>
            <Link
              href="/privacy"
              className="transition-all relative group"
              style={{ color: colors.textSecondary }}
            >
              <span className="relative">
                Privacy
                <span
                  className="absolute bottom-0 left-0 w-0 h-px transition-all duration-200 group-hover:w-full"
                  style={{ backgroundColor: colors.accent }}
                />
              </span>
            </Link>
            <span style={{ color: colors.border }}>•</span>
            <Link
              href="/contact"
              className="transition-all relative group"
              style={{ color: colors.textSecondary }}
            >
              <span className="relative">
                Contact
                <span
                  className="absolute bottom-0 left-0 w-0 h-px transition-all duration-200 group-hover:w-full"
                  style={{ backgroundColor: colors.accent }}
                />
              </span>
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
