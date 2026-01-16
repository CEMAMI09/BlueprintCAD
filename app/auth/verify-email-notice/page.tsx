'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button, Card } from '@/components/ui/UIComponents';
import { DesignSystem as DS } from '@/backend/lib/ui/design-system';
import { Mail, CheckCircle } from 'lucide-react';

export default function VerifyEmailNotice() {
  const router = useRouter();
  const [resending, setResending] = useState(false);
  const [resendSuccess, setResendSuccess] = useState(false);
  const [error, setError] = useState('');

  const handleResend = async () => {
    setResending(true);
    setError('');
    setResendSuccess(false);

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
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to resend verification email');
      }

      setResendSuccess(true);
    } catch (err: any) {
      setError(err.message || 'Failed to resend verification email');
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
            <div className="text-center">
              <Mail size={64} className="mx-auto mb-4" style={{ color: DS.colors.primary.blue }} />
              <h2 className="text-2xl font-bold mb-2" style={{ color: DS.colors.text.primary }}>
                Check Your Email
              </h2>
              <p className="mb-6" style={{ color: DS.colors.text.secondary }}>
                We've sent a verification email to your email address. Please click the link in the email to verify your account.
              </p>

              {resendSuccess && (
                <div className="mb-4 p-3 rounded-lg flex items-center gap-2" style={{ backgroundColor: `${DS.colors.success}22`, color: DS.colors.success }}>
                  <CheckCircle size={20} />
                  <span className="text-sm">Verification email sent!</span>
                </div>
              )}

              {error && (
                <div className="mb-4 p-3 rounded-lg" style={{ backgroundColor: `${DS.colors.accent.error}22`, color: DS.colors.accent.error }}>
                  <p className="text-sm">{error}</p>
                </div>
              )}

              <div className="space-y-3">
                <Button
                  variant="secondary"
                  fullWidth
                  onClick={handleResend}
                  disabled={resending}
                  icon={<Mail size={20} />}
                >
                  {resending ? 'Sending...' : 'Resend Verification Email'}
                </Button>
                <Link href="/dashboard">
                  <Button variant="primary" fullWidth>
                    Continue to Dashboard
                  </Button>
                </Link>
              </div>

              <p className="mt-6 text-sm" style={{ color: DS.colors.text.tertiary }}>
                Didn't receive the email? Check your spam folder or try resending.
              </p>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}

