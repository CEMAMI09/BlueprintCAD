'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Layout from '@/components/Layout';
import { useAuth } from '@/app/context/AuthContext';
import { DesignSystem as DS } from '@/backend/lib/ui/design-system';

type Status = 'idle' | 'loading' | 'success' | 'error';

export default function VerifyEmail() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { refreshUser } = useAuth();
  const [status, setStatus] = useState<Status>('loading');
  const [message, setMessage] = useState('');
  const [code, setCode] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const tokenHandled = useRef(false);

  const apiUrl = process.env.NEXT_PUBLIC_API_URL;

  async function runVerify(body: { token: string } | { code: string }) {
    setStatus('loading');
    setMessage('');
    try {
      const res = await fetch(`${apiUrl}/api/auth/verify-email`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (res.ok) {
        setStatus('success');
        setMessage(data.message || 'Email verified successfully.');
        const storedUser = localStorage.getItem('user');
        if (storedUser) {
          const user = JSON.parse(storedUser);
          user.email_verified = true;
          localStorage.setItem('user', JSON.stringify(user));
          window.dispatchEvent(new Event('userChanged'));
        }
        await refreshUser();
        setTimeout(() => router.push('/dashboard'), 2500);
      } else {
        setStatus('error');
        setMessage(data.error || 'Verification failed');
      }
    } catch {
      setStatus('error');
      setMessage('An error occurred during verification');
    }
  }

  useEffect(() => {
    const token = searchParams?.get('token');
    if (token && !tokenHandled.current) {
      tokenHandled.current = true;
      runVerify({ token });
    } else if (!token) {
      setStatus('idle');
      setMessage('');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- run once for link token
  }, [searchParams]);

  const submitCode = async (e: React.FormEvent) => {
    e.preventDefault();
    const digits = code.replace(/\D/g, '').slice(0, 6);
    if (digits.length !== 6) {
      setMessage('Enter the 6-digit code from your email.');
      setStatus('error');
      return;
    }
    setSubmitting(true);
    await runVerify({ code: digits });
    setSubmitting(false);
  };

  const blue = DS.colors.primary.blue;

  return (
    <Layout>
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="max-w-md w-full">
          <div
            className="rounded-xl p-8 text-center border"
            style={{
              backgroundColor: DS.colors.background.card,
              borderColor: DS.colors.border.subtle,
            }}
          >
            {status === 'idle' && (
              <>
                <h2 className="text-2xl font-bold mb-2" style={{ color: DS.colors.text.primary }}>
                  Enter verification code
                </h2>
                <p className="text-sm mb-6" style={{ color: DS.colors.text.secondary }}>
                  Paste the 6-digit code from your verification email, or open the link in that email
                  instead.
                </p>
                <form onSubmit={submitCode} className="space-y-4">
                  <input
                    type="text"
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    maxLength={6}
                    placeholder="000000"
                    value={code}
                    onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    className="w-full text-center text-2xl tracking-[0.4em] font-mono rounded-lg px-4 py-3 border outline-none"
                    style={{
                      backgroundColor: DS.colors.background.panel,
                      borderColor: DS.colors.border.default,
                      color: DS.colors.text.primary,
                    }}
                  />
                  <button
                    type="submit"
                    disabled={submitting}
                    className="w-full py-2.5 rounded-lg font-medium text-white transition disabled:opacity-50"
                    style={{ backgroundColor: blue }}
                  >
                    {submitting ? 'Verifying…' : 'Verify'}
                  </button>
                </form>
                <p className="text-xs mt-4" style={{ color: DS.colors.text.tertiary }}>
                  Wrong place?{' '}
                  <a href="/login" style={{ color: blue }}>
                    Sign in
                  </a>{' '}
                  and use &quot;Resend email&quot; from the banner if you need a new code.
                </p>
              </>
            )}

            {status === 'loading' && (
              <>
                <div
                  className="w-16 h-16 mx-auto mb-4 border-4 rounded-full animate-spin"
                  style={{ borderColor: `${blue}33`, borderTopColor: blue }}
                />
                <h2 className="text-2xl font-bold mb-2" style={{ color: DS.colors.text.primary }}>
                  Verifying…
                </h2>
                <p style={{ color: DS.colors.text.secondary }}>Please wait.</p>
              </>
            )}

            {status === 'success' && (
              <>
                <div
                  className="w-16 h-16 mx-auto mb-4 rounded-full flex items-center justify-center"
                  style={{ backgroundColor: `${DS.colors.accent.success}22` }}
                >
                  <svg
                    className="w-8 h-8"
                    style={{ color: DS.colors.accent.success }}
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <h2 className="text-2xl font-bold mb-2" style={{ color: DS.colors.accent.success }}>
                  Email verified
                </h2>
                <p style={{ color: DS.colors.text.secondary }}>{message}</p>
                <p className="text-sm mt-4" style={{ color: DS.colors.text.tertiary }}>
                  Redirecting to your dashboard…
                </p>
              </>
            )}

            {status === 'error' && (
              <>
                <div
                  className="w-16 h-16 mx-auto mb-4 rounded-full flex items-center justify-center"
                  style={{ backgroundColor: `${DS.colors.accent.error}22` }}
                >
                  <svg
                    className="w-8 h-8"
                    style={{ color: DS.colors.accent.error }}
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </div>
                <h2 className="text-2xl font-bold mb-2" style={{ color: DS.colors.accent.error }}>
                  Verification failed
                </h2>
                <p className="mb-6" style={{ color: DS.colors.text.secondary }}>
                  {message}
                </p>
                <div className="space-y-3">
                  <button
                    type="button"
                    onClick={() => {
                      setStatus('idle');
                      setMessage('');
                      setCode('');
                    }}
                    className="w-full px-4 py-2 rounded-lg font-medium transition text-white"
                    style={{ backgroundColor: blue }}
                  >
                    Try 6-digit code
                  </button>
                  <button
                    type="button"
                    onClick={() => router.push('/')}
                    className="w-full px-4 py-2 rounded-lg font-medium transition"
                    style={{
                      backgroundColor: DS.colors.background.elevated,
                      color: DS.colors.text.primary,
                    }}
                  >
                    Home
                  </button>
                  <button
                    type="button"
                    onClick={() => router.push('/login')}
                    className="w-full px-4 py-2 rounded-lg font-medium transition"
                    style={{
                      backgroundColor: DS.colors.background.panel,
                      color: DS.colors.text.secondary,
                    }}
                  >
                    Sign in
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </Layout>
  );
}
