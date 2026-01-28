'use client';

import { useState, useEffect, useRef } from 'react';
import {
  Eye,
  GitBranch,
  DollarSign,
  Mail,
  CheckCircle2,
  Loader2,
  ArrowRight,
  Gift,
} from 'lucide-react';
import Link from 'next/link';
import HeadphonesViewer from '@/app/components/HeadphonesViewer';
import { apiFetch } from '@/lib/apiClient';

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

export default function ComingSoonPage() {
  const [isHeaderSticky, setIsHeaderSticky] = useState(false);
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);
  const headerRef = useRef<HTMLDivElement>(null);
  
  // Waitlist form state
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [showNameField, setShowNameField] = useState(false);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');
  const [position, setPosition] = useState<number | null>(null);
  
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  
  const scrollToWaitlist = () => {
    const waitlistSection = document.getElementById('waitlist');
    if (waitlistSection) {
      waitlistSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  // Check for reduced motion preference
  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    setPrefersReducedMotion(mediaQuery.matches);
    
    const handleChange = (e: MediaQueryListEvent) => setPrefersReducedMotion(e.matches);
    mediaQuery.addEventListener('change', handleChange);
    
    return () => {
      mediaQuery.removeEventListener('change', handleChange);
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

  const handleEmailContinue = () => {
    if (!email || !emailRegex.test(email)) {
      setError('Please enter a valid email address');
      return;
    }
    setError('');
    setShowNameField(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    if (!email || !emailRegex.test(email)) {
      setError('Please enter a valid email address');
      setLoading(false);
      return;
    }

    try {
      const data = await apiFetch('/api/waitlist', {
        method: 'POST',
        body: JSON.stringify({
          email: email.trim(),
          name: name.trim() || undefined,
          source: 'website',
        }),
      });

      setSuccess(true);
      setPosition(data.position || null);
      setEmail('');
      setName('');
      setShowNameField(false);
      
      // Reset success message after 5 seconds
      setTimeout(() => {
        setSuccess(false);
        setPosition(null);
      }, 5000);
    } catch (err: any) {
      setError(err.message || 'Failed to join waitlist. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // NOTE: Parallax for the dashboard image was removed – visual now stays fixed while scrolling.

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
      className="min-h-screen overflow-x-hidden"
      style={{ backgroundColor: colors.bgPrimary, color: colors.textPrimary }}
    >
      {/* Header */}
      <header
        ref={headerRef}
        className={`sticky top-0 z-50 transition-all duration-300 backdrop-blur-md border-b`}
        style={{
          backgroundColor: isHeaderSticky ? 'rgba(11, 14, 20, 0.8)' : 'rgba(11, 14, 20, 0.95)',
          borderColor: colors.border,
        }}
      >
        <div className="max-w-7xl mx-auto px-6 lg:px-20">
          <div className="flex items-center justify-between h-20">
            {/* Logo + wordmark */}
            <Link href="/" className="flex items-center gap-3">
              <img
                src="/bpcube3.png.png"
                alt="BlueprintCAD"
                className="w-auto"
                style={{ height: '40px' }}
              />
              <span
                className="text-base md:text-lg font-semibold tracking-tight font-heading"
                style={{
                  color: colors.textPrimary,
                }}
              >
                BlueprintCAD
              </span>
            </Link>

            {/* Right side */}
            <div className="flex items-center">
              <button
                onClick={scrollToWaitlist}
                className="px-4 py-2 text-sm font-medium rounded-lg transition-all"
                style={{
                  backgroundColor: colors.accent,
                  color: '#0B0E14',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = colors.accentHover;
                  e.currentTarget.style.transform = 'translateY(-1px)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = colors.accent;
                  e.currentTarget.style.transform = 'translateY(0)';
                }}
              >
                Join waitlist
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="pt-12 pb-12 lg:pt-24 lg:pb-24 overflow-x-hidden">
        <div className="max-w-7xl mx-auto px-6 lg:px-20">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16 items-center">
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
                className="text-4xl md:text-5xl lg:text-6xl font-bold mb-6 leading-tight font-heading"
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
                className="text-base md:text-lg lg:text-xl mb-8 leading-relaxed"
                style={{
                  color: colors.textSecondary,
                  lineHeight: '1.5',
                  fontWeight: 400,
                }}
              >
                Design, collaborate, and sell — with CAD-native versioning, interactive previews, and built-in monetization.
              </p>

              {/* Hero CTA Button */}
              <div className="flex flex-col gap-3">
                <button
                  onClick={scrollToWaitlist}
                  className="inline-flex items-center gap-2 rounded-lg font-medium transition-all group"
                  style={{
                    backgroundColor: colors.accent,
                    color: '#0B0E14',
                    padding: '0.75rem 1.25rem',
                    maxWidth: 'fit-content',
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
                  <span className="inline-block transition-transform duration-200 group-hover:translate-x-1">
                    <ArrowRight size={18} />
                  </span>
                </button>
                
                {/* Subtle benefit message */}
                <p
                  className="text-sm flex items-center gap-1.5"
                  style={{
                    color: colors.textSecondary,
                    opacity: 0.7,
                  }}
                >
                  <Gift size={14} style={{ color: colors.accent, opacity: 0.8 }} />
                  <span>3 months free + Founders badge</span>
                </p>
              </div>
            </div>

            {/* Right: Visual - Hidden on mobile and tablet, only show on desktop (lg breakpoint) */}
            <div className="hidden lg:block relative w-full" style={{ minHeight: '600px', overflow: 'visible' }}>
              <div
                className="relative"
                style={{
                  transform: 'translateX(-15px) translateY(40px)',
                  width: '200%',
                  height: 'auto',
                }}
              >
                <img
                  src="/thumbnail3.svg"
                  alt="BlueprintCAD Dashboard"
                  className="h-auto"
                  style={{
                    display: 'block',
                    opacity: 1,
                    width: '50%',
                    height: 'auto',
                    transform: 'scale(2.0)',
                    transformOrigin: 'top left',
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
          </div>
        </div>
      </section>

      {/* Why this exists */}
      <section id="why-section" className="pt-12 pb-12 lg:pt-24 lg:pb-24">
        {/* Top line */}
        <div
          className="border-t mt-8 lg:mt-16"
          style={{ borderColor: colors.border }}
        />

        {/* Content band */}
        <div className="max-w-7xl mx-auto px-6 lg:px-20">
          <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1.9fr)] gap-8 lg:gap-16 items-center pt-8 lg:pt-12 pb-8 lg:pb-12">
            {/* Left: Text */}
            <div className="flex flex-col lg:justify-center lg:h-full">
              <h2
                className="text-2xl md:text-3xl lg:text-4xl font-bold mb-6 lg:mb-8 font-heading"
                style={{
                  color: colors.textPrimary,
                  fontWeight: 700,
                  letterSpacing: '-0.01em',
                }}
              >
                CAD tools weren't built for creators.
              </h2>
              <div
                className="space-y-4 text-base md:text-lg leading-relaxed"
                style={{
                  color: colors.textSecondary,
                  lineHeight: '1.6',
                }}
              >
                <p>Sharing files is fragmented.</p>
                <p>Marketplaces treat designs like static downloads.</p>
                <p>Collaboration lives behind enterprise software.</p>
                <p>Creators are everywhere. Their tools aren't.</p>
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
          
            {/* Right: 3D Headphones Viewer - hidden on mobile, visible on desktop */}
            <div className="hidden lg:flex items-center justify-start w-full h-full overflow-visible">
              <div className="w-full max-w-[700px] ml-auto">
                <HeadphonesViewer />
              </div>
            </div>
          </div>
        </div>

        {/* Bottom line - increased spacing */}
        <div
          className="border-t mt-8 md:mt-12 lg:mt-16"
          style={{ 
            borderColor: colors.border,
          }}
        />
      </section>

      {/* Core Pillars */}
      <section className="py-12 lg:py-24 mt-12 lg:mt-32" style={{ backgroundColor: colors.bgPrimary }}>
        <div className="max-w-7xl mx-auto px-6 lg:px-20">
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
                    className="text-xl font-bold mb-3 font-heading"
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

      {/* Waitlist Section */}
      <section id="waitlist" className="py-12 lg:py-24" style={{ backgroundColor: colors.bgPrimary }}>
        <div className="max-w-2xl mx-auto px-6 lg:px-20">
          <div className="text-center mb-12">
            <h2
              className="text-3xl md:text-4xl lg:text-5xl font-bold mb-4 font-heading"
              style={{
                color: colors.textPrimary,
                fontWeight: 700,
                letterSpacing: '-0.01em',
              }}
            >
              Join the waitlist
            </h2>
            <p
              className="text-base md:text-lg mb-4"
              style={{
                color: colors.textSecondary,
                lineHeight: '1.6',
              }}
            >
              Be the first to know when we launch. Get early access to BlueprintCAD.
            </p>
            
            {/* Subtle benefit badge */}
            <div
              className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-sm mb-8"
              style={{
                backgroundColor: `${colors.accent}10`,
                border: `1px solid ${colors.accent}20`,
                color: colors.textSecondary,
              }}
            >
              <Gift size={14} style={{ color: colors.accent }} />
              <span>All waitlist members get <strong style={{ color: colors.textPrimary }}>3 months free</strong> Creator subscription + <strong style={{ color: colors.textPrimary }}>Founders badge</strong></span>
            </div>
          </div>

          <div className="min-h-[200px] flex items-center justify-center">
            {success ? (
              <div
                className="p-6 rounded-lg border text-center w-full transition-all duration-300"
                style={{
                  borderColor: colors.success,
                  backgroundColor: `${colors.success}10`,
                }}
              >
                <CheckCircle2 size={32} style={{ color: colors.success, margin: '0 auto 12px' }} />
                <h3
                  className="text-xl font-bold mb-2 font-heading"
                  style={{ color: colors.success }}
                >
                  You're on the list!
                </h3>
                <p style={{ color: colors.textSecondary }}>
                  {position 
                    ? `You're #${position} on the waiting list. We'll notify you when we launch!`
                    : "We'll notify you when we launch!"}
                </p>
              </div>
            ) : (
              <form onSubmit={showNameField ? handleSubmit : (e) => { e.preventDefault(); handleEmailContinue(); }} className="space-y-4 w-full transition-all duration-300">
              {/* Email field - always shown */}
              <input
                type="email"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  setError('');
                }}
                placeholder="Enter your email"
                className="w-full px-4 py-3 rounded-lg border transition-all"
                style={{
                  backgroundColor: 'rgba(255,255,255,0.03)',
                  borderColor: error ? '#EF4444' : colors.border,
                  color: colors.textPrimary,
                }}
                onFocus={(e) => {
                  e.currentTarget.style.borderColor = colors.accent;
                  e.currentTarget.style.outline = 'none';
                  e.currentTarget.style.boxShadow = `0 0 0 3px ${colors.accentGlow}`;
                }}
                onBlur={(e) => {
                  e.currentTarget.style.borderColor = error ? '#EF4444' : colors.border;
                  e.currentTarget.style.boxShadow = 'none';
                }}
                required
              />
              
              {/* Name field - appears after email is entered */}
              {showNameField && (
                <div
                  style={{
                    animation: 'fadeInSlideDown 0.35s cubic-bezier(0.4, 0, 0.2, 1)',
                  }}
                >
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => {
                      setName(e.target.value);
                      setError('');
                    }}
                    placeholder="Your name (optional)"
                    className="w-full px-4 py-3 rounded-lg border transition-all"
                    style={{
                      backgroundColor: 'rgba(255,255,255,0.03)',
                      borderColor: colors.border,
                      color: colors.textPrimary,
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
                    autoFocus
                  />
                </div>
              )}
              
              {/* Submit button */}
              <button
                type="submit"
                disabled={loading}
                className="w-full px-6 py-3 rounded-lg font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 group"
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
                    <Loader2 size={18} className="animate-spin" />
                    Joining...
                  </>
                ) : (
                  <>
                    {showNameField ? 'Submit' : 'Continue'}
                    {!showNameField && (
                      <span className="inline-block transition-transform duration-200 group-hover:translate-x-1">
                        <ArrowRight size={18} />
                      </span>
                    )}
                  </>
                )}
              </button>
              
                {error && (
                  <p className="text-sm text-center" style={{ color: '#EF4444' }}>
                    {error}
                  </p>
                )}
              </form>
            )}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer
        className="py-8 border-t"
        style={{
          borderColor: colors.border,
        }}
      >
        <div className="max-w-7xl mx-auto px-6 lg:px-20">
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
