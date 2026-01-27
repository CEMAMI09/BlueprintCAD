'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Menu, X, ArrowUp } from 'lucide-react';

export default function Navbar() {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const middleNavRef = useRef<HTMLDivElement>(null);
  const navRef = useRef<HTMLElement>(null);
  const [initialTop, setInitialTop] = useState<number | null>(null);
  const positionLocked = useRef(false);

  // Capture the initial position once when page loads - lock it forever
  useEffect(() => {
    if (positionLocked.current) return;
    
    const captureInitialPosition = () => {
      if (middleNavRef.current && navRef.current && window.scrollY === 0 && !positionLocked.current) {
        const navRect = navRef.current.getBoundingClientRect();
        const middleRect = middleNavRef.current.getBoundingClientRect();
        // Use the middle nav's top position, rounded to avoid subpixel issues
        const top = Math.round(middleRect.top);
        setInitialTop(top);
        positionLocked.current = true;
      }
    };

    // Capture after multiple render cycles to ensure layout is complete
    const timeouts = [
      setTimeout(captureInitialPosition, 0),
      setTimeout(captureInitialPosition, 50),
      setTimeout(captureInitialPosition, 100),
      setTimeout(captureInitialPosition, 200),
    ];
    
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        requestAnimationFrame(captureInitialPosition);
      });
    });
    
    return () => timeouts.forEach(clearTimeout);
  }, []);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 10);
    };
    
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const scrollToTop = () => {
    const startPosition = window.pageYOffset;
    const startTime = performance.now();
    const duration = 800; // milliseconds

    const easeInOutCubic = (t: number): number => {
      return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
    };

    const animateScroll = (currentTime: number) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const ease = easeInOutCubic(progress);
      
      window.scrollTo(0, startPosition * (1 - ease));
      
      if (progress < 1) {
        requestAnimationFrame(animateScroll);
      }
    };

    requestAnimationFrame(animateScroll);
  };

  return (
    <>
      <nav 
        ref={navRef}
        className="relative z-[1000] bg-transparent"
        style={{ height: '80px' }}
      >
        <div className="container h-full relative flex items-center">
          {/* Left: Logo and Text */}
          <div className="flex-1 flex items-center">
            <Link href="/" className="flex items-center gap-3">
              <Image 
                src="/bpcube3.png.png" 
                alt="BlueprintCAD Logo" 
                width={32} 
                height={32}
                className="object-contain"
              />
              <span className="text-lg font-semibold text-[#FAFAFA]" style={{ fontSize: '18px', fontWeight: 600 }}>
                BlueprintCAD
              </span>
            </Link>
          </div>

          {/* Middle: Navigation Links - Absolutely centered (hidden when scrolled) */}
          <div 
            ref={middleNavRef}
            className={`hidden md:flex items-center gap-2 px-4 py-2 rounded-full absolute left-1/2 transform -translate-x-1/2 ${
              isScrolled ? 'invisible pointer-events-none' : 'visible'
            }`}
          >
            <Link href="#features" className="text-sm font-medium text-[#FAFAFA] hover:text-[#3B82F6] transition-colors px-4 py-2" style={{ fontSize: '14px', fontWeight: 500 }}>
              Features
            </Link>
            <Link href="#how-it-works" className="text-sm font-medium text-[#FAFAFA] hover:text-[#3B82F6] transition-colors px-4 py-2" style={{ fontSize: '14px', fontWeight: 500 }}>
              How It Works
            </Link>
            <Link href="#testimonials" className="text-sm font-medium text-[#FAFAFA] hover:text-[#3B82F6] transition-colors px-4 py-2" style={{ fontSize: '14px', fontWeight: 500 }}>
              Testimonials
            </Link>
          </div>

          {/* Right: Log In and Get Started */}
          <div className="flex-1 hidden md:flex items-center justify-end gap-4">
            <Link href="/login" className="text-sm font-medium text-[#FAFAFA] hover:text-[#3B82F6] transition-colors" style={{ fontSize: '14px', fontWeight: 500 }}>
              Log In
            </Link>
            <Link href="/register" className="btn-primary">
              Get Started
            </Link>
          </div>

          {/* Mobile Menu Button */}
          <button
            className="md:hidden text-[#FAFAFA] ml-auto"
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            aria-label="Toggle menu"
          >
            {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>

        {/* Mobile Menu */}
        {isMobileMenuOpen && (
          <div className="md:hidden bg-[#24272e] border-t border-gray-600">
            <div className="container py-6 flex flex-col gap-4">
              <Link href="#features" className="text-sm font-medium text-[#FAFAFA]" onClick={() => setIsMobileMenuOpen(false)}>
                Features
              </Link>
              <Link href="#how-it-works" className="text-sm font-medium text-[#FAFAFA]" onClick={() => setIsMobileMenuOpen(false)}>
                How It Works
              </Link>
              <Link href="#testimonials" className="text-sm font-medium text-[#FAFAFA]" onClick={() => setIsMobileMenuOpen(false)}>
                Testimonials
              </Link>
              <Link href="/login" className="text-sm font-medium text-[#FAFAFA]" onClick={() => setIsMobileMenuOpen(false)}>
                Log In
              </Link>
              <Link href="/register" className="btn-primary w-fit" onClick={() => setIsMobileMenuOpen(false)}>
                Get Started
              </Link>
            </div>
          </div>
        )}
      </nav>
      
      {/* Sticky Middle Navigation - Fixed at exact initial position, always in DOM */}
      <div 
        className="fixed z-[1001] hidden md:block"
        style={{
          top: initialTop !== null ? `${initialTop}px` : '0px',
          left: '50%',
          transform: 'translateX(-50%)',
          visibility: isScrolled && initialTop !== null ? 'visible' : 'hidden',
          pointerEvents: isScrolled && initialTop !== null ? 'auto' : 'none',
          position: 'fixed',
          margin: 0,
          padding: 0,
        }}
      >
          <div className="relative flex items-center gap-2 py-2 rounded-full bg-[#24272e]/60 backdrop-blur-md" style={{ paddingLeft: '16px', paddingRight: '48px' }}>
            <Link href="#features" className="text-sm font-medium text-[#FAFAFA] hover:text-[#3B82F6] transition-colors px-4 py-2" style={{ fontSize: '14px', fontWeight: 500 }}>
              Features
            </Link>
            <Link href="#how-it-works" className="text-sm font-medium text-[#FAFAFA] hover:text-[#3B82F6] transition-colors px-4 py-2" style={{ fontSize: '14px', fontWeight: 500 }}>
              How It Works
            </Link>
            <Link href="#testimonials" className="text-sm font-medium text-[#FAFAFA] hover:text-[#3B82F6] transition-colors px-4 py-2" style={{ fontSize: '14px', fontWeight: 500 }}>
              Testimonials
            </Link>
            <button
              onClick={scrollToTop}
              className="absolute p-2 rounded-full hover:bg-[#24272e]/40 transition-all duration-300 flex items-center justify-center"
              aria-label="Scroll to top"
              style={{ 
                right: '8px',
                opacity: isScrolled ? 1 : 0,
                transform: isScrolled ? 'translateX(0)' : 'translateX(-10px)',
                pointerEvents: isScrolled ? 'auto' : 'none',
              }}
            >
              <ArrowUp size={18} className="text-[#FAFAFA]" />
            </button>
          </div>
      </div>
    </>
  );
}
