'use client';

import { useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

export default function OAuthCallback() {
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    const token = searchParams.get('token');
    const error = searchParams.get('error');
    const oauth = searchParams.get('oauth');
    const redirect = searchParams.get('redirect') || '/dashboard';

    if (error) {
      // Redirect to login with error
      router.push(`/login?error=${encodeURIComponent(error)}`);
      return;
    }

    if (token && oauth === 'success') {
      // Store token in localStorage
      localStorage.setItem('token', token);
      
      // Fetch user data
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080';
      fetch(`${apiUrl}/api/auth/me`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
        credentials: 'include',
      })
        .then(res => res.json())
        .then(data => {
          if (data.user) {
            localStorage.setItem('user', JSON.stringify(data.user));
            
            // Trigger events to update navbar
            window.dispatchEvent(new Event('userChanged'));
            window.dispatchEvent(new Event('storage'));
            
            // Redirect to the specified page or dashboard
            router.push(redirect);
          } else {
            router.push('/login?error=oauth_user_fetch_failed');
          }
        })
        .catch(err => {
          console.error('OAuth callback error:', err);
          router.push('/login?error=oauth_callback_failed');
        });
    } else {
      router.push('/login?error=missing_token');
    }
  }, [router, searchParams]);

  return (
    <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: '#0a0a0a' }}>
      <div className="text-center">
        <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
        <p style={{ color: '#888' }}>Completing sign-in...</p>
      </div>
    </div>
  );
}
