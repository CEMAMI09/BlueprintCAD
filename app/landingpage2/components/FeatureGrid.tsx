'use client';

import React from 'react';
import ScrollReveal from './ScrollReveal';
import { Cloud, Users, GitBranch, BarChart3, Shield, Zap } from 'lucide-react';

const features = [
  {
    icon: Cloud,
    title: 'Real-Time Collaboration',
    description: 'Work together on 3D models in real-time with your team, no matter where they are.'
  },
  {
    icon: GitBranch,
    title: 'Version Control',
    description: 'Track every change, branch your designs, and merge with confidence using Git-like workflows.'
  },
  {
    icon: BarChart3,
    title: 'Advanced Analytics',
    description: 'Get insights into your design process with detailed analytics and performance metrics.'
  },
  {
    icon: Users,
    title: 'Team Management',
    description: 'Organize your team with roles, permissions, and shared workspaces for seamless collaboration.'
  },
  {
    icon: Shield,
    title: 'Enterprise Security',
    description: 'Bank-level encryption and security features to keep your designs safe and compliant.'
  },
  {
    icon: Zap,
    title: 'Lightning Fast',
    description: 'Optimized for performance with instant loading and smooth interactions, even with large files.'
  }
];

export default function FeatureGrid() {
  return (
    <section id="features" className="section">
      <div className="container">
        <ScrollReveal>
          {/* Section Label */}
          <div className="overline text-center mb-4 text-[#9CA3AF]" style={{ marginBottom: '16px' }}>
            Features
          </div>
          
          {/* Section Title */}
          <h2 className="section-title text-center mb-16" style={{ marginBottom: '64px' }}>
            Everything You Need to Build Better
          </h2>
          
          {/* Feature Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-12" style={{ gap: '48px' }}>
            {features.map((feature, index) => {
              const Icon = feature.icon;
              return (
                <div 
                  key={index} 
                  className="text-center p-8 rounded-lg border border-[#374151] bg-[#1F2937]/50 hover:bg-[#1F2937]/70 transition-colors" 
                  style={{ 
                    padding: '32px',
                    borderRadius: '8px',
                  }}
                >
                  {/* Icon */}
                  <div className="mb-6 flex justify-center" style={{ marginBottom: '24px' }}>
                    <div className="w-16 h-16 rounded-full bg-[#374151] flex items-center justify-center">
                      <Icon size={24} strokeWidth={1.5} className="text-[#3B82F6]" />
                    </div>
                  </div>
                  
                  {/* Title */}
                  <h4 className="card-title mb-4" style={{ marginBottom: '16px' }}>
                    {feature.title}
                  </h4>
                  
                  {/* Description */}
                  <p className="body-text text-[#9CA3AF]">
                    {feature.description}
                  </p>
                </div>
              );
            })}
          </div>
        </ScrollReveal>
      </div>
    </section>
  );
}
