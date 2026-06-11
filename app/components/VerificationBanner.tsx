'use client';

import { useState } from 'react';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/app/context/AuthContext';
import { DesignSystem as DS } from '@/backend/lib/ui/design-system';
import { Mail } from 'lucide-react';

const HIDE_PREFIXES = ['/verify-email', '/auth/verify-email', '/auth/verify-email-notice', '/login', '/register'];

export default function VerificationBanner() {
  const { user, refreshUser } = useAuth();
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [dismissed, setDismissed] = useState(false);
  const pathname = usePathname() || '';

  const hideRoute = HIDE_PREFIXES.some((p) => pathname === p || pathname.startsWith(`${p}/`));

  if (!user || user.email_verified || dismissed || hideRoute) {
    return null;
  }

  const handleResend = async () => {
    setLoading(true);
    setMessage(null);

    try {
      const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/auth/resend-verification`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        signal: AbortSignal.timeout(45_000),
      });

      const data = await res.json();

      if (res.ok) {
        setMessage({ type: 'success', text: data.message || 'Check your inbox for the link and code.' });
        await refreshUser();
      } else {
        setMessage({ type: 'error', text: data.error || 'Could not send email' });
      }
    } catch (e: unknown) {
      const aborted = e instanceof Error && e.name === 'AbortError';
      setMessage({
        type: 'error',
        text: aborted
          ? 'Request timed out. Try again or check that the server can send email.'
          : 'Failed to resend verification email',
      });
    } finally {
      setLoading(false);
    }
  };

  const blue = DS.colors.primary.blue;

  return (
    <div
      className="flex-shrink-0 border-b w-full min-w-0"
      style={{
        backgroundColor: `${blue}14`,
        borderColor: `${blue}40`,
      }}
    >
      <div className="w-full min-w-0 px-4 sm:px-6 py-3">
        <div className="flex flex-col gap-3 min-[480px]:flex-row min-[480px]:items-start min-[480px]:justify-between">
          <div className="flex items-start gap-3 min-w-0 flex-1">
            <div
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg"
              style={{ backgroundColor: `${blue}22`, color: blue }}
            >
              <Mail className="h-5 w-5" strokeWidth={1.75} />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium leading-snug" style={{ color: DS.colors.text.primary }}>
                Verify your email to unlock all features.
              </p>
              <p className="text-sm mt-0.5 leading-snug break-words" style={{ color: DS.colors.text.secondary }}>
                {message ? (
                  <span style={{ color: message.type === 'success' ? blue : DS.colors.accent.error }}>
                    {message.text}
                  </span>
                ) : (
                  <>We sent a link and a 6-digit code to <strong className="font-medium break-all">{user.email}</strong>.</>
                )}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0 self-end min-[480px]:self-auto pl-12 min-[480px]:pl-0">
            <button
              type="button"
              onClick={handleResend}
              disabled={loading}
              className="px-3 sm:px-4 py-1.5 rounded-lg text-sm font-medium transition disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center justify-center gap-2 whitespace-nowrap"
              style={{
                backgroundColor: blue,
                color: '#ffffff',
              }}
            >
              {loading ? (
                <>
                  <div
                    className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"
                    aria-hidden
                  />
                  Sending…
                </>
              ) : (
                'Resend email'
              )}
            </button>
            <button
              type="button"
              onClick={() => setDismissed(true)}
              className="p-1.5 rounded-lg transition hover:bg-white/5"
              style={{ color: DS.colors.text.secondary }}
              aria-label="Dismiss"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
