'use client';

import React from 'react';
import dynamic from 'next/dynamic';
import Image from 'next/image';

// Dynamically import components to avoid SSR issues
const Navbar = dynamic(() => import('./components/Navbar'), { ssr: false });
const Hero = dynamic(() => import('./components/Hero'), { ssr: false });
const LogoGrid = dynamic(() => import('./components/LogoGrid'), { ssr: false });
const FeatureGrid = dynamic(() => import('./components/FeatureGrid'), { ssr: false });
const SplitContent = dynamic(() => import('./components/SplitContent'), { ssr: false });
const NumberedSteps = dynamic(() => import('./components/NumberedSteps'), { ssr: false });
const Testimonial = dynamic(() => import('./components/Testimonial'), { ssr: false });
const CTA = dynamic(() => import('./components/CTA'), { ssr: false });
const Footer = dynamic(() => import('./components/Footer'), { ssr: false });

export default function LandingPage2() {
  return (
    <div className="landing-page2 min-h-screen bg-[#24272e]">
      <Navbar />
      <Hero />
      {/* Full-width gradient strip below hero */}
      <section className="w-full" style={{ position: 'relative', height: '320px' }}>
        <Image
          src="/gradiant.png"
          alt="BlueprintCAD gradient background"
          fill
          priority={false}
          style={{ objectFit: 'cover' }}
        />
      </section>
      <LogoGrid />
      <FeatureGrid />
      <SplitContent />
      <NumberedSteps />
      <Testimonial />
      <CTA />
      <Footer />
    </div>
  );
}
