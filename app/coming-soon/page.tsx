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
  
  const easeInOutCubic = (t: number) => t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;

  const smoothScrollTo = (element: HTMLElement) => {
    if (prefersReducedMotion) {
      element.scrollIntoView({ block: 'start' });
      return;
    }
    const start = window.scrollY;
    const end = element.getBoundingClientRect().top + start;
    const distance = end - start;
    const duration = 700;
    let startTime: number | null = null;

    const step = (timestamp: number) => {
      if (startTime == null) startTime = timestamp;
      const elapsed = timestamp - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = easeInOutCubic(progress);
      window.scrollTo(0, start + distance * eased);
      if (progress < 1) requestAnimationFrame(step);
    };

    requestAnimationFrame(step);
  };

  const scrollToWaitlist = () => {
    const el = document.getElementById('waitlist');
    if (el) smoothScrollTo(el);
  };

  const scrollToSection = (id: string) => {
    const el = document.getElementById(id);
    if (el) smoothScrollTo(el);
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

  // Header: show floating bar only after scrolling past the initial header (a bit more than h-20)
  useEffect(() => {
    const threshold = 140;
    const handleScroll = () => {
      setIsHeaderSticky(window.scrollY > threshold);
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
      {/* Initial header: in-flow, scrolls away with the page (not sticky) */}
      <header
        ref={headerRef}
        className="w-full z-40 transition-all duration-300 ease-out backdrop-blur-md border-b"
        style={{
          backgroundColor: 'rgba(11, 14, 20, 0.95)',
          borderColor: colors.border,
        }}
      >
        <div className="max-w-7xl mx-auto px-6 lg:px-20">
          <div className="flex items-center justify-between h-20">
            <Link href="/" className="flex items-center shrink-0">
              <img
                src="/BlueprintCAD (3).svg"
                alt="BlueprintCAD"
                className="h-12 md:h-14 w-auto"
              />
            </Link>
            <div className="flex items-center shrink-0">
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

      {/* Sticky floating bar: fades/slides in after scrolling past the initial header */}
      <header
        className="fixed top-3 left-4 right-4 z-50 backdrop-blur-md transition-all duration-300 ease-out"
        style={{
          backgroundColor: 'rgba(11, 14, 20, 0.85)',
          border: `1px solid ${colors.border}`,
          borderRadius: 28,
          maxWidth: 900,
          marginLeft: 'auto',
          marginRight: 'auto',
          boxShadow: '0 4px 24px rgba(0,0,0,0.25)',
          opacity: isHeaderSticky ? 1 : 0,
          transform: isHeaderSticky ? 'translateY(0)' : 'translateY(-12px)',
          pointerEvents: isHeaderSticky ? 'auto' : 'none',
        }}
      >
          <div className="w-full mx-auto px-6 lg:px-8">
            <div className="flex items-center justify-between h-14 gap-8">
              <Link href="/" className="flex items-center shrink-0">
                <img
                  src="/bpcube3.png.png"
                  alt="BlueprintCAD"
                  className="h-7 w-auto"
                />
              </Link>
              <nav className="flex items-center gap-1 sm:gap-2 flex-1 justify-center">
                {[
                  { id: 'hero', label: 'Home' },
                  { id: 'why-section', label: 'Why' },
                  { id: 'features', label: 'Features' },
                  { id: 'pricing', label: 'Pricing' },
                  { id: 'waitlist', label: 'Waitlist' },
                ].map(({ id, label }) => (
                  <button
                    key={id}
                    type="button"
                    onClick={() => scrollToSection(id)}
                    className="group relative px-3 py-2 text-sm font-medium rounded-lg transition-colors hover:opacity-90 overflow-visible"
                    style={{ color: colors.textPrimary }}
                  >
                    {label}
                    <span
                      className="absolute bottom-1 left-2 right-2 h-0.5 rounded-full transition-transform duration-200 ease-out origin-left scale-x-0 group-hover:scale-x-100"
                      style={{ backgroundColor: colors.accent }}
                      aria-hidden
                    />
                  </button>
                ))}
              </nav>
              <div className="flex items-center shrink-0">
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

      <main>
      {/* Hero Section */}
      <section
        id="hero"
        className="pt-12 pb-[6.5rem] lg:pt-24 lg:pb-[9.5rem] overflow-x-hidden"
        style={{ backgroundColor: colors.bgPrimary, color: colors.textPrimary }}
      >
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

      {/* Why this exists - dark section */}
      <section
        id="why-section"
        className="pt-4 pb-12 lg:pt-8 lg:pb-24 border-t border-b"
        style={{
          borderColor: colors.border,
          background: 'radial-gradient(circle at top, #111827 0%, #020617 60%, #020617 100%)',
        }}
      >
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
      </section>

      {/* Deep feature rows - dark blue */}
      <section
        id="features"
        className="py-16 lg:py-28"
        style={{
          background: 'linear-gradient(135deg, #0B1220 0%, #0B1F3A 50%, #020617 100%)',
        }}
      >
        <div className="max-w-7xl mx-auto px-6 lg:px-20 space-y-16 lg:space-y-20">
          {/* Row 1: text left, image right */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 lg:gap-16 items-center">
            <div>
              <h2 className="text-2xl md:text-3xl lg:text-4xl font-heading font-bold mb-4" style={{ color: '#E5E7EB' }}>
                Design once, explore everywhere.
              </h2>
              <p className="text-base md:text-lg mb-4" style={{ color: '#9CA3AF' }}>
                BlueprintCAD gives you a single source of truth for your 3D work — projects, revisions, and previews stay in sync across desktop and mobile.
              </p>
              <p className="text-sm md:text-base" style={{ color: '#9CA3AF' }}>
                Interactive previews, responsive dashboards, and creator-first analytics make it easy to share progress with clients, collaborators, and your audience.
              </p>
            </div>
            <div className="relative">
              <div className="rounded-2xl border bg-gradient-to-br from-[#111827] via-[#0B1220] to-[#1D4ED8] border-[rgba(148,163,184,0.35)] p-4 lg:p-6 shadow-xl shadow-blue-900/40">
                <img
                  src="/thumbnail3.svg"
                  alt="BlueprintCAD dashboard mockup"
                  className="w-full h-auto rounded-xl border border-[rgba(148,163,184,0.25)] bg-black/20"
                />
              </div>
            </div>
          </div>

          {/* Row 2: image left, text right */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 lg:gap-16 items-center">
            <div className="order-2 lg:order-1 relative">
              <div className="rounded-2xl border border-[rgba(148,163,184,0.4)] bg-gradient-to-tr from-[#020617] via-[#111827] to-[#1D4ED8]/40 p-6 flex items-center justify-center">
                <div className="grid grid-cols-2 gap-3 w-full max-w-md">
                  <div className="rounded-xl border border-[rgba(148,163,184,0.35)] bg-black/40 p-3 text-xs text-slate-300">
                    <p className="font-semibold mb-1">Branch: v3.2-lightweight</p>
                    <p>Exploded view for assembly docs.</p>
                  </div>
                  <div className="rounded-xl border border-[rgba(148,163,184,0.35)] bg-black/40 p-3 text-xs text-slate-300">
                    <p className="font-semibold mb-1">Review requests</p>
                    <p>2 open comments on tolerances.</p>
                  </div>
                  <div className="rounded-xl border border-[rgba(148,163,184,0.35)] bg-black/40 p-3 text-xs text-slate-300 col-span-2">
                    <p className="font-semibold mb-1">Version timeline</p>
                    <p>Auto-snapshots across branches with visual diffs.</p>
                  </div>
                </div>
              </div>
            </div>
            <div className="order-1 lg:order-2">
              <h2 className="text-2xl md:text-3xl lg:text-4xl font-heading font-bold mb-4" style={{ color: '#E5E7EB' }}>
                Versions that stay in sync.
              </h2>
              <p className="text-base md:text-lg mb-4" style={{ color: '#9CA3AF' }}>
                Branches, reviews, and approvals are built into the file system — no more shipping ZIPs or guessing which STEP is final.
              </p>
              <p className="text-sm md:text-base" style={{ color: '#9CA3AF' }}>
                Keep teams aligned with clear history, visual diffs, and project timelines that work the way engineers and designers actually think.
              </p>
            </div>
          </div>

          {/* Row 3: text left, image right */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 lg:gap-16 items-center">
            <div>
              <h2 className="text-2xl md:text-3xl lg:text-4xl font-heading font-bold mb-4" style={{ color: '#E5E7EB' }}>
                Turn downloads into a business.
              </h2>
              <p className="text-base md:text-lg mb-4" style={{ color: '#9CA3AF' }}>
                Launch a storefront, set licenses, and plug directly into manufacturing — without duct-taping marketplaces, spreadsheets, and quote forms.
              </p>
              <p className="text-sm md:text-base" style={{ color: '#9CA3AF' }}>
                BlueprintCAD handles pricing, distribution, and analytics so you can focus on designing work people actually want to pay for.
              </p>
            </div>
            <div className="relative">
              <div className="rounded-2xl border border-[rgba(56,189,248,0.45)] bg-gradient-to-br from-[#022c22] via-[#064e3b] to-[#0f172a] p-6 shadow-xl shadow-emerald-900/40">
                <div className="space-y-4 text-sm text-emerald-50">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold">Creator Storefront</span>
                    <span className="text-emerald-200 text-xs">Live</span>
                  </div>
                  <div className="grid grid-cols-3 gap-3 text-xs">
                    <div className="rounded-lg bg-black/20 p-3">
                      <p className="text-emerald-200">Monthly revenue</p>
                      <p className="text-lg font-semibold">$4,320</p>
                    </div>
                    <div className="rounded-lg bg-black/20 p-3">
                      <p className="text-emerald-200">Conversion</p>
                      <p className="text-lg font-semibold">3.1%</p>
                    </div>
                    <div className="rounded-lg bg-black/20 p-3">
                      <p className="text-emerald-200">Top product</p>
                      <p>Parametric bracket kit</p>
                    </div>
                  </div>
                  <div className="rounded-lg bg-black/25 p-3 text-xs">
                    <p className="text-emerald-200 mb-1">Manufacturing ready</p>
                    <p>Instant DFM checks and AI quotes for every upload.</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing Section - three tiers */}
      <section
        id="pricing"
        className="py-16 lg:py-24"
        style={{ backgroundColor: colors.bgPrimary }}
      >
        <div className="max-w-6xl mx-auto px-6 lg:px-20">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-heading font-bold mb-4" style={{ color: colors.textPrimary }}>
              Pricing that scales with you.
            </h2>
            <p className="text-base md:text-lg" style={{ color: colors.textSecondary }}>
              Start free, then grow into selling, storefronts, and teams — without switching tools.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-stretch">
            {/* Free */}
            <div className="rounded-2xl border p-6 flex flex-col shadow-sm" style={{ borderColor: colors.border, backgroundColor: 'rgba(255,255,255,0.03)' }}>
              <h3 className="text-lg font-heading font-semibold mb-1" style={{ color: colors.textPrimary }}>
                Free
              </h3>
              <p className="text-sm mb-4" style={{ color: colors.textSecondary }}>
                Build &amp; browse.
              </p>
              <p className="text-3xl font-heading font-bold mb-2" style={{ color: colors.textPrimary }}>
                $0
              </p>
              <p className="text-xs uppercase tracking-wide mb-4" style={{ color: colors.textSecondary }}>
                For getting started.
              </p>
              <ul className="space-y-2 text-sm mb-6" style={{ color: colors.textSecondary }}>
                <li>Unlimited public projects</li>
                <li>500MB storage</li>
                <li>Public profile &amp; explore</li>
                <li>Basic search, comments &amp; stars</li>
                <li>1–2 private projects</li>
                <li>3 AI quote estimates / month</li>
                <li>Sell designs (15% commission)</li>
              </ul>
              <button
                onClick={scrollToWaitlist}
                className="mt-auto inline-flex items-center justify-center rounded-lg border px-4 py-2 text-sm font-medium"
                style={{ color: colors.textPrimary, borderColor: colors.border, backgroundColor: 'transparent' }}
              >
                Join waitlist
              </button>
            </div>

            {/* Creator - highlighted */}
            <div className="rounded-2xl border-2 p-6 flex flex-col shadow-lg relative transform md:-translate-y-4 overflow-visible" style={{ borderColor: colors.accent, backgroundColor: 'rgba(255,255,255,0.03)' }}>
              <div
                className="absolute -top-3 left-1/2 -translate-x-1/2 z-10 px-3 py-1 rounded-full text-xs font-medium"
                style={{ color: colors.accent, border: `2px solid ${colors.accent}`, backgroundColor: colors.bgPrimary }}
              >
                Most popular
              </div>
              <h3 className="text-lg font-heading font-semibold mb-1" style={{ color: colors.textPrimary }}>
                Creator
              </h3>
              <p className="text-sm mb-4" style={{ color: colors.textSecondary }}>
                Sell &amp; earn.
              </p>
              <p className="text-3xl font-heading font-bold mb-2" style={{ color: colors.textPrimary }}>
                $15<span className="text-base font-normal">/month</span>
              </p>
              <p className="text-xs uppercase tracking-wide mb-4" style={{ color: colors.textSecondary }}>
                For serious solo creators.
              </p>
              <ul className="space-y-2 text-sm mb-6" style={{ color: colors.textSecondary }}>
                <li>Everything in Free</li>
                <li>Sell designs in marketplace</li>
                <li>Personal storefront &amp; Stripe payouts</li>
                <li>AI manufacturing quotes</li>
                <li>Licensing controls &amp; reviews</li>
                <li>Sales analytics &amp; featured eligibility</li>
                <li>Lower platform fees (5%)</li>
                <li>More private projects, 50GB storage</li>
              </ul>
              <button
                onClick={scrollToWaitlist}
                className="mt-auto inline-flex items-center justify-center rounded-lg px-4 py-2 text-sm font-medium shadow-sm"
                style={{ backgroundColor: colors.accent, color: '#0B0E14' }}
              >
                Join Creator waitlist
              </button>
            </div>

            {/* Studio */}
            <div className="rounded-2xl border p-6 flex flex-col shadow-sm" style={{ borderColor: colors.border, backgroundColor: 'rgba(255,255,255,0.03)' }}>
              <h3 className="text-lg font-heading font-semibold mb-1" style={{ color: colors.textPrimary }}>
                Studio
              </h3>
              <p className="text-sm mb-4" style={{ color: colors.textSecondary }}>
                Teams &amp; scaling.
              </p>
              <p className="text-3xl font-heading font-bold mb-2" style={{ color: colors.textPrimary }}>
                $49<span className="text-base font-normal">/month</span>
              </p>
              <p className="text-xs uppercase tracking-wide mb-4" style={{ color: colors.textSecondary }}>
                For studios &amp; teams.
              </p>
              <ul className="space-y-2 text-sm mb-6" style={{ color: colors.textSecondary }}>
                <li>Everything in Creator</li>
                <li>10 team members in storefront</li>
                <li>Team folders &amp; role-based permissions</li>
                <li>Shared analytics &amp; collaboration</li>
                <li>Priority quoting</li>
                <li>Shared storefront brand</li>
                <li>200GB storage</li>
                <li>API access</li>
              </ul>
              <button
                onClick={scrollToWaitlist}
                className="mt-auto inline-flex items-center justify-center rounded-lg border px-4 py-2 text-sm font-medium"
                style={{ color: colors.textPrimary, borderColor: colors.border, backgroundColor: 'transparent' }}
              >
                Talk to sales
              </button>
            </div>
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
          backgroundColor: colors.bgPrimary,
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
      </main>
    </div>
  );
}
