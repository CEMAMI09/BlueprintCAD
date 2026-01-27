'use client';

import React from 'react';
import ScrollReveal from './ScrollReveal';

export default function Testimonial() {
  return (
    <section id="testimonials" className="section">
      <div className="container">
        <ScrollReveal>
          <div className="max-w-4xl mx-auto text-center">
            {/* Large Quote Text */}
            <blockquote className="mb-8" style={{ marginBottom: '32px' }}>
              <p 
                className="text-[#FAFAFA] italic"
                style={{
                  fontFamily: 'var(--font-primary)',
                  fontSize: 'clamp(32px, 4vw, 48px)',
                  fontWeight: 700,
                  lineHeight: 1.3
                }}
              >
                "BlueprintCAD has transformed how our engineering team collaborates. 
                The real-time features and version control are game-changers."
              </p>
            </blockquote>
            
            {/* Attribution */}
            <div className="flex flex-col items-center gap-2">
              <div className="font-semibold text-[#FAFAFA]" style={{ fontFamily: 'var(--font-secondary)', fontSize: '18px', fontWeight: 600 }}>
                Sarah Chen
              </div>
              <div className="text-[#9CA3AF] text-sm" style={{ fontSize: '14px' }}>
                Engineering Director, TechCorp
              </div>
            </div>
            
            {/* Optional Company Logo */}
            <div className="mt-8 flex justify-center" style={{ marginTop: '32px' }}>
              <div className="w-24 h-12 bg-[#374151] rounded flex items-center justify-center">
                <span className="text-xs text-[#9CA3AF]">Company Logo</span>
              </div>
            </div>
          </div>
        </ScrollReveal>
      </div>
    </section>
  );
}
