'use client';

import React from 'react';
import ScrollReveal from './ScrollReveal';

const steps = [
  {
    number: '01',
    title: 'Upload Your Designs',
    description: 'Import your CAD files in any format. We support STL, OBJ, STEP, and more.'
  },
  {
    number: '02',
    title: 'Collaborate in Real-Time',
    description: 'Invite your team and work together on designs with live updates and comments.'
  },
  {
    number: '03',
    title: 'Track & Analyze',
    description: 'Monitor changes, view analytics, and optimize your design workflow.'
  }
];

export default function NumberedSteps() {
  return (
    <section id="how-it-works" className="section bg-[#24272e]">
      <div className="container">
        <ScrollReveal>
          {/* Section Label */}
          <div className="overline text-center mb-4 text-[#9CA3AF]" style={{ marginBottom: '16px' }}>
            How It Works
          </div>
          
          {/* Section Title */}
          <h2 className="section-title text-center mb-16" style={{ marginBottom: '64px' }}>
            Get Started in Three Simple Steps
          </h2>
          
          {/* Steps Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-12" style={{ gap: '64px' }}>
            {steps.map((step, index) => (
              <div key={index} className="text-center">
                {/* Large Number */}
                <div className="mb-6" style={{ marginBottom: '24px' }}>
                  <span 
                    className="text-[#3B82F6]"
                    style={{ 
                      fontFamily: 'var(--font-primary)',
                      fontSize: 'clamp(48px, 6vw, 72px)',
                      fontWeight: 700,
                      lineHeight: 1
                    }}
                  >
                    {step.number}
                  </span>
                </div>
                
                {/* Step Title */}
                <h3 className="subsection-title mb-4" style={{ marginBottom: '16px' }}>
                  {step.title}
                </h3>
                
                {/* Description */}
                <p className="body-text text-[#9CA3AF]">
                  {step.description}
                </p>
              </div>
            ))}
          </div>
        </ScrollReveal>
      </div>
    </section>
  );
}
