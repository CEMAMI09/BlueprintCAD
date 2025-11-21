'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Layout from '@/components/Layout';

export default function VerifyEmail() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('');

  useEffect(() => {
    const token = searchParams?.get('token');
    
    if (!token) {
      setStatus('error');
      setMessage('Invalid verification link. No token provided.');
      return;
    }

    verifyEmail(token);
  }, [searchParams]);

  const verifyEmail = async (token: string) => {
    try {
      const res = await fetch('/api/auth/verify-email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ token }),
      });

      const data = await res.json();

      if (res.ok) {
        setStatus('success');
        setMessage(data.message);

        // Update localStorage if user is logged in
        const storedUser = localStorage.getItem('user');
        if (storedUser) {
          const user = JSON.parse(storedUser);
          user.email_verified = true;
          localStorage.setItem('user', JSON.stringify(user));
          window.dispatchEvent(new Event('userChanged'));
        }

        // Redirect to home after 3 seconds
        setTimeout(() => {
          router.push('/');
        }, 3000);
      } else {
        setStatus('error');
        setMessage(data.error || 'Verification failed');
      }
    } catch (error) {
      setStatus('error');
      setMessage('An error occurred during verification');
    }
  };

  return (
    <Layout>
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="max-w-md w-full">
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-8 text-center">
            {status === 'loading' && (
              <>
                <div className="w-16 h-16 mx-auto mb-4 border-4 border-blue-500/20 border-t-blue-500 rounded-full animate-spin"></div>
                <h2 className="text-2xl font-bold mb-2">Verifying Email...</h2>
                <p className="text-gray-400">Please wait while we verify your email address</p>
              </>
            )}

            {status === 'success' && (
              <>
                <div className="w-16 h-16 mx-auto mb-4 bg-green-500/10 rounded-full flex items-center justify-center">
                  <svg className="w-8 h-8 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <h2 className="text-2xl font-bold mb-2 text-green-500">Email Verified!</h2>
                <p className="text-gray-400 mb-4">{message}</p>
                <div className="p-4 bg-green-500/10 border border-green-500/20 rounded-lg">
                  <p className="text-sm text-green-400">
                    🎉 You can now upload projects, list items for sale, and send team invitations!
                  </p>
                </div>
                <p className="text-sm text-gray-500 mt-4">Redirecting you to the home page...</p>
              </>
            )}

            {status === 'error' && (
              <>
                <div className="w-16 h-16 mx-auto mb-4 bg-red-500/10 rounded-full flex items-center justify-center">
                  <svg className="w-8 h-8 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </div>
                <h2 className="text-2xl font-bold mb-2 text-red-500">Verification Failed</h2>
                <p className="text-gray-400 mb-6">{message}</p>
                
                <div className="space-y-3">
                  <button
                    onClick={() => router.push('/')}
                    className="w-full px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg font-medium transition"
                  >
                    Go to Home
                  </button>
                  <button
                    onClick={() => router.push('/login')}
                    className="w-full px-4 py-2 bg-gray-800 hover:bg-gray-700 rounded-lg font-medium transition"
                  >
                    Sign In
                  </button>
                </div>

                <div className="mt-6 p-4 bg-blue-500/10 border border-blue-500/20 rounded-lg text-left">
                  <p className="text-sm text-blue-400 mb-2">
                    <strong>Common issues:</strong>
                  </p>
                  <ul className="text-sm text-gray-400 space-y-1 list-disc list-inside">
                    <li>Link expired (valid for 24 hours)</li>
                    <li>Link already used</li>
                    <li>Email already verified</li>
                  </ul>
                  <p className="text-sm text-gray-400 mt-3">
                    Sign in and request a new verification email if needed.
                  </p>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </Layout>
  );
}
