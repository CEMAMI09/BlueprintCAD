'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Button, Card } from '@/components/ui/UIComponents';
import { DesignSystem as DS } from '@/backend/lib/ui/design-system';
import { CheckCircle, XCircle, Mail } from 'lucide-react';

export default function VerifyEmail() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [error, setError] = useState('');
  const [resending, setResending] = useState(false);

  useEffect(() => {
    if (!searchParams) return;
    
    const success = searchParams.get('success');
    if (success === 'true') {
      setStatus('success');
    } else if (searchParams.get('error')) {
      setStatus('error');
      setError(searchParams.get('error') || 'Verification failed');
    } else {
      setStatus('error');
      setError('Invalid verification link');
    }
  }, [searchParams]);

  const handleResend = async () => {
    setResending(true);
    setError('');

    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080';
      const token = localStorage.getItem('token');

      if (!token) {
        setError('Please log in to resend verification email');
        setResending(false);
        return;
      }

      const response = await fetch(`${apiUrl}/api/auth/resend-verification`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        signal: AbortSignal.timeout(45_000),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to resend verification email');
      }

      alert('Verification email sent! Please check your inbox.');
    } catch (err: unknown) {
      if (err instanceof Error && err.name === 'AbortError') {
        setError('Request timed out. Try again in a moment.');
      } else {
        setError(err instanceof Error ? err.message : 'Failed to resend verification email');
      }
    } finally {
      setResending(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col px-4 py-12" style={{ backgroundColor: DS.colors.background.app }}>
      {/* Logo at top */}
      <div className="w-full flex justify-center mb-8" style={{ paddingTop: '5px' }}>
        <Link href="/" className="inline-flex items-center justify-center">
          <img
            src="/bpcube2.png"
            alt="Blueprint Logo"
            className="logo-image-large"
          />
        </Link>
      </div>

      <div className="flex-1 flex items-center justify-center">
        <div className="w-full max-w-md">
          <Card padding="lg">
            {status === 'loading' && (
              <div className="text-center">
                <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                <h2 className="text-2xl font-bold mb-2" style={{ color: DS.colors.text.primary }}>
                  Verifying your email...
                </h2>
                <p style={{ color: DS.colors.text.secondary }}>
                  Please wait while we verify your email address.
                </p>
              </div>
            )}

            {status === 'success' && (
              <div className="text-center">
                <CheckCircle size={64} className="mx-auto mb-4" style={{ color: DS.colors.accent.success }} />
                <h2 className="text-2xl font-bold mb-2" style={{ color: DS.colors.text.primary }}>
                  Email Verified!
                </h2>
                <p className="mb-6" style={{ color: DS.colors.text.secondary }}>
                  Your email address has been successfully verified. You can now access all features of Blueprint.
                </p>
                <Link href="/dashboard">
                  <Button variant="primary" fullWidth>
                    Go to Dashboard
                  </Button>
                </Link>
              </div>
            )}

            {status === 'error' && (
              <div className="text-center">
                <XCircle size={64} className="mx-auto mb-4" style={{ color: DS.colors.accent.error }} />
                <h2 className="text-2xl font-bold mb-2" style={{ color: DS.colors.text.primary }}>
                  Verification Failed
                </h2>
                {error && (
                  <p className="mb-4" style={{ color: DS.colors.accent.error }}>
                    {error}
                  </p>
                )}
                <p className="mb-6" style={{ color: DS.colors.text.secondary }}>
                  The verification link may have expired or is invalid.
                </p>
                <div className="space-y-3">
                  <Button
                    variant="primary"
                    fullWidth
                    onClick={handleResend}
                    disabled={resending}
                    icon={<Mail size={20} />}
                  >
                    {resending ? 'Sending...' : 'Resend Verification Email'}
                  </Button>
                  <Link href="/login">
                    <Button variant="secondary" fullWidth>
                      Back to Login
                    </Button>
                  </Link>
                </div>
              </div>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}

