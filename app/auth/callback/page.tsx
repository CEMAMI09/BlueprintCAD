'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useSession } from 'next-auth/react';
import Layout from '@/components/Layout';

export default function OAuthCallback() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { data: session, status } = useSession();
  const [error, setError] = useState('');

  useEffect(() => {
    const handleCallback = async () => {
      // Check for OAuth errors
      const errorParam = searchParams?.get('error');
      if (errorParam) {
        setError('Authentication failed. Please try again.');
        setTimeout(() => router.push('/login'), 3000);
        return;
      }

      if (status === 'loading') {
        return;
      }

      if (status === 'authenticated' && session?.user) {
        try {
          // Session is authenticated via NextAuth
          // Now sync with our existing auth system
          const user = {
            id: session.user.id,
            username: session.user.username,
            email: session.user.email,
            profile_picture: session.user.image,
          };

          // Store in localStorage for compatibility with existing system
          localStorage.clear();
          localStorage.setItem('token', session.forgeToken || '');
          localStorage.setItem('user', JSON.stringify(user));

          // Trigger update events
          window.dispatchEvent(new Event('userChanged'));
          window.dispatchEvent(new Event('storage'));

          // Redirect to home
          setTimeout(() => {
            window.location.href = '/';
          }, 1000);
        } catch (err) {
          console.error('Callback error:', err);
          setError('Failed to complete sign in. Please try again.');
          setTimeout(() => router.push('/login'), 3000);
        }
      } else if (status === 'unauthenticated') {
        setError('Authentication failed. Please try again.');
        setTimeout(() => router.push('/login'), 3000);
      }
    };

    handleCallback();
  }, [session, status, router, searchParams]);

  return (
    <Layout>
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="max-w-md w-full text-center">
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-8">
            {error ? (
              <>
                <div className="w-16 h-16 mx-auto mb-4 bg-red-500/10 rounded-full flex items-center justify-center">
                  <svg className="w-8 h-8 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </div>
                <h2 className="text-2xl font-bold mb-2">Authentication Failed</h2>
                <p className="text-gray-400 mb-4">{error}</p>
                <p className="text-sm text-gray-500">Redirecting to login...</p>
              </>
            ) : (
              <>
                <div className="w-16 h-16 mx-auto mb-4 border-4 border-blue-500/20 border-t-blue-500 rounded-full animate-spin"></div>
                <h2 className="text-2xl font-bold mb-2">Completing sign in...</h2>
                <p className="text-gray-400">Please wait while we set up your account</p>
              </>
            )}
          </div>
        </div>
      </div>
    </Layout>
  );
}
