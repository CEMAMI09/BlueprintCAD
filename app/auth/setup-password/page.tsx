'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Button, Card } from '@/components/ui/UIComponents';
import { DesignSystem as DS } from '@/backend/lib/ui/design-system';
import { Eye, EyeOff } from 'lucide-react';

export default function SetupPassword() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [formData, setFormData] = useState({
    password: '',
    confirmPassword: '',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [token, setToken] = useState<string | null>(null);

  useEffect(() => {
    if (!searchParams) return;
    const tokenParam = searchParams.get('token');
    if (!tokenParam) {
      router.push('/login?error=missing_token');
      return;
    }
    setToken(tokenParam);
    // Store token temporarily for the API call
    localStorage.setItem('token', tokenParam);
  }, [searchParams, router]);

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

    if (!token) {
      setError('Missing authentication token');
      return;
    }

    // Validation
    if (formData.password.length < 8) {
      setError('Password must be at least 8 characters long');
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    setLoading(true);

    try {
      // Set password via API
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080';
      const response = await fetch(`${apiUrl}/api/auth/setup-password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        credentials: 'include',
        body: JSON.stringify({
          password: formData.password,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to set password');
      }

      // Fetch updated user data
      const userResponse = await fetch(`${apiUrl}/api/auth/me`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
        credentials: 'include',
      });

      const userData = await userResponse.json();

      if (userData.user) {
        localStorage.setItem('user', JSON.stringify(userData.user));
        
        // Trigger events to update navbar
        window.dispatchEvent(new Event('userChanged'));
        window.dispatchEvent(new Event('storage'));
        
        // Redirect to dashboard
        const redirect = searchParams?.get('redirect') || '/dashboard';
        router.push(redirect);
      } else {
        setError('Failed to fetch user data');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to set password');
    } finally {
      setLoading(false);
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
          <div className="text-center mb-8">
            <h2 className="text-3xl font-bold mb-2" style={{ color: DS.colors.text.primary }}>
              Set up your password
            </h2>
            <p className="text-base" style={{ color: DS.colors.text.secondary }}>
              Create a password so you can sign in with email if OAuth is unavailable
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

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label htmlFor="password" className="block text-sm font-medium mb-2" style={{ color: DS.colors.text.primary }}>
                  Password
                </label>
                <div className="relative">
                  <input
                    id="password"
                    name="password"
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={formData.password}
                    onChange={handleChange}
                    className="w-full px-4 py-2 pr-10 rounded-lg border"
                    style={{
                      backgroundColor: DS.colors.background.panel,
                      borderColor: DS.colors.border.default,
                      color: DS.colors.text.primary,
                    }}
                    placeholder="Create a password (min 8 characters)"
                    autoComplete="new-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2"
                    style={{ color: DS.colors.text.secondary }}
                  >
                    {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                  </button>
                </div>
              </div>

              <div>
                <label htmlFor="confirmPassword" className="block text-sm font-medium mb-2" style={{ color: DS.colors.text.primary }}>
                  Confirm password
                </label>
                <div className="relative">
                  <input
                    id="confirmPassword"
                    name="confirmPassword"
                    type={showConfirmPassword ? 'text' : 'password'}
                    required
                    value={formData.confirmPassword}
                    onChange={handleChange}
                    className="w-full px-4 py-2 pr-10 rounded-lg border"
                    style={{
                      backgroundColor: DS.colors.background.panel,
                      borderColor: DS.colors.border.default,
                      color: DS.colors.text.primary,
                    }}
                    placeholder="Confirm your password"
                    autoComplete="new-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2"
                    style={{ color: DS.colors.text.secondary }}
                  >
                    {showConfirmPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                  </button>
                </div>
              </div>

              <Button
                type="submit"
                variant="primary"
                fullWidth
                disabled={loading || !token}
              >
                {loading ? 'Setting up password...' : 'Continue'}
              </Button>

              <Button
                type="button"
                variant="secondary"
                fullWidth
                onClick={async () => {
                  if (!token) return;
                  try {
                    // Fetch user data
                    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080';
                    const userResponse = await fetch(`${apiUrl}/api/auth/me`, {
                      headers: {
                        'Authorization': `Bearer ${token}`,
                      },
                      credentials: 'include',
                    });

                    const userData = await userResponse.json();

                    if (userData.user) {
                      localStorage.setItem('user', JSON.stringify(userData.user));
                      
                      // Trigger events to update navbar
                      window.dispatchEvent(new Event('userChanged'));
                      window.dispatchEvent(new Event('storage'));
                      
                      // Redirect to dashboard
                      const redirect = searchParams?.get('redirect') || '/dashboard';
                      router.push(redirect);
                    }
                  } catch (err: any) {
                    setError(err.message || 'Failed to skip password setup');
                  }
                }}
                disabled={loading || !token}
              >
                Skip for now
              </Button>

              <p className="text-center text-sm" style={{ color: DS.colors.text.secondary }}>
                You can skip this step, but you'll only be able to sign in with OAuth
              </p>
            </form>
          </Card>
        </div>
      </div>
    </div>
  );
}

