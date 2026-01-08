'use client';

import Link from 'next/link';

// Design system colors
const colors = {
  bgPrimary: '#0B0E14',
  textPrimary: '#E6EAF0',
  textSecondary: '#9BA3AF',
  accent: '#4F7DFF',
  border: 'rgba(255,255,255,0.06)',
};

export default function PrivacyPage() {
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
          className="text-4xl md:text-5xl font-bold mb-8"
          style={{
            color: colors.textPrimary,
            fontWeight: 700,
            letterSpacing: '-0.01em',
          }}
        >
          Privacy Policy
        </h1>

        <p
          className="text-sm mb-12"
          style={{ color: colors.textSecondary }}
        >
          Last updated: {new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
        </p>

        <div
          className="prose prose-invert max-w-none space-y-8"
          style={{
            color: colors.textSecondary,
            lineHeight: '1.7',
          }}
        >
          <section>
            <h2
              className="text-2xl font-bold mb-4 mt-12"
              style={{ color: colors.textPrimary }}
            >
              Introduction
            </h2>
            <p>
              BlueprintCAD ("we," "our," or "us") is committed to protecting your privacy. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you visit our website and use our services.
            </p>
          </section>

          <section>
            <h2
              className="text-2xl font-bold mb-4 mt-12"
              style={{ color: colors.textPrimary }}
            >
              Information We Collect
            </h2>
            <h3
              className="text-xl font-semibold mb-3 mt-6"
              style={{ color: colors.textPrimary }}
            >
              Personal Information
            </h3>
            <p>We may collect personal information that you provide to us, including:</p>
            <ul className="list-disc pl-6 space-y-2 mt-4">
              <li>Name and contact information (email address, phone number)</li>
              <li>Account credentials and profile information</li>
              <li>Payment and billing information</li>
              <li>CAD files and design content you upload</li>
              <li>Communication preferences</li>
            </ul>

            <h3
              className="text-xl font-semibold mb-3 mt-6"
              style={{ color: colors.textPrimary }}
            >
              Automatically Collected Information
            </h3>
            <p>When you use our services, we may automatically collect:</p>
            <ul className="list-disc pl-6 space-y-2 mt-4">
              <li>Device information and identifiers</li>
              <li>IP address and location data</li>
              <li>Browser type and version</li>
              <li>Usage data and analytics</li>
              <li>Cookies and similar tracking technologies</li>
            </ul>
          </section>

          <section>
            <h2
              className="text-2xl font-bold mb-4 mt-12"
              style={{ color: colors.textPrimary }}
            >
              How We Use Your Information
            </h2>
            <p>We use the information we collect to:</p>
            <ul className="list-disc pl-6 space-y-2 mt-4">
              <li>Provide, maintain, and improve our services</li>
              <li>Process transactions and manage your account</li>
              <li>Send you service-related communications</li>
              <li>Respond to your inquiries and provide customer support</li>
              <li>Detect and prevent fraud or abuse</li>
              <li>Comply with legal obligations</li>
              <li>Send you marketing communications (with your consent)</li>
            </ul>
          </section>

          <section>
            <h2
              className="text-2xl font-bold mb-4 mt-12"
              style={{ color: colors.textPrimary }}
            >
              Information Sharing and Disclosure
            </h2>
            <p>We do not sell your personal information. We may share your information in the following circumstances:</p>
            <ul className="list-disc pl-6 space-y-2 mt-4">
              <li>With service providers who assist us in operating our platform</li>
              <li>When you make your designs public or share them with others</li>
              <li>To comply with legal requirements or protect our rights</li>
              <li>In connection with a business transfer or merger</li>
              <li>With your explicit consent</li>
            </ul>
          </section>

          <section>
            <h2
              className="text-2xl font-bold mb-4 mt-12"
              style={{ color: colors.textPrimary }}
            >
              Data Security
            </h2>
            <p>
              We implement appropriate technical and organizational measures to protect your personal information. However, no method of transmission over the Internet or electronic storage is 100% secure, and we cannot guarantee absolute security.
            </p>
          </section>

          <section>
            <h2
              className="text-2xl font-bold mb-4 mt-12"
              style={{ color: colors.textPrimary }}
            >
              Your Rights
            </h2>
            <p>Depending on your location, you may have certain rights regarding your personal information, including:</p>
            <ul className="list-disc pl-6 space-y-2 mt-4">
              <li>The right to access your personal information</li>
              <li>The right to correct inaccurate information</li>
              <li>The right to delete your information</li>
              <li>The right to object to processing</li>
              <li>The right to data portability</li>
              <li>The right to withdraw consent</li>
            </ul>
            <p className="mt-4">
              To exercise these rights, please contact us at{' '}
              <a
                href="mailto:info.blueprintcad@gmail.com"
                className="transition-all hover:opacity-80"
                style={{ color: colors.accent }}
              >
                info.blueprintcad@gmail.com
              </a>
            </p>
          </section>

          <section>
            <h2
              className="text-2xl font-bold mb-4 mt-12"
              style={{ color: colors.textPrimary }}
            >
              Cookies and Tracking Technologies
            </h2>
            <p>
              We use cookies and similar tracking technologies to enhance your experience, analyze usage, and assist in marketing efforts. You can control cookies through your browser settings.
            </p>
          </section>

          <section>
            <h2
              className="text-2xl font-bold mb-4 mt-12"
              style={{ color: colors.textPrimary }}
            >
              Children's Privacy
            </h2>
            <p>
              Our services are not intended for children under the age of 13. We do not knowingly collect personal information from children under 13. If we become aware that we have collected such information, we will take steps to delete it.
            </p>
          </section>

          <section>
            <h2
              className="text-2xl font-bold mb-4 mt-12"
              style={{ color: colors.textPrimary }}
            >
              Changes to This Privacy Policy
            </h2>
            <p>
              We may update this Privacy Policy from time to time. We will notify you of any material changes by posting the new Privacy Policy on this page and updating the "Last updated" date.
            </p>
          </section>

          <section>
            <h2
              className="text-2xl font-bold mb-4 mt-12"
              style={{ color: colors.textPrimary }}
            >
              Contact Us
            </h2>
            <p>
              If you have questions about this Privacy Policy, please contact us:
            </p>
            <div className="mt-4 space-y-2">
              <p>
                Email:{' '}
                <a
                  href="mailto:info.blueprintcad@gmail.com"
                  className="transition-all hover:opacity-80"
                  style={{ color: colors.accent }}
                >
                  info.blueprintcad@gmail.com
                </a>
              </p>
              <p>
                Phone:{' '}
                <a
                  href="tel:+17252127230"
                  className="transition-all hover:opacity-80"
                  style={{ color: colors.accent }}
                >
                  (725) 212-7230
                </a>
              </p>
            </div>
          </section>
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

