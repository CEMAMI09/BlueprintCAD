'use client';

import React from 'react';
import Link from 'next/link';
import { Check } from 'lucide-react';
import ScrollReveal from './ScrollReveal';

const benefits = [
  'Real-time 3D collaboration with your team',
  'Version control for all your CAD files',
  'Advanced analytics and insights',
  'Enterprise-grade security and compliance',
  'Seamless integration with your workflow'
];

export default function SplitContent() {
  return (
    <section className="section">
      <div className="container">
        <ScrollReveal>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center" style={{ gap: '96px' }}>
            {/* Image Side */}
            <div className="image-feature w-full order-2 lg:order-1">
            <div className="w-full h-full bg-gradient-to-br from-[#1E3A8A] to-[#3B82F6] flex items-center justify-center rounded-[16px]">
              <span className="text-white text-lg font-medium">Feature Image Placeholder</span>
            </div>
            </div>
            
            {/* Text Side */}
            <div className="order-1 lg:order-2">
              <div className="overline mb-4 text-[#9CA3AF]" style={{ marginBottom: '16px' }}>
                Why BlueprintCAD
              </div>
              
              <h2 className="section-title mb-6" style={{ marginBottom: '24px' }}>
                Built for Modern Engineering Teams
              </h2>
              
              <p className="body-text mb-8 text-[#9CA3AF]" style={{ marginBottom: '32px' }}>
                BlueprintCAD brings the power of modern collaboration tools to CAD design. 
                Work together seamlessly, track every change, and build better products faster.
              </p>
              
              {/* List Items */}
              <ul className="space-y-4 mb-8" style={{ marginBottom: '32px' }}>
                {benefits.map((benefit, index) => (
                  <li key={index} className="flex items-start gap-3">
                    <Check size={20} className="text-[#3B82F6] mt-1 flex-shrink-0" strokeWidth={2} />
                    <span className="body-text text-[#9CA3AF]">{benefit}</span>
                  </li>
                ))}
              </ul>
              
              {/* Optional CTA */}
              <Link href="/register" className="btn-primary inline-block">
                Get Started
              </Link>
            </div>
          </div>
        </ScrollReveal>
      </div>
    </section>
  );
}
