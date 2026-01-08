'use client';

import Link from 'next/link';
import { Mail, Phone } from 'lucide-react';

// Design system colors
const colors = {
  bgPrimary: '#0B0E14',
  textPrimary: '#E6EAF0',
  textSecondary: '#9BA3AF',
  accent: '#4F7DFF',
  border: 'rgba(255,255,255,0.06)',
};

export default function ContactPage() {

  return (
    <div
      className="min-h-screen flex flex-col"
      style={{ backgroundColor: colors.bgPrimary, color: colors.textPrimary }}
    >
      {/* Header */}
      <header className="border-b" style={{ borderColor: colors.border }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <Link href="/coming-soon" className="flex items-center">
              <img
                src="/bpcube3.png.png"
                alt="BlueprintCAD"
                className="w-auto"
                style={{ height: '30px' }}
              />
            </Link>
            <Link
              href="/coming-soon"
              className="text-sm transition-all hover:opacity-80"
              style={{ color: colors.textSecondary }}
            >
              Back to home
            </Link>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16 md:py-24">
        <h1
          className="text-4xl md:text-5xl font-bold mb-4"
          style={{
            color: colors.textPrimary,
            fontWeight: 700,
            letterSpacing: '-0.01em',
          }}
        >
          Contact Us
        </h1>
        <p
          className="text-lg mb-12"
          style={{ color: colors.textSecondary }}
        >
          Have questions or need help? We'd love to hear from you.
        </p>

        <div className="max-w-2xl">
          {/* Contact Information */}
          <div>
            <h2
              className="text-2xl font-bold mb-6"
              style={{ color: colors.textPrimary }}
            >
              Get in Touch
            </h2>
            <p
              className="mb-8"
              style={{ color: colors.textSecondary, lineHeight: '1.7' }}
            >
              Reach out to us through any of these channels. We typically respond within 24 hours.
            </p>

            <div className="space-y-6">
              <a
                href="mailto:info.blueprintcad@gmail.com"
                className="flex items-start gap-4 group transition-all"
              >
                <div
                  className="p-3 rounded-lg border transition-all group-hover:border-opacity-100"
                  style={{
                    borderColor: colors.border,
                    backgroundColor: `${colors.accent}10`,
                  }}
                >
                  <Mail size={20} style={{ color: colors.accent }} />
                </div>
                <div>
                  <h3
                    className="font-semibold mb-1 group-hover:opacity-80 transition-all"
                    style={{ color: colors.textPrimary }}
                  >
                    Email
                  </h3>
                  <p
                    className="transition-all group-hover:opacity-80"
                    style={{ color: colors.accent }}
                  >
                    info.blueprintcad@gmail.com
                  </p>
                </div>
              </a>

              <a
                href="tel:+17252127230"
                className="flex items-start gap-4 group transition-all"
              >
                <div
                  className="p-3 rounded-lg border transition-all group-hover:border-opacity-100"
                  style={{
                    borderColor: colors.border,
                    backgroundColor: `${colors.accent}10`,
                  }}
                >
                  <Phone size={20} style={{ color: colors.accent }} />
                </div>
                <div>
                  <h3
                    className="font-semibold mb-1 group-hover:opacity-80 transition-all"
                    style={{ color: colors.textPrimary }}
                  >
                    Phone
                  </h3>
                  <p
                    className="transition-all group-hover:opacity-80"
                    style={{ color: colors.accent }}
                  >
                    (725) 212-7230
                  </p>
                </div>
              </a>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer
        className="py-8 border-t mt-auto"
        style={{
          borderColor: colors.border,
        }}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
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
    </div>
  );
}

