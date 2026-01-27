'use client';

import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import ScrollReveal from './ScrollReveal';

export default function Hero() {
  return (
    <>
      {/* Gradient image at the very top, full-width */}
      <div className="w-full">
        <Image
          src="/gradiant.svg"
          alt="BlueprintCAD gradient background"
          priority
          width={2560}
          height={1440}
          style={{ width: '100%', height: 'auto', display: 'block' }}
        />
      </div>

      {/* Hero content below the gradient image */}
      <section
        className="section-large"
        style={{ paddingTop: '80px', paddingBottom: '120px' }}
      >
        <div className="container hero-container">
          <ScrollReveal>
            <div className="flex flex-col lg:flex-row items-center gap-12 lg:gap-16">
              {/* Left: Text content */}
              <div className="w-full lg:w-1/2 text-center lg:text-left">
                <h1 className="hero-headline mb-8 lg:mb-10">
                  The Future of CAD Collaboration
                </h1>
                <p className="text-base lg:text-lg text-gray-300 max-w-xl mx-auto lg:mx-0 mb-8">
                  BlueprintCAD gives engineering teams real-time 3D collaboration,
                  version control, and insights built for modern product workflows.
                </p>
                <div className="flex flex-col sm:flex-row items-center lg:items-start justify-center lg:justify-start gap-4">
                  <Link href="/register" className="btn-primary">
                    Get Started
                  </Link>
                  <Link href="#features" className="btn-secondary">
                    Learn More
                  </Link>
                </div>
              </div>

              {/* Right: Hero Image/Visual */}
              <div className="w-full lg:w-1/2">
                <div
                  className="image-hero mx-auto"
                  style={{
                    width: '1140px',
                    height: '570px',
                    borderRadius: '24px',
                    overflow: 'hidden',
                    transform: 'translateX(12%)',
                  }}
                >
                  <Image
                    src="/thumbnail.svg"
                    alt="BlueprintCAD hero visual"
                    width={1140}
                    height={570}
                    priority
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  />
                </div>
              </div>
            </div>
          </ScrollReveal>
        </div>
      </section>
    </>
  );
}
