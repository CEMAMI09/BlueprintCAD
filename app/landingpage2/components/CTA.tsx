'use client';

import React from 'react';
import Link from 'next/link';
import ScrollReveal from './ScrollReveal';

export default function CTA() {
  return (
    <section className="section bg-[#24272e]" style={{ paddingTop: '120px', paddingBottom: '120px' }}>
      <div className="container">
        <ScrollReveal>
          <div className="max-w-3xl mx-auto text-center">
            {/* Headline */}
            <h2 className="section-title mb-6" style={{ marginBottom: '24px' }}>
              Ready to Transform Your CAD Workflow?
            </h2>
            
            {/* Subheading */}
            <p className="body-text mb-10 text-[#9CA3AF]" style={{ marginBottom: '48px', maxWidth: '600px', marginLeft: 'auto', marginRight: 'auto' }}>
              Join thousands of engineering teams already using BlueprintCAD to build better products faster.
            </p>
            
            {/* Primary Button */}
            <Link href="/register" className="btn-primary">
              Get Started
            </Link>
          </div>
        </ScrollReveal>
      </div>
    </section>
  );
}
