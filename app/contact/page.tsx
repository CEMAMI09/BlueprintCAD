'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Mail, Phone, Send, Loader2 } from 'lucide-react';
import { apiFetch } from '@/lib/apiClient';

// Design system colors
const colors = {
  bgPrimary: '#0B0E14',
  textPrimary: '#E6EAF0',
  textSecondary: '#9BA3AF',
  accent: '#4F7DFF',
  accentHover: '#6A92FF',
  accentPressed: '#3B66F0',
  accentGlow: 'rgba(79,125,255,0.22)',
  border: 'rgba(255,255,255,0.06)',
  success: '#22C55E',
};

// Email validation regex
const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function ContactPage() {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    subject: '',
    message: '',
  });
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    // Basic validation
    if (!formData.name.trim() || !formData.email.trim() || !formData.message.trim()) {
      setError('Please fill in all required fields.');
      setLoading(false);
      return;
    }

    if (!emailRegex.test(formData.email)) {
      setError('Please enter a valid email address.');
      setLoading(false);
      return;
    }

    try {
      await apiFetch('/api/contact', {
        method: 'POST',
        body: JSON.stringify({
          name: formData.name.trim(),
          email: formData.email.trim(),
          subject: formData.subject.trim() || undefined,
          message: formData.message.trim(),
        }),
      });

      setSuccess(true);
      setFormData({ name: '', email: '', subject: '', message: '' });
      
      // Reset success message after 5 seconds
      setTimeout(() => setSuccess(false), 5000);
    } catch (err: any) {
      setError(err.message || 'Failed to send message. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    setError('');
  };

  return (
    <div
      className="min-h-screen"
      style={{ backgroundColor: colors.bgPrimary, color: colors.textPrimary }}
    >
      {/* Header */}
      <header className="border-b" style={{ borderColor: colors.border }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <Link href="/" className="flex items-center">
              <img
                src="/bpcube3.png.png"
                alt="BlueprintCAD"
                className="w-auto"
                style={{ height: '30px' }}
              />
            </Link>
            <Link
              href="/"
              className="text-sm transition-all hover:opacity-80"
              style={{ color: colors.textSecondary }}
            >
              Back to home
            </Link>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16 md:py-24">
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

        <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
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

          {/* Contact Form */}
          <div>
            <h2
              className="text-2xl font-bold mb-6"
              style={{ color: colors.textPrimary }}
            >
              Send a Message
            </h2>

            {success && (
              <div
                className="p-4 rounded-lg border mb-6"
                style={{
                  borderColor: colors.success,
                  backgroundColor: `${colors.success}10`,
                }}
              >
                <p style={{ color: colors.success }}>
                  Thank you! Your message has been sent. We'll get back to you soon.
                </p>
              </div>
            )}

            {error && (
              <div
                className="p-4 rounded-lg border mb-6"
                style={{
                  borderColor: '#EF4444',
                  backgroundColor: 'rgba(239, 68, 68, 0.1)',
                }}
              >
                <p style={{ color: '#EF4444' }}>{error}</p>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label
                  htmlFor="name"
                  className="block text-sm font-medium mb-2"
                  style={{ color: colors.textPrimary }}
                >
                  Name <span style={{ color: '#EF4444' }}>*</span>
                </label>
                <input
                  type="text"
                  id="name"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  required
                  className="w-full px-4 py-3 rounded-lg border transition-all"
                  style={{
                    backgroundColor: 'rgba(255,255,255,0.03)',
                    borderColor: error ? '#EF4444' : colors.border,
                    color: colors.textPrimary,
                  }}
                  onFocus={(e) => {
                    e.currentTarget.style.borderColor = colors.accent;
                    e.currentTarget.style.outline = 'none';
                    e.currentTarget.style.boxShadow = `0 0 0 3px ${colors.accentGlow}`;
                  }}
                  onBlur={(e) => {
                    e.currentTarget.style.borderColor = colors.border;
                    e.currentTarget.style.boxShadow = 'none';
                  }}
                />
              </div>

              <div>
                <label
                  htmlFor="email"
                  className="block text-sm font-medium mb-2"
                  style={{ color: colors.textPrimary }}
                >
                  Email <span style={{ color: '#EF4444' }}>*</span>
                </label>
                <input
                  type="email"
                  id="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  required
                  className="w-full px-4 py-3 rounded-lg border transition-all"
                  style={{
                    backgroundColor: 'rgba(255,255,255,0.03)',
                    borderColor: error ? '#EF4444' : colors.border,
                    color: colors.textPrimary,
                  }}
                  onFocus={(e) => {
                    e.currentTarget.style.borderColor = colors.accent;
                    e.currentTarget.style.outline = 'none';
                    e.currentTarget.style.boxShadow = `0 0 0 3px ${colors.accentGlow}`;
                  }}
                  onBlur={(e) => {
                    e.currentTarget.style.borderColor = colors.border;
                    e.currentTarget.style.boxShadow = 'none';
                  }}
                />
              </div>

              <div>
                <label
                  htmlFor="subject"
                  className="block text-sm font-medium mb-2"
                  style={{ color: colors.textPrimary }}
                >
                  Subject
                </label>
                <input
                  type="text"
                  id="subject"
                  name="subject"
                  value={formData.subject}
                  onChange={handleChange}
                  className="w-full px-4 py-3 rounded-lg border transition-all"
                  style={{
                    backgroundColor: 'rgba(255,255,255,0.03)',
                    borderColor: colors.border,
                    color: colors.textPrimary,
                  }}
                  onFocus={(e) => {
                    e.currentTarget.style.borderColor = colors.accent;
                    e.currentTarget.style.outline = 'none';
                    e.currentTarget.style.boxShadow = `0 0 0 3px ${colors.accentGlow}`;
                  }}
                  onBlur={(e) => {
                    e.currentTarget.style.borderColor = colors.border;
                    e.currentTarget.style.boxShadow = 'none';
                  }}
                />
              </div>

              <div>
                <label
                  htmlFor="message"
                  className="block text-sm font-medium mb-2"
                  style={{ color: colors.textPrimary }}
                >
                  Message <span style={{ color: '#EF4444' }}>*</span>
                </label>
                <textarea
                  id="message"
                  name="message"
                  value={formData.message}
                  onChange={handleChange}
                  required
                  rows={6}
                  className="w-full px-4 py-3 rounded-lg border transition-all resize-none"
                  style={{
                    backgroundColor: 'rgba(255,255,255,0.03)',
                    borderColor: error ? '#EF4444' : colors.border,
                    color: colors.textPrimary,
                  }}
                  onFocus={(e) => {
                    e.currentTarget.style.borderColor = colors.accent;
                    e.currentTarget.style.outline = 'none';
                    e.currentTarget.style.boxShadow = `0 0 0 3px ${colors.accentGlow}`;
                  }}
                  onBlur={(e) => {
                    e.currentTarget.style.borderColor = colors.border;
                    e.currentTarget.style.boxShadow = 'none';
                  }}
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full px-6 py-3 rounded-lg font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                style={{
                  backgroundColor: colors.accent,
                  color: '#0B0E14',
                  height: '48px',
                }}
                onMouseEnter={(e) => {
                  if (!loading) {
                    e.currentTarget.style.backgroundColor = colors.accentHover;
                    e.currentTarget.style.transform = 'translateY(-1px)';
                    e.currentTarget.style.boxShadow = `0 4px 12px ${colors.accentGlow}`;
                  }
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = colors.accent;
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = 'none';
                }}
                onMouseDown={(e) => {
                  if (!loading) {
                    e.currentTarget.style.backgroundColor = colors.accentPressed;
                    e.currentTarget.style.transform = 'translateY(0)';
                  }
                }}
                onMouseUp={(e) => {
                  if (!loading) {
                    e.currentTarget.style.backgroundColor = colors.accentHover;
                    e.currentTarget.style.transform = 'translateY(-1px)';
                  }
                }}
              >
                {loading ? (
                  <>
                    <Loader2 size={20} className="animate-spin" />
                    Sending...
                  </>
                ) : (
                  <>
                    Send Message
                    <Send size={18} />
                  </>
                )}
              </button>
            </form>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer
        className="py-8 border-t mt-16"
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

