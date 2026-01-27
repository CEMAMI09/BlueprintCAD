'use client';

import React from 'react';
import Link from 'next/link';
import { Twitter, Github, Linkedin } from 'lucide-react';

export default function Footer() {
  return (
    <footer className="bg-[#24272e] border-t border-gray-600" style={{ borderTop: '1px solid #404040' }}>
      <div className="container py-16" style={{ paddingTop: '64px', paddingBottom: '64px' }}>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-12 mb-12" style={{ marginBottom: '48px' }}>
          {/* Brand */}
          <div>
            <div className="text-lg font-semibold text-[#FAFAFA] mb-4" style={{ fontSize: '18px', fontWeight: 600, marginBottom: '16px' }}>
              BlueprintCAD
            </div>
            <p className="small-text text-[#9CA3AF]">
              The future of CAD collaboration for modern engineering teams.
            </p>
          </div>
          
          {/* Product */}
          <div>
            <h4 className="font-semibold text-[#FAFAFA] mb-4" style={{ marginBottom: '16px', fontFamily: 'var(--font-secondary)', fontSize: '14px', fontWeight: 600 }}>
              Product
            </h4>
            <ul className="space-y-2">
              <li><Link href="#features" className="small-text text-[#9CA3AF] hover:text-[#3B82F6] transition-colors">Features</Link></li>
              <li><Link href="#how-it-works" className="small-text text-[#9CA3AF] hover:text-[#3B82F6] transition-colors">How It Works</Link></li>
              <li><Link href="/pricing" className="small-text text-[#9CA3AF] hover:text-[#3B82F6] transition-colors">Pricing</Link></li>
              <li><Link href="/docs" className="small-text text-[#9CA3AF] hover:text-[#3B82F6] transition-colors">Documentation</Link></li>
            </ul>
          </div>
          
          {/* Company */}
          <div>
            <h4 className="font-semibold text-[#FAFAFA] mb-4" style={{ marginBottom: '16px', fontFamily: 'var(--font-secondary)', fontSize: '14px', fontWeight: 600 }}>
              Company
            </h4>
            <ul className="space-y-2">
              <li><Link href="/about" className="small-text text-[#9CA3AF] hover:text-[#3B82F6] transition-colors">About</Link></li>
              <li><Link href="/blog" className="small-text text-[#9CA3AF] hover:text-[#3B82F6] transition-colors">Blog</Link></li>
              <li><Link href="/careers" className="small-text text-[#9CA3AF] hover:text-[#3B82F6] transition-colors">Careers</Link></li>
              <li><Link href="/contact" className="small-text text-[#9CA3AF] hover:text-[#3B82F6] transition-colors">Contact</Link></li>
            </ul>
          </div>
          
          {/* Connect */}
          <div>
            <h4 className="font-semibold text-[#FAFAFA] mb-4" style={{ marginBottom: '16px', fontFamily: 'var(--font-secondary)', fontSize: '14px', fontWeight: 600 }}>
              Connect
            </h4>
            <div className="flex gap-4">
              <Link href="#" className="text-[#9CA3AF] hover:text-[#3B82F6] transition-colors">
                <Twitter size={20} strokeWidth={1.5} />
              </Link>
              <Link href="#" className="text-[#9CA3AF] hover:text-[#3B82F6] transition-colors">
                <Github size={20} strokeWidth={1.5} />
              </Link>
              <Link href="#" className="text-[#9CA3AF] hover:text-[#3B82F6] transition-colors">
                <Linkedin size={20} strokeWidth={1.5} />
              </Link>
            </div>
          </div>
        </div>
        
        {/* Bottom Bar */}
        <div className="pt-8 border-t border-gray-600 flex flex-col md:flex-row justify-between items-center gap-4" style={{ paddingTop: '32px', borderTop: '1px solid #404040' }}>
          <p className="small-text text-[#9CA3AF]">
            © 2026 BlueprintCAD. All rights reserved.
          </p>
          <div className="flex gap-6">
            <Link href="/privacy" className="small-text text-[#9CA3AF] hover:text-[#3B82F6] transition-colors">Privacy Policy</Link>
            <Link href="/terms" className="small-text text-[#9CA3AF] hover:text-[#3B82F6] transition-colors">Terms of Service</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
