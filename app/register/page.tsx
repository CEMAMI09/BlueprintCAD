'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Button, Card } from '@/components/ui/UIComponents';
import { DesignSystem as DS } from '@/backend/lib/ui/design-system';
import { Github } from 'lucide-react';

export default function Register() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
    confirmPassword: '',
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [oauthLoading, setOauthLoading] = useState<string | null>(null);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    // Validation
    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match');
      setLoading(false);
      return;
    }

    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/auth/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          username: formData.username,
          email: formData.email,
          password: formData.password,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.message || 'Something went wrong');
      }

      // Clear any existing data first
      localStorage.clear();
      
      // Store token
      localStorage.setItem('token', data.token);
      localStorage.setItem('user', JSON.stringify(data.user));

      // Trigger custom event to update navbar
      window.dispatchEvent(new Event('userChanged'));
      window.dispatchEvent(new Event('storage'));

      // Redirect to dashboard with full page reload to clear all state
      window.location.href = '/dashboard';
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleOAuthSignIn = async (provider: 'google' | 'github') => {
    // OAuth will be implemented later with Express backend
    setError(`OAuth sign-in with ${provider} is not yet available. Please use email/password.`);
    setOauthLoading(null);
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
          <div className="text-center mb-8">
          <h2 className="text-3xl font-bold mb-2" style={{ color: DS.colors.text.primary }}>
            Create your account
          </h2>
          <p className="text-base" style={{ color: DS.colors.text.secondary }}>
            Join the community of hardware engineers
          </p>
        </div>

        <Card padding="lg">
          {error && (
            <div 
              className="p-4 rounded-lg mb-6 border"
              style={{
                backgroundColor: `${DS.colors.accent.error}22`,
                borderColor: `${DS.colors.accent.error}44`,
                color: DS.colors.accent.error,
              }}
            >
              {error}
            </div>
          )}

          {/* OAuth Buttons */}
          <div className="space-y-3 mb-6">
            <Button
              variant="secondary"
              fullWidth
              onClick={() => handleOAuthSignIn('google')}
              disabled={oauthLoading !== null}
              icon={
                oauthLoading === 'google' ? (
                  <div className="w-5 h-5 border-2 border-current/20 border-t-current rounded-full animate-spin"></div>
                ) : (
                  <svg className="w-5 h-5" viewBox="0 0 24 24">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                  </svg>
                )
              }
            >
              {oauthLoading === 'google' ? 'Connecting...' : 'Continue with Google'}
            </Button>

            <Button
              variant="secondary"
              fullWidth
              onClick={() => handleOAuthSignIn('github')}
              disabled={oauthLoading !== null}
              icon={
                oauthLoading === 'github' ? (
                  <div className="w-5 h-5 border-2 border-current/20 border-t-current rounded-full animate-spin"></div>
                ) : (
                  <Github size={20} />
                )
              }
            >
              {oauthLoading === 'github' ? 'Connecting...' : 'Continue with GitHub'}
            </Button>
          </div>

          {/* Divider */}
          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full" style={{ borderTop: `1px solid ${DS.colors.border.default}` }}></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-3" style={{ backgroundColor: DS.colors.background.card, color: DS.colors.text.tertiary }}>
                Or create account with email
              </span>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="username" className="block text-sm font-medium mb-2" style={{ color: DS.colors.text.primary }}>
                Username
              </label>
              <input
                id="username"
                name="username"
                type="text"
                required
                value={formData.username}
                onChange={handleChange}
                className="w-full px-4 py-2 rounded-lg border"
                style={{
                  backgroundColor: DS.colors.background.panel,
                  borderColor: DS.colors.border.default,
                  color: DS.colors.text.primary,
                }}
                placeholder="Choose a username"
                autoComplete="username"
              />
            </div>

            <div>
              <label htmlFor="email" className="block text-sm font-medium mb-2" style={{ color: DS.colors.text.primary }}>
                Email address
              </label>
              <input
                id="email"
                name="email"
                type="email"
                required
                value={formData.email}
                onChange={handleChange}
                className="w-full px-4 py-2 rounded-lg border"
                style={{
                  backgroundColor: DS.colors.background.panel,
                  borderColor: DS.colors.border.default,
                  color: DS.colors.text.primary,
                }}
                placeholder="Enter your email"
                autoComplete="email"
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium mb-2" style={{ color: DS.colors.text.primary }}>
                Password
              </label>
              <input
                id="password"
                name="password"
                type="password"
                required
                value={formData.password}
                onChange={handleChange}
                className="w-full px-4 py-2 rounded-lg border"
                style={{
                  backgroundColor: DS.colors.background.panel,
                  borderColor: DS.colors.border.default,
                  color: DS.colors.text.primary,
                }}
                placeholder="Create a password"
                autoComplete="new-password"
              />
            </div>

            <div>
              <label htmlFor="confirmPassword" className="block text-sm font-medium mb-2" style={{ color: DS.colors.text.primary }}>
                Confirm password
              </label>
              <input
                id="confirmPassword"
                name="confirmPassword"
                type="password"
                required
                value={formData.confirmPassword}
                onChange={handleChange}
                className="w-full px-4 py-2 rounded-lg border"
                style={{
                  backgroundColor: DS.colors.background.panel,
                  borderColor: DS.colors.border.default,
                  color: DS.colors.text.primary,
                }}
                placeholder="Confirm your password"
                autoComplete="new-password"
              />
            </div>

            <Button
              type="submit"
              variant="primary"
              fullWidth
              disabled={loading}
            >
              {loading ? 'Creating account...' : 'Create account'}
            </Button>

            <p className="text-center text-sm" style={{ color: DS.colors.text.secondary }}>
              Already have an account?{' '}
              <Link href="/login" style={{ color: DS.colors.primary.blue }} className="hover:underline font-medium">
                Sign in
              </Link>
            </p>
          </form>
        </Card>
        </div>
      </div>
    </div>
  );
}